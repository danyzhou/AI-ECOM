export const DATABASE_SCHEMA_SQL = `
-- ===================================================
-- AI ECOM PRODUCT ASSISTANT - DATABASE SCHEMA (SQLITE / POSTGRESQL)
-- ===================================================

-- 1. Users Table (用户表)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'operations', -- 'admin', 'operations', 'editor'
    avatar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table (商品表)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    sku VARCHAR(100) UNIQUE NOT NULL,
    image_ratio VARCHAR(20) DEFAULT '1:1', -- '1:1', '4:3', '16:9', '3:4'
    categories TEXT, -- JSON Array
    tags TEXT, -- JSON Array
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending_review', 'ready', 'published', 'failed'
    
    main_image TEXT NOT NULL,
    optimized_main_image TEXT,
    white_bg_image TEXT,
    gallery_images TEXT, -- JSON Array
    
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    promo_price DECIMAL(10, 2) DEFAULT 0.00,
    cost_price DECIMAL(10, 2) DEFAULT 0.00,
    estimated_margin DECIMAL(5, 2) DEFAULT 0.00,
    
    stock INT DEFAULT 0,
    weight DECIMAL(8, 2) DEFAULT 0.00,
    dimensions TEXT, -- JSON Object {length, width, height, unit}
    
    selling_points TEXT, -- JSON Array
    short_description TEXT,
    long_description TEXT, -- HTML / Markdown
    parameters TEXT, -- JSON Array
    usage_instructions TEXT,
    cautions TEXT,
    
    seo_title VARCHAR(255),
    seo_keywords TEXT, -- JSON Array
    seo_description TEXT,
    url_slug VARCHAR(255),
    
    source_type VARCHAR(20), -- 'upload', 'url', 'crawler'
    source_url TEXT,
    wc_product_id INT,
    wc_permalink TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Product Images Table (图片表)
CREATE TABLE IF NOT EXISTS product_images (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) REFERENCES products(id) ON DELETE CASCADE,
    image_type VARCHAR(20) NOT NULL, -- 'main', 'gallery', 'white_bg', 'detail'
    original_url TEXT NOT NULL,
    processed_url TEXT,
    watermark_removed BOOLEAN DEFAULT FALSE,
    bg_removed BOOLEAN DEFAULT FALSE,
    resolution VARCHAR(20) DEFAULT '1000x1000',
    file_size_kb INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. AI Tasks Table (AI任务表)
CREATE TABLE IF NOT EXISTS ai_tasks (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) REFERENCES products(id) ON DELETE SET NULL,
    task_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(30) NOT NULL, -- 'image_clean', 'content_gen', 'seo_opt', 'pricing', 'wc_publish'
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'processing', 'review', 'completed', 'failed'
    progress INT DEFAULT 0,
    message TEXT,
    logs TEXT, -- JSON Array of log strings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 5. WordPress / WooCommerce Stores Table (WordPress 多店铺表)
CREATE TABLE IF NOT EXISTS stores (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'wordpress_woocommerce',
    url TEXT NOT NULL,
    consumer_key TEXT NOT NULL, -- Encrypted key
    consumer_secret TEXT NOT NULL, -- Encrypted secret
    status VARCHAR(20) DEFAULT 'connected', -- 'connected', 'disconnected', 'testing', 'error'
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Product Publications Table (多店铺商品发布记录表)
CREATE TABLE IF NOT EXISTS product_publications (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) REFERENCES products(id) ON DELETE CASCADE,
    store_id VARCHAR(36) REFERENCES stores(id) ON DELETE CASCADE,
    wordpress_id INT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'publishing', 'success', 'failed'
    url TEXT,
    error_log TEXT,
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. API & System Settings Table (API 设置表)
CREATE TABLE IF NOT EXISTS api_settings (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(50) NOT NULL, -- 'openai', 'gemini'
    api_key TEXT NOT NULL, -- Encrypted / Salted Key
    model VARCHAR(100) NOT NULL,
    purpose VARCHAR(100),
    status VARCHAR(20) DEFAULT 'connected',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. SKU Settings Table (SKU 规则表)
CREATE TABLE IF NOT EXISTS sku_settings (
    id VARCHAR(36) PRIMARY KEY,
    prefix VARCHAR(20) DEFAULT 'PERF',
    code_length INT DEFAULT 6,
    auto_generate BOOLEAN DEFAULT TRUE,
    current_sequence INT DEFAULT 10001,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
