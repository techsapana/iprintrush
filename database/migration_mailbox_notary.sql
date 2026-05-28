-- Migration: Mailbox & Notary support tables
-- Run after core schema and dynamic customization migrations
USE iprintrush;

-- ============================================
-- MAILBOX RENTAL
-- ============================================

-- Price-per-month column for mailbox rental products
ALTER TABLE products
  ADD COLUMN mailbox_price_per_month DECIMAL(10, 2) NULL AFTER price_per_sq_inch;

-- Discount tiers for mailbox rental based on number of months
CREATE TABLE IF NOT EXISTS mailbox_discount_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  min_months INT NOT NULL,
  max_months INT COMMENT 'NULL means no upper limit',
  discount_percent DECIMAL(5, 2) NOT NULL COMMENT 'Percent discount, capped at 25%',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_min_months (min_months)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default mailbox discount tiers
INSERT INTO mailbox_discount_rules (min_months, max_months, discount_percent) VALUES
  (1, 5, 0.00),
  (6, 10, 10.00),
  (11, 20, 15.00),
  (21, NULL, 25.00);

-- ============================================
-- NOTARY SERVICES
-- ============================================

-- Allowed notary document types
CREATE TABLE IF NOT EXISTS notary_document_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enabled (enabled),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Global notary pricing configuration (price per signature)
CREATE TABLE IF NOT EXISTS notary_pricing_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  price_per_signature DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Discount tiers for notary services based on signature count
CREATE TABLE IF NOT EXISTS notary_discount_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  min_signatures INT NOT NULL,
  max_signatures INT COMMENT 'NULL means no upper limit',
  discount_percent DECIMAL(5, 2) NOT NULL COMMENT 'Percent discount, capped at 25%',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_min_signatures (min_signatures)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notary requests submitted from the frontend form
CREATE TABLE IF NOT EXISTS notary_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_number VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  signature_count INT NOT NULL,
  base_amount DECIMAL(10, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  status ENUM('pending','approved','completed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_request_number (request_number),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mapping of notary requests to selected document types
CREATE TABLE IF NOT EXISTS notary_request_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  document_type_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES notary_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (document_type_id) REFERENCES notary_document_types(id) ON DELETE RESTRICT,
  INDEX idx_request (request_id),
  INDEX idx_document_type (document_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default notary document types
INSERT INTO notary_document_types (id, name, description, display_order) VALUES
  ('grant_deed', 'Grant Deed / Quitclaim Deed', 'Ownership transfer documents for real property', 1),
  ('mortgage_agreement', 'Mortgage Agreement', 'Mortgage and loan agreements', 2),
  ('deed_of_trust', 'Deed of Trust', 'Deed of trust and related security instruments', 3),
  ('loan_modification', 'Loan Modification Agreement', 'Loan modification and workout agreements', 4),
  ('refinance_docs', 'Refinance Documents', 'Refinance packages and related documents', 5),
  ('property_affidavit', 'Property Affidavits', 'Affidavits related to property ownership or status', 6),
  ('occupancy_affidavit', 'Occupancy Affidavit', 'Documents confirming occupancy/use of property', 7)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  display_order = VALUES(display_order);

-- Seed default notary pricing (can be adjusted later in DB)
INSERT INTO notary_pricing_config (price_per_signature) VALUES (15.00);

-- Seed default notary discount tiers
INSERT INTO notary_discount_rules (min_signatures, max_signatures, discount_percent) VALUES
  (1, 5, 0.00),
  (6, 10, 10.00),
  (11, 20, 15.00),
  (21, NULL, 25.00);

