import pg from "pg";
import fs from "fs";
import path from "path";
import { DATABASE_SCHEMA_SQL } from "../../src/data/schema.js";

const { Pool } = pg;

const DATA_DIR = path.join(process.cwd(), "data_db");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let pool: pg.Pool | null = null;
let isPgConnected = false;

export async function initDatabase() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  try {
    pool = new Pool(
      connectionString
        ? { connectionString }
        : {
            host: process.env.PGHOST || "localhost",
            port: Number(process.env.PGPORT) || 5432,
            user: process.env.PGUSER || "postgres",
            password: process.env.PGPASSWORD || "postgres",
            database: process.env.PGDATABASE || "postgres",
            connectionTimeoutMillis: 2000
          }
    );

    const client = await pool.connect();
    await client.query(DATABASE_SCHEMA_SQL);
    client.release();
    isPgConnected = true;
    console.log("[DB] PostgreSQL database initialized & schema verified.");
  } catch (err: any) {
    console.warn("[DB] PostgreSQL connection bypass (using file-backed persistent storage):", err.message);
    isPgConnected = false;
  }
}

export function getPgPool(): pg.Pool | null {
  return isPgConnected ? pool : null;
}

export function readJSONFile<T>(filename: string, fallback: T): T {
  const filepath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, "utf-8");
      return JSON.parse(content) as T;
    }
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
  }
  return fallback;
}

export function writeJSONFile<T>(filename: string, data: T): void {
  const filepath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error(`Error writing ${filename}:`, e);
  }
}
