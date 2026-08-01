-- Migration: Fix Apparel Quote Settings and Add Order Messages Chat Table
-- Date: 2026-08-01

-- 1. Add missing pricing columns to product_turnaround_options
ALTER TABLE product_turnaround_options ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(50) DEFAULT 'flat';
ALTER TABLE product_turnaround_options ADD COLUMN IF NOT EXISTS percentage_value DECIMAL(10,2) DEFAULT NULL;

-- 2. Add missing pricing columns to turnaround_options
ALTER TABLE turnaround_options ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(50) DEFAULT 'flat';
ALTER TABLE turnaround_options ADD COLUMN IF NOT EXISTS percentage_value DECIMAL(10,2) DEFAULT NULL;

-- 3. Add missing discount columns to product_quantity_tiers
ALTER TABLE product_quantity_tiers ADD COLUMN IF NOT EXISTS discount_type ENUM('NONE', 'PERCENT', 'FIXED') DEFAULT 'NONE';
ALTER TABLE product_quantity_tiers ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2) DEFAULT 0;
ALTER TABLE product_quantity_tiers ADD COLUMN IF NOT EXISTS enabled TINYINT(1) DEFAULT 1;
ALTER TABLE product_quantity_tiers ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- 4. Add missing discount columns to quantity_tiers
ALTER TABLE quantity_tiers ADD COLUMN IF NOT EXISTS discount_type ENUM('NONE', 'PERCENT', 'FIXED') DEFAULT 'NONE';
ALTER TABLE quantity_tiers ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2) DEFAULT 0;
ALTER TABLE quantity_tiers ADD COLUMN IF NOT EXISTS enabled TINYINT(1) DEFAULT 1;

-- 5. Add image_url to product_color_options
ALTER TABLE product_color_options ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) DEFAULT NULL;

-- 6. Create order_messages table for OrderChat feature
CREATE TABLE IF NOT EXISTS order_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  sender_type ENUM('customer', 'admin', 'system') NOT NULL,
  message TEXT,
  attachment_url VARCHAR(255),
  attachment_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
