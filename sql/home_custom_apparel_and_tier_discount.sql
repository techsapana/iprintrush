-- Run on your MySQL database.

-- 1) Homepage "Custom Apparels" carousel (admin-curated product picks)
CREATE TABLE IF NOT EXISTS home_custom_apparel_products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(128) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_home_custom_apparel_product (product_id),
  KEY idx_home_custom_apparel_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Optional percent discount per quantity tier (applied to tier subtotal)
ALTER TABLE quantity_tiers
  ADD COLUMN discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00 AFTER unit_price;

ALTER TABLE product_quantity_tiers
  ADD COLUMN discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00 AFTER unit_price;

ALTER TABLE product_pool_quantity_tiers
  ADD COLUMN discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00 AFTER unit_price;

ALTER TABLE customization_quantity_tiers
  ADD COLUMN discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00 AFTER unit_price;
