-- Migration: Add custom price columns to product-option relationship tables
-- This allows per-product price customization (overriding global defaults)
-- Run this migration on your existing database

-- Add custom price to product_decoration_options
ALTER TABLE product_decoration_options 
ADD COLUMN custom_price DECIMAL(10, 2) DEFAULT NULL COMMENT 'Custom price for this product (NULL = use global default)';

-- Add custom price to product_size_options
ALTER TABLE product_size_options 
ADD COLUMN custom_price DECIMAL(10, 2) DEFAULT NULL COMMENT 'Custom price addon for this product (NULL = use global default)';

-- Add custom price to product_print_location_options
ALTER TABLE product_print_location_options 
ADD COLUMN custom_price DECIMAL(10, 2) DEFAULT NULL COMMENT 'Custom price for this product (NULL = use global default)';

-- Add custom price to product_turnaround_options
ALTER TABLE product_turnaround_options 
ADD COLUMN custom_price DECIMAL(10, 2) DEFAULT NULL COMMENT 'Custom price for this product (NULL = use global default)';

-- Add custom price to product_designer_help_options
ALTER TABLE product_designer_help_options 
ADD COLUMN custom_price DECIMAL(10, 2) DEFAULT NULL COMMENT 'Custom price for this product (NULL = use global default)';

-- Add custom quantity tiers per product (for completely custom pricing)
CREATE TABLE IF NOT EXISTS product_quantity_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    min_qty INT NOT NULL,
    max_qty INT COMMENT 'NULL means no upper limit',
    unit_price DECIMAL(10, 2) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_enabled (enabled),
    INDEX idx_min_qty (min_qty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add flag to product_quote_settings to indicate whether to use custom quantity tiers
ALTER TABLE product_quote_settings 
ADD COLUMN use_custom_quantity_tiers BOOLEAN DEFAULT FALSE COMMENT 'If TRUE, use product_quantity_tiers instead of global tiers';
