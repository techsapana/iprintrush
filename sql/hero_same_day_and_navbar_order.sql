-- Run on your MySQL database (adjust VARCHAR lengths / engine if needed).
-- 1) Curated products shown in the same-day carousel under the homepage hero
CREATE TABLE IF NOT EXISTS hero_same_day_products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(128) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hero_same_day_products_product (product_id),
  KEY idx_hero_same_day_products_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Custom order for category links in the main navbar strip (admin swap arrows)
CREATE TABLE IF NOT EXISTS navbar_category_order (
  category_id VARCHAR(128) NOT NULL PRIMARY KEY,
  nav_position INT NOT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_navbar_category_order_pos (nav_position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: enforce referential integrity when categories.id matches these VARCHAR keys
-- ALTER TABLE hero_same_day_products
--   ADD CONSTRAINT fk_hero_same_day_products_product
--   FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
-- ALTER TABLE navbar_category_order
--   ADD CONSTRAINT fk_navbar_category_order_category
--   FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
