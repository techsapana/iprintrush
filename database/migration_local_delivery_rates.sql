-- Add local delivery rate columns to shipping_config table
USE iprintrush;

-- Check and add local_under_100_rate
SET @column_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'shipping_config' 
  AND COLUMN_NAME = 'local_under_100_rate' 
  AND TABLE_SCHEMA = DATABASE()
);
SET @sql := IF(@column_exists = 0, 
  'ALTER TABLE shipping_config ADD COLUMN local_under_100_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add local_between_100_199_rate
SET @column_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'shipping_config' 
  AND COLUMN_NAME = 'local_between_100_199_rate' 
  AND TABLE_SCHEMA = DATABASE()
);
SET @sql := IF(@column_exists = 0, 
  'ALTER TABLE shipping_config ADD COLUMN local_between_100_199_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add local_over_200_rate
SET @column_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'shipping_config' 
  AND COLUMN_NAME = 'local_over_200_rate' 
  AND TABLE_SCHEMA = DATABASE()
);
SET @sql := IF(@column_exists = 0, 
  'ALTER TABLE shipping_config ADD COLUMN local_over_200_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Seed default local delivery rates
UPDATE shipping_config
SET local_under_100_rate = 14.99,
    local_between_100_199_rate = 9.99,
    local_over_200_rate = 0.00
WHERE id = 1;