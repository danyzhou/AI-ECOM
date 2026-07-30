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

-- Initial System Admin User (Password: admin123 hashed via PBKDF2 with salt)
INSERT INTO users (id, username, password_hash, salt, name, email, role, avatar)
VALUES (
    'usr-admin-01',
    'admin',
    '33559f972b2dd061732e41c4912fa91f247ca8fa4cb048a97fec2d5e3215286207198a2e7efbc83ea748398b1a37cce0ef148962fa9cfa57eece237efb04533a',
    '3481fa79df4ee6bbd402e1c312781498',
    'System Director (Admin)',
    'admin@ecom-ai.com',
    'admin',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
)
ON CONFLICT (username) DO NOTHING;

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
