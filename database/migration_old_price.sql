-- Add old_price to products for "old price / new price" display
USE iprintrush;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'old_price'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE products ADD COLUMN old_price DECIMAL(10,2) DEFAULT NULL AFTER price',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

