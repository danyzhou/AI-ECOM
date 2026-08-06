-- ===================================================
-- AI Ecommerce Operation Center - Database Seed
-- ===================================================

-- Initial SKU Settings
INSERT INTO sku_settings (id, prefix, code_length, auto_generate, current_sequence)
VALUES ('sku-default-01', 'PERF', 6, TRUE, 10001)
ON CONFLICT (id) DO NOTHING;

-- Initial SKU Lock
INSERT INTO sku_locks (lock_name, last_val)
VALUES ('sku_sequence', 10001)
ON CONFLICT (lock_name) DO NOTHING;

-- Note: Admin user credentials are dynamically initialized & encrypted from environment variables
-- (ADMIN_USER, ADMIN_PASSWORD) via seedAdminUser() during application startup / seed script.

-- Initial WooCommerce Demo Store
INSERT INTO stores (id, name, type, url, consumer_key, consumer_secret, status)
VALUES (
    'store-wc-demo',
    'WordPress WooCommerce Flagship Store',
    'wordpress_woocommerce',
    'https://demo-store.woocommerce.com',
    'ck_7d92837f6a5b4c3e2109817234567890abcdef12',
    'cs_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    'connected'
)
ON CONFLICT (id) DO NOTHING;
