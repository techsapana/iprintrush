-- Migration: Per-product quantity and dimension limits for area-based pricing
-- Run after schema.sql has created the products table

USE iprintrush;

ALTER TABLE products
  ADD COLUMN min_quantity INT NULL AFTER price,
  ADD COLUMN max_quantity INT NULL AFTER min_quantity,
  ADD COLUMN min_width_in DECIMAL(10,2) NULL AFTER max_quantity,
  ADD COLUMN max_width_in DECIMAL(10,2) NULL AFTER min_width_in,
  ADD COLUMN min_height_in DECIMAL(10,2) NULL AFTER max_width_in,
  ADD COLUMN max_height_in DECIMAL(10,2) NULL AFTER min_height_in,
  ADD COLUMN price_per_sq_inch DECIMAL(10,4) NULL AFTER max_height_in;

