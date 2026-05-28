USE iprintrush;

CREATE TABLE IF NOT EXISTS product_coupon_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(100) NOT NULL,
  coupon_code VARCHAR(100) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product_coupon (product_id, coupon_code),
  KEY idx_coupon_code (coupon_code),
  CONSTRAINT fk_product_coupon_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS tax_rate_percent DECIMAL(6,3) NULL DEFAULT 0.000;

