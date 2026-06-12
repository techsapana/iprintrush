-- Migration: Per-product order value limits for quote-based products
-- Run after schema.sql has defined the products table

USE iprintrush;

ALTER TABLE products
  ADD COLUMN min_order_value DECIMAL(10,2) NULL AFTER max_quantity,
  ADD COLUMN max_order_value DECIMAL(10,2) NULL AFTER min_order_value;
