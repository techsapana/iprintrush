-- Add customer phone, product shipping specs, and site settings table
USE iprintrush;

-- 1) Customer phone support
ALTER TABLE customer_users
  ADD COLUMN phone VARCHAR(30) NULL AFTER email;

-- 2) Product shipping specs for FedEx calculations
ALTER TABLE products
  ADD COLUMN weight_lb DECIMAL(10, 3) NULL AFTER old_price,
  ADD COLUMN package_length_in DECIMAL(10, 2) NULL AFTER weight_lb,
  ADD COLUMN package_width_in DECIMAL(10, 2) NULL AFTER package_length_in,
  ADD COLUMN package_height_in DECIMAL(10, 2) NULL AFTER package_width_in;

-- 3) Admin-manageable announcement bar
CREATE TABLE IF NOT EXISTS site_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  announcement_text VARCHAR(500) NULL,
  announcement_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO site_settings (id, announcement_text, announcement_enabled)
VALUES (1, 'Get it by Christmas: Up to 40% off select last-minute gifts | Ends Dec. 22', TRUE)
ON DUPLICATE KEY UPDATE
  announcement_text = COALESCE(site_settings.announcement_text, VALUES(announcement_text)),
  announcement_enabled = site_settings.announcement_enabled;

