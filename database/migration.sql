-- ===================================================
-- AI Ecommerce Operation Center - Schema Migration
-- ===================================================

-- Ensure missing columns exist in case of upgrade from earlier versions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='salt') THEN
        ALTER TABLE users ADD COLUMN salt VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_ratio') THEN
        ALTER TABLE products ADD COLUMN image_ratio VARCHAR(20) DEFAULT '1:1';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='sku_locks') THEN
        CREATE TABLE sku_locks (
            lock_name VARCHAR(50) PRIMARY KEY,
            last_val INT DEFAULT 10001,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Optimize index queries
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(status);
CREATE INDEX IF NOT EXISTS idx_publications_product ON product_publications(product_id);
