import { WooCommerceStore, ProductPublication } from "../../src/types";
import { testConnection, uploadMedia, createProduct, WooCommerceConfig } from "../woocommerce/publisherService";
import { getPgPool, readJSONFile, writeJSONFile } from "../db/databaseService";

const STORES_FILE = "stores.json";
const PUBLICATIONS_FILE = "publications.json";

// Stores memory cache
let cachedStores: WooCommerceStore[] = readJSONFile<WooCommerceStore[]>(STORES_FILE, []);
let cachedPublications: ProductPublication[] = readJSONFile<ProductPublication[]>(PUBLICATIONS_FILE, []);

// Seed default store if none exists
if (cachedStores.length === 0) {
  const defaultStore: WooCommerceStore = {
    id: "store_default_wc",
    store_id: "store_default_wc",
    name: "WordPress WooCommerce 主站",
    store_name: "WordPress WooCommerce 主站",
    type: "wordpress_woocommerce",
    platform: "WordPress WooCommerce",
    url: "https://mx-fashion-trend.com",
    wordpress_url: "https://mx-fashion-trend.com",
    consumer_key: "ck_7d92837f6a5b4c3e2109817234567890abcdef12",
    consumer_secret: "cs_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    status: "connected",
    api_status: "connected",
    created_time: new Date().toISOString(),
    updated_time: new Date().toISOString()
  };
  cachedStores.push(defaultStore);
  writeJSONFile(STORES_FILE, cachedStores);
}

// Initial write to ensure file exists
writeJSONFile(STORES_FILE, cachedStores);
writeJSONFile(PUBLICATIONS_FILE, cachedPublications);

export function maskKey(key: string, prefix = "ck_"): string {
  if (!key) return "";
  if (key.length <= 12) return key.substring(0, 4) + "****" + key.substring(key.length - 3);
  const start = key.substring(0, 8);
  const end = key.substring(key.length - 4);
  return `${start}....${end}`;
}

// Sync memory cache with PostgreSQL if DB is connected
async function syncStoresFromDb() {
  const pool = getPgPool();
  if (!pool) return;
  try {
    const res = await pool.query("SELECT * FROM stores ORDER BY created_time DESC");
    if (res.rows.length > 0) {
      cachedStores = res.rows.map(row => ({
        id: row.id,
        store_id: row.id,
        name: row.name,
        store_name: row.name,
        type: row.type || "wordpress_woocommerce",
        platform: "WordPress WooCommerce",
        url: row.url,
        wordpress_url: row.url,
        consumer_key: row.consumer_key,
        consumer_secret: row.consumer_secret,
        status: row.status,
        api_status: row.status,
        created_time: row.created_time ? new Date(row.created_time).toISOString() : new Date().toISOString(),
        updated_time: row.updated_time ? new Date(row.updated_time).toISOString() : new Date().toISOString()
      }));
      writeJSONFile(STORES_FILE, cachedStores);
    }
  } catch (err) {
    console.warn("[DB] Error querying stores table:", err);
  }
}

async function syncPublicationsFromDb() {
  const pool = getPgPool();
  if (!pool) return;
  try {
    const res = await pool.query("SELECT * FROM product_publications ORDER BY created_time DESC");
    if (res.rows.length > 0) {
      cachedPublications = res.rows.map(row => ({
        id: row.id,
        product_id: row.product_id,
        product_title: row.product_title || "WooCommerce Item",
        store_id: row.store_id,
        store_name: row.store_name || "WordPress Store",
        store_url: row.store_url || "",
        wordpress_id: row.wordpress_id,
        status: row.status,
        url: row.url,
        error_log: row.error_log,
        created_time: row.created_time ? new Date(row.created_time).toISOString() : new Date().toISOString(),
        publish_time: row.publish_time ? new Date(row.publish_time).toISOString() : undefined
      }));
      writeJSONFile(PUBLICATIONS_FILE, cachedPublications);
    }
  } catch (err) {
    console.warn("[DB] Error querying product_publications table:", err);
  }
}

syncStoresFromDb();
syncPublicationsFromDb();

