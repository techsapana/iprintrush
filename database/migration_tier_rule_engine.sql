-- Production-Grade Tier Rule Engine Migration
-- Adds unified discount_type and discount_value to all tier tables
-- Replaces the broken discount_percent / discountAmount system

USE iprintrush;

-- Add columns to quantity_tiers (global tiers for apparel)
ALTER TABLE quantity_tiers
ADD COLUMN IF NOT EXISTS discount_type ENUM('NONE','PERCENT','FIXED') DEFAULT 'NONE' AFTER unit_price,
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2) DEFAULT 0 AFTER discount_type;

-- Add columns to product_quantity_tiers (product-specific tiers for apparel)
ALTER TABLE product_quantity_tiers
ADD COLUMN IF NOT EXISTS discount_type ENUM('NONE','PERCENT','FIXED') DEFAULT 'NONE' AFTER unit_price,
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2) DEFAULT 0 AFTER discount_type;

-- Add columns to customization_quantity_tiers (pool-level tiers for print products)
ALTER TABLE customization_quantity_tiers
ADD COLUMN IF NOT EXISTS discount_type ENUM('NONE','PERCENT','FIXED') DEFAULT 'NONE' AFTER unit_price,
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2) DEFAULT 0 AFTER discount_type;

-- Add columns to product_pool_quantity_tiers (product-pool tiers for print products)
ALTER TABLE product_pool_quantity_tiers
ADD COLUMN IF NOT EXISTS discount_type ENUM('NONE','PERCENT','FIXED') DEFAULT 'NONE' AFTER unit_price,
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2) DEFAULT 0 AFTER discount_type;