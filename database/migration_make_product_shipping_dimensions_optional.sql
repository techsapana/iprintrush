-- Migration: make product weight and package dimensions optional
-- Run this on environments where these columns may still be NOT NULL.

USE iprintrush;

ALTER TABLE products
  MODIFY COLUMN weight_lb DECIMAL(10, 3) NULL,
  MODIFY COLUMN package_length_in DECIMAL(10, 2) NULL,
  MODIFY COLUMN package_width_in DECIMAL(10, 2) NULL,
  MODIFY COLUMN package_height_in DECIMAL(10, 2) NULL;

