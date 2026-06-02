-- Migration: Production Time Pricing Type Support (Flat + Percentage)
-- Adds pricing_type and percentage_value columns for rush fee support

USE iprintrush;

-- Turnaround options: Add pricing_type and percentage_value
ALTER TABLE turnaround_options 
ADD COLUMN pricing_type ENUM('flat', 'percentage') DEFAULT 'flat',
ADD COLUMN percentage_value DECIMAL(5, 2) NULL;

-- Customization pool options: Add pricing_type and percentage_value
ALTER TABLE customization_pool_options 
ADD COLUMN pricing_type ENUM('flat', 'percentage') DEFAULT 'flat',
ADD COLUMN percentage_value DECIMAL(5, 2) NULL;

-- Product turnaround options: Add pricing_type and percentage_value
ALTER TABLE product_turnaround_options 
ADD COLUMN pricing_type ENUM('flat', 'percentage') DEFAULT 'flat',
ADD COLUMN percentage_value DECIMAL(5, 2) NULL;

-- Product pool options: Add pricing_type and percentage_value
ALTER TABLE product_pool_options 
ADD COLUMN pricing_type ENUM('flat', 'percentage') DEFAULT 'flat',
ADD COLUMN percentage_value DECIMAL(5, 2) NULL;

-- Add indexes for performance
ALTER TABLE customization_pool_options ADD INDEX idx_pricing_type (pricing_type);