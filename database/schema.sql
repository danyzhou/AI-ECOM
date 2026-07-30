-- ===================================================
-- AI Ecommerce Operation Center - Production Database Schema
-- Compatible with PostgreSQL 15+
-- ===================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'operations',
    avatar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    sku VARCHAR(100) UNIQUE NOT NULL,
    image_ratio VARCHAR(20) DEFAULT '1:1',
    categories TEXT,
    tags TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    
    main_image TEXT NOT NULL,
    optimized_main_image TEXT,
    white_bg_image TEXT,
    gallery_images TEXT,
    
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    promo_price DECIMAL(10, 2) DEFAULT 0.00,
    cost_price DECIMAL(10, 2) DEFAULT 0.00,
    estimated_margin DECIMAL(5, 2) DEFAULT 0.00,
    
    stock INT DEFAULT 0,
    weight DECIMAL(8, 2) DEFAULT 0.00,
    dimensions TEXT,
    
    selling_points TEXT,
    short_description TEXT,
    long_description TEXT,
    parameters TEXT,
    usage_instructions TEXT,
    cautions TEXT,
    
    seo_title VARCHAR(255),
    seo_keywords TEXT,
    seo_description TEXT,
    url_slug VARCHAR(255),
    
    source_type VARCHAR(20),
    source_url TEXT,
    wc_product_id INT,
    wc_permalink TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_images (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) REFERENCES products(id) ON DELETE CASCADE,
    image_type VARCHAR(20) NOT NULL,
    original_url TEXT NOT NULL,
    processed_url TEXT,
    watermark_removed BOOLEAN DEFAULT FALSE,
    bg_removed BOOLEAN DEFAULT FALSE,
    resolution VARCHAR(20) DEFAULT '1000x1000',
    file_size_kb INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_tasks (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) REFERENCES products(id) ON DELETE SET NULL,
    task_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting',
    progress INT DEFAULT 0,
    message TEXT,
    logs TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'wordpress_woocommerce',
    url TEXT NOT NULL,
    consumer_key TEXT NOT NULL,
    consumer_secret TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'connected',
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_publications (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) REFERENCES products(id) ON DELETE CASCADE,
    store_id VARCHAR(36) REFERENCES stores(id) ON DELETE CASCADE,
    wordpress_id INT,
    status VARCHAR(20) DEFAULT 'pending',
    url TEXT,
    error_log TEXT,
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_settings (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    api_key TEXT NOT NULL,
    model VARCHAR(100) NOT NULL,
    purpose VARCHAR(100),
    status VARCHAR(20) DEFAULT 'connected',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sku_settings (
    id VARCHAR(36) PRIMARY KEY,
    prefix VARCHAR(20) DEFAULT 'PERF',
    code_length INT DEFAULT 6,
    auto_generate BOOLEAN DEFAULT TRUE,
    current_sequence INT DEFAULT 10001,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sku_locks (
    lock_name VARCHAR(50) PRIMARY KEY,
    last_val INT DEFAULT 10001,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
    id VARCHAR(36) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target VARCHAR(255),
    status VARCHAR(20) DEFAULT 'info',
    http_code INT,
    latency_ms INT,
    message TEXT,
    error_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
