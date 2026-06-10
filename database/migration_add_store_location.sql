-- Add store location support to site_settings table
USE iprintrush;

SET @column_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'site_settings' 
  AND COLUMN_NAME = 'store_lat' 
  AND TABLE_SCHEMA = DATABASE()
);
SET @sql := IF(@column_exists = 0, 
  'ALTER TABLE site_settings ADD COLUMN store_lat DECIMAL(10,8) NULL AFTER announcement_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'site_settings' 
  AND COLUMN_NAME = 'store_lng' 
  AND TABLE_SCHEMA = DATABASE()
);
SET @sql := IF(@column_exists = 0, 
  'ALTER TABLE site_settings ADD COLUMN store_lng DECIMAL(11,8) NULL AFTER store_lat',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'site_settings' 
  AND COLUMN_NAME = 'store_address' 
  AND TABLE_SCHEMA = DATABASE()
);
SET @sql := IF(@column_exists = 0, 
  'ALTER TABLE site_settings ADD COLUMN store_address VARCHAR(255) NULL AFTER store_lng',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