function persistStores() {
  writeJSONFile(STORES_FILE, cachedStores);
  const pool = getPgPool();
  if (pool) {
    (async () => {
      try {
        for (const s of cachedStores) {
          await pool.query(
            `INSERT INTO stores (id, name, type, url, consumer_key, consumer_secret, status, created_time, updated_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             url = EXCLUDED.url,
             consumer_key = EXCLUDED.consumer_key,
             consumer_secret = EXCLUDED.consumer_secret,
             status = EXCLUDED.status,
             updated_time = EXCLUDED.updated_time`,
            [s.id, s.name, s.type, s.url, s.consumer_key, s.consumer_secret, s.status, s.created_time, s.updated_time]
          );
        }
      } catch (e) {
        console.warn("[DB] Postgres store persist error:", e);
      }
    })();
  }
}

function persistPublications() {
  writeJSONFile(PUBLICATIONS_FILE, cachedPublications);
  const pool = getPgPool();
  if (pool) {
    (async () => {
      try {
        for (const p of cachedPublications) {
          await pool.query(
            `INSERT INTO product_publications (id, product_id, store_id, wordpress_id, status, url, error_log, created_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             wordpress_id = EXCLUDED.wordpress_id,
             url = EXCLUDED.url,
             error_log = EXCLUDED.error_log`,
            [p.id, p.product_id, p.store_id, p.wordpress_id || null, p.status, p.url || null, p.error_log || null, p.created_time]
          );
        }
      } catch (e) {
        console.warn("[DB] Postgres publication persist error:", e);
      }
    })();
  }
}

export function getStores(): WooCommerceStore[] {
  return cachedStores.map(s => ({
    ...s,
    consumer_key: maskKey(s.consumer_key, "ck_"),
    consumer_secret: maskKey(s.consumer_secret, "cs_")
  }));
}

export function getRawStoreById(id: string): WooCommerceStore | undefined {
  return cachedStores.find(s => s.id === id || s.store_id === id);
}

export function addStore(storeData: {
  name: string;
  url: string;
  consumer_key: string;
  consumer_secret: string;
}): WooCommerceStore {
  const newId = `store_wp_${Date.now()}`;
  const newStore: WooCommerceStore = {
    id: newId,
    store_id: newId,
    name: storeData.name,
    store_name: storeData.name,
    type: "wordpress_woocommerce",
    platform: "WordPress WooCommerce",
    url: storeData.url.trim().replace(/\/$/, ""),
    wordpress_url: storeData.url.trim().replace(/\/$/, ""),
    consumer_key: storeData.consumer_key.trim(),
    consumer_secret: storeData.consumer_secret.trim(),
    status: "disconnected",
    api_status: "disconnected",
    created_time: new Date().toISOString(),
    updated_time: new Date().toISOString()
  };

  cachedStores.unshift(newStore);
  persistStores();

  return {
    ...newStore,
    consumer_key: maskKey(newStore.consumer_key),
    consumer_secret: maskKey(newStore.consumer_secret)
  };
}

export function updateStore(id: string, storeData: Partial<WooCommerceStore>): WooCommerceStore {
  const idx = cachedStores.findIndex(s => s.id === id || s.store_id === id);
  if (idx === -1) {
    throw new Error(`找不到 ID 为 ${id} 的 WordPress 店铺`);
  }

  const existing = cachedStores[idx];
  const updatedKey = (storeData.consumer_key && !storeData.consumer_key.includes("...."))
    ? storeData.consumer_key
    : existing.consumer_key;

  const updatedSecret = (storeData.consumer_secret && !storeData.consumer_secret.includes("...."))
    ? storeData.consumer_secret
    : existing.consumer_secret;

  cachedStores[idx] = {
    ...existing,
    name: storeData.name || existing.name,
    store_name: storeData.name || existing.store_name,
    url: storeData.url ? storeData.url.trim().replace(/\/$/, "") : existing.url,
    wordpress_url: storeData.url ? storeData.url.trim().replace(/\/$/, "") : existing.wordpress_url,
    consumer_key: updatedKey,
    consumer_secret: updatedSecret,
    status: storeData.status || existing.status,
    api_status: storeData.status || existing.status,
    updated_time: new Date().toISOString(),
    lastTestedAt: storeData.lastTestedAt || existing.lastTestedAt
  };

  persistStores();

  return {
    ...cachedStores[idx],
    consumer_key: maskKey(cachedStores[idx].consumer_key),
    consumer_secret: maskKey(cachedStores[idx].consumer_secret)
  };
}

