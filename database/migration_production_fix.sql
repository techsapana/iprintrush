-- Migration: Add missing columns to production database
-- This script adds the missing columns that caused the production backend to crash with a 500 error (Unexpected end of JSON input).

-- 1. Add missing package columns to the products table
ALTER TABLE products 
  ADD COLUMN package_width_in DECIMAL(10, 2) NULL,
  ADD COLUMN package_height_in DECIMAL(10, 2) NULL,
  ADD COLUMN package_type VARCHAR(50) DEFAULT 'YOUR_PACKAGING';

-- 2. Add missing pricing columns to the product_pool_options table
ALTER TABLE product_pool_options
  ADD COLUMN pricing_type VARCHAR(50) DEFAULT 'flat',
  ADD COLUMN percentage_value DECIMAL(10,2) DEFAULT 0.00;

-- 3. Add missing pricing columns to the product_turnaround_options table
ALTER TABLE product_turnaround_options
  ADD COLUMN pricing_type ENUM('flat', 'percentage') DEFAULT 'flat',
  ADD COLUMN percentage_value DECIMAL(5, 2) DEFAULT NULL;
