-- Migration: add allow_custom_dimensions to products
-- Run this to add the custom width/height toggle to existing databases.

USE iprintrush;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS allow_custom_dimensions BOOLEAN NOT NULL DEFAULT FALSE
  AFTER featured;