export function deleteStore(id: string): boolean {
  const initialLen = cachedStores.length;
  cachedStores = cachedStores.filter(s => s.id !== id && s.store_id !== id);
  if (cachedStores.length < initialLen) {
    persistStores();
    const pool = getPgPool();
    if (pool) {
      pool.query("DELETE FROM stores WHERE id = $1", [id]).catch(err => {
        console.warn("[DB] Error deleting store from PostgreSQL:", err);
      });
    }
    return true;
  }
  return false;
}

export async function testStoreConnectionById(id: string) {
  const store = getRawStoreById(id);
  if (!store) {
    throw new Error(`找不到店铺 ID: ${id}`);
  }

  const wcConfig: WooCommerceConfig = {
    siteUrl: store.url,
    consumerKey: store.consumer_key,
    consumerSecret: store.consumer_secret,
    storeName: store.name
  };

  try {
    const res = await testConnection(wcConfig);
    updateStore(id, {
      status: "connected",
      api_status: "connected",
      lastTestedAt: new Date().toISOString()
    });
    return { success: true, ...res };
  } catch (err: any) {
    updateStore(id, {
      status: "error",
      api_status: "error",
      lastTestedAt: new Date().toISOString()
    });
    return { success: false, error: err.message };
  }
}

export function getAllPublications(): ProductPublication[] {
  return cachedPublications;
}

export function getPublicationsByProduct(productId: string): ProductPublication[] {
  return cachedPublications.filter(p => p.product_id === productId);
}

export function recordPublicationLog(data: {
  productId: string;
  productTitle: string;
  storeId: string;
  storeName: string;
  storeUrl: string;
  status?: 'pending' | 'publishing' | 'success' | 'failed';
}): ProductPublication {
  const pubId = `pub_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const newPub: ProductPublication = {
    id: pubId,
    product_id: data.productId,
    product_title: data.productTitle || "WooCommerce 商品",
    store_id: data.storeId,
    store_name: data.storeName,
    store_url: data.storeUrl,
    status: data.status || "publishing",
    created_time: new Date().toISOString()
  };

  cachedPublications.unshift(newPub);
  persistPublications();
  return newPub;
}

export function updatePublicationLogStatus(
  pubId: string,
  updates: {
    status: 'pending' | 'publishing' | 'success' | 'failed';
    wordpress_id?: number;
    url?: string;
    error_log?: string;
  }
): ProductPublication | undefined {
  const pub = cachedPublications.find(p => p.id === pubId);
  if (!pub) return undefined;

  pub.status = updates.status;
  if (updates.wordpress_id !== undefined) pub.wordpress_id = updates.wordpress_id;
  if (updates.url !== undefined) pub.url = updates.url;
  if (updates.error_log !== undefined) pub.error_log = updates.error_log;
  pub.publish_time = new Date().toISOString();

  persistPublications();
  return pub;
}

export async function createMultiStorePublicationTasks(
  productId: string,
  storeIds: string[],
  productData: any
) {
  const results: ProductPublication[] = [];

  for (const storeId of storeIds) {
    const store = getRawStoreById(storeId);
    if (!store) continue;

    const pubId = `pub_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newPub: ProductPublication = {
      id: pubId,
      product_id: productId,
      product_title: productData?.title || productData?.ai_title || "New WooCommerce Product",
      store_id: store.id,
      store_name: store.name,
      store_url: store.url,
      status: "publishing",
      created_time: new Date().toISOString()
    };

    cachedPublications.unshift(newPub);
    persistPublications();

    try {
      const wcConfig: WooCommerceConfig = {
        siteUrl: store.url,
        consumerKey: store.consumer_key,
        consumerSecret: store.consumer_secret,
        storeName: store.name
      };

      const imgUrl = productData.optimizedMainImage || productData.mainImage;
      const wcResult = await createProduct(
        wcConfig,
        {
          ...productData,
          mainImage: imgUrl,
          images: imgUrl ? [{ src: imgUrl }] : (productData.images || [])
        },
        "publish"
      );

      newPub.status = "success";
      newPub.wordpress_id = wcResult.id;
      newPub.url = wcResult.permalink || `${store.url}/?p=${wcResult.id}`;
      newPub.publish_time = new Date().toISOString();

      results.push({ ...newPub });
    } catch (err: any) {
      newPub.status = "failed";
      newPub.error_log = err.message || "Failed to publish to WooCommerce store";
      newPub.publish_time = new Date().toISOString();

      results.push({ ...newPub });
    }

    persistPublications();
  }

  return results;
}
