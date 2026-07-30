import { SKUConfig } from "../../src/types";
import { getPgPool, readJSONFile, writeJSONFile } from "../db/databaseService";

const SKU_FILE = "sku.json";

const DEFAULT_SKU_CONFIG: SKUConfig = {
  prefix: "PERF",
  codeLength: 6,
  autoGenerate: true,
  currentSequence: 10001
};

let cachedSkuConfig: SKUConfig = readJSONFile<SKUConfig>(SKU_FILE, DEFAULT_SKU_CONFIG);
writeJSONFile(SKU_FILE, cachedSkuConfig);

// Promise queue for thread-safe concurrent SKU generation (Mutex lock)
let skuLockChain = Promise.resolve();

async function syncSkuConfigFromDb() {
  const pool = getPgPool();
  if (!pool) return;
  try {
    const res = await pool.query("SELECT * FROM sku_settings WHERE id = $1", ["default"]);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      cachedSkuConfig = {
        prefix: row.prefix || "PERF",
        codeLength: row.code_length || 6,
        autoGenerate: row.auto_generate ?? true,
        currentSequence: row.current_sequence || 10001
      };
      writeJSONFile(SKU_FILE, cachedSkuConfig);
    } else {
      await pool.query(
        `INSERT INTO sku_settings (id, prefix, code_length, auto_generate, current_sequence)
         VALUES ($1, $2, $3, $4, $5)`,
        ["default", cachedSkuConfig.prefix, cachedSkuConfig.codeLength, cachedSkuConfig.autoGenerate, cachedSkuConfig.currentSequence]
      );
    }
  } catch (err) {
    console.warn("[DB] SKU config sync error:", err);
  }
}

syncSkuConfigFromDb();

function persistSkuConfig() {
  writeJSONFile(SKU_FILE, cachedSkuConfig);
  const pool = getPgPool();
  if (pool) {
    pool.query(
      `INSERT INTO sku_settings (id, prefix, code_length, auto_generate, current_sequence)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
       prefix = EXCLUDED.prefix,
       code_length = EXCLUDED.code_length,
       auto_generate = EXCLUDED.auto_generate,
       current_sequence = EXCLUDED.current_sequence`,
      ["default", cachedSkuConfig.prefix, cachedSkuConfig.codeLength, cachedSkuConfig.autoGenerate, cachedSkuConfig.currentSequence]
    ).catch(err => {
      console.warn("[DB] Error persisting SKU settings to Postgres:", err);
    });
  }
}

export function getSKUConfig(): SKUConfig {
  return cachedSkuConfig;
}

export function updateSKUConfig(newConfig: Partial<SKUConfig>): SKUConfig {
  cachedSkuConfig = {
    ...cachedSkuConfig,
    ...newConfig
  };
  persistSkuConfig();
  return cachedSkuConfig;
}

/**
 * Thread-safe & Transaction-locked SKU Generator
 * Guarantees SKU uniqueness across concurrent requests without changing existing SKU rules.
 */
export async function generateNextSKU(customPrefix?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    skuLockChain = skuLockChain.then(async () => {
      try {
        const pool = getPgPool();
        let seq = cachedSkuConfig.currentSequence;
        let prefix = customPrefix || cachedSkuConfig.prefix || "PERF";
        let codeLength = cachedSkuConfig.codeLength || 6;

        if (pool) {
          try {
            // Atomic PostgreSQL transaction sequence increment
            const client = await pool.connect();
            try {
              await client.query("BEGIN");
              const res = await client.query(
                `UPDATE sku_settings 
                 SET current_sequence = current_sequence + 1 
                 WHERE id = 'default' 
                 RETURNING current_sequence, prefix, code_length`
              );
              await client.query("COMMIT");

              if (res.rows.length > 0) {
                seq = res.rows[0].current_sequence;
                prefix = customPrefix || res.rows[0].prefix || prefix;
                codeLength = res.rows[0].code_length || codeLength;
                cachedSkuConfig.currentSequence = seq + 1;
              }
            } catch (txErr) {
              await client.query("ROLLBACK");
              throw txErr;
            } finally {
              client.release();
            }
          } catch (dbErr) {
            console.warn("[DB] Transaction lock fallback to atomic memory sequence:", dbErr);
            seq = cachedSkuConfig.currentSequence;
            cachedSkuConfig.currentSequence += 1;
          }
        } else {
          seq = cachedSkuConfig.currentSequence;
          cachedSkuConfig.currentSequence += 1;
        }

        persistSkuConfig();

        const numStr = String(seq).padStart(codeLength, "0");
        const generatedSku = `${prefix}-${numStr}`;
        resolve(generatedSku);
      } catch (err) {
        reject(err);
      }
    });
  });
}
