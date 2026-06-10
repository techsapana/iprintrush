-- Phase 1: Product shipping configuration fields
-- Date: 2026-06-09
-- Add shipping configuration columns to products table

USE iprintrush;

-- Add shipping configuration columns to products table
-- Note: Using ADD COLUMN IF NOT EXISTS compatibility - check if column exists first
SET @column_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'shipping_enabled' 
  AND TABLE_SCHEMA = DATABASE()
);
SET @sql := IF(@column_exists = 0, 
  'ALTER TABLE products ADD COLUMN shipping_enabled BOOLEAN NOT NULL DEFAULT TRUE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'local_delivery_eligible' 
  AND TABLE_SCHEMA = DATABASE()
);
SET @sql := IF(@column_exists = 0, 
  'ALTER TABLE products ADD COLUMN local_delivery_eligible BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'shipping_category' 
  AND TABLE_SCHEMA = DATABASE()
);
SET @sql := IF(@column_exists = 0, 
  'ALTER TABLE products ADD COLUMN shipping_category VARCHAR(50) DEFAULT ''standard''',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add shipping_review_required to orders table
SET @column_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'orders' 
  AND COLUMN_NAME = 'shipping_review_required' 
  AND TABLE_SCHEMA = DATABASE()
);
SET @sql := IF(@column_exists = 0, 
  'ALTER TABLE orders ADD COLUMN shipping_review_required BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;