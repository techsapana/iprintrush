-- Migration: Dynamic customization system for multiple print product categories
-- Custom Apparels keep existing flow; other categories use schema-driven options

USE iprintrush;

-- Add customization_schema to categories
ALTER TABLE categories 
ADD COLUMN customization_schema JSON DEFAULT NULL COMMENT 'Schema defining which option groups to show. NULL or {"mode":"apparel"} = use existing apparel flow. {"mode":"print_product","groups":[...]} = dynamic';

-- ============================================
-- GENERIC OPTION POOLS (for non-apparel products)
-- ============================================

-- Option pools - named groups (paper_types, print_sizes, binding_options, etc.)
CREATE TABLE IF NOT EXISTS customization_option_pools (
    id VARCHAR(50) PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    selection_type ENUM('single', 'multi', 'quantity', 'dimension') DEFAULT 'single',
    price_type ENUM('per_unit', 'per_order', 'tier_based') DEFAULT 'per_unit',
    display_order INT DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (`key`),
    INDEX idx_enabled (enabled),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Options within each pool
CREATE TABLE IF NOT EXISTS customization_pool_options (
    id VARCHAR(50) PRIMARY KEY,
    pool_id VARCHAR(50) NOT NULL,
    label VARCHAR(255) NOT NULL,
    value VARCHAR(255) COMMENT 'Optional value (e.g. "8.5x11" for dimensions)',
    price_modifier DECIMAL(10, 2) DEFAULT 0.00,
    metadata JSON COMMENT 'Extra data: min/max for dimensions, etc.',
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pool_id) REFERENCES customization_option_pools(id) ON DELETE CASCADE,
    INDEX idx_pool (pool_id),
    INDEX idx_enabled (enabled),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quantity tiers for pools (e.g. 25-99, 100-249) - reusable
CREATE TABLE IF NOT EXISTS customization_quantity_tiers (
    id VARCHAR(50) PRIMARY KEY,
    pool_id VARCHAR(50) NOT NULL,
    min_qty INT NOT NULL,
    max_qty INT COMMENT 'NULL = no upper limit',
    unit_price DECIMAL(10, 2) NULL,
    discount_type ENUM('NONE','PERCENT','FIXED') DEFAULT 'NONE',
    discount_value DECIMAL(10,2) DEFAULT 0,
    label VARCHAR(100) COMMENT 'e.g. "25-99"',
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pool_id) REFERENCES customization_option_pools(id) ON DELETE CASCADE,
    INDEX idx_pool (pool_id),
    INDEX idx_min_qty (min_qty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product-pool overrides: which options from each pool this product supports
CREATE TABLE IF NOT EXISTS product_pool_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    pool_id VARCHAR(50) NOT NULL,
    option_id VARCHAR(50) NOT NULL,
    custom_price DECIMAL(10, 2) DEFAULT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (pool_id) REFERENCES customization_option_pools(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES customization_pool_options(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_pool_option (product_id, pool_id, option_id),
    INDEX idx_product (product_id),
    INDEX idx_pool (pool_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product quantity tiers (for products using tier-based pricing)
CREATE TABLE IF NOT EXISTS product_pool_quantity_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    pool_id VARCHAR(50) NOT NULL,
    min_qty INT NOT NULL,
    max_qty INT,
    unit_price DECIMAL(10, 2) NULL,
    discount_type ENUM('NONE','PERCENT','FIXED') DEFAULT 'NONE',
    discount_value DECIMAL(10,2) DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (pool_id) REFERENCES customization_option_pools(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_pool (pool_id),
    INDEX idx_min_qty (min_qty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SEED: Option pools from Sameday Print & Services spec
-- ============================================

-- Print sizes (for flyers, brochures, postcards, etc.)
INSERT INTO customization_option_pools (id, `key`, name, description, selection_type, price_type, display_order) VALUES
('pool-print-sizes', 'print_sizes', 'Print Size', 'Standard print dimensions', 'single', 'per_unit', 1),
('pool-paper-types', 'paper_types', 'Paper Type', 'Paper stock options', 'single', 'per_unit', 2),
('pool-binding', 'binding', 'Binding', 'Binding options for booklets/catalogs', 'single', 'per_order', 3),
('pool-folding', 'folding', 'Folding', 'Folding style for brochures', 'single', 'per_order', 4),
('pool-printing-style', 'printing_style', 'Printing', 'Color/B&W, front/back', 'single', 'per_unit', 5),
('pool-production-time', 'production_time', 'Production Time', 'Turnaround/delivery speed', 'single', 'per_order', 6),
('pool-lamination', 'lamination', 'Lamination', 'Lamination options', 'single', 'per_order', 7),
('pool-finishing', 'finishing', 'Finishing', 'Finishing options (grommets, hems, etc.)', 'multi', 'per_order', 8)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Print size options (common sizes across products)
INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
-- Flyers
('opt-flyer-55x85', 'pool-print-sizes', '5.5" x 8.5"', '5.5x8.5', 0, 1),
('opt-flyer-85x11', 'pool-print-sizes', '8.5" x 11"', '8.5x11', 0, 2),
('opt-flyer-11x17', 'pool-print-sizes', '11" x 17"', '11x17', 0, 3),
-- Brochures
('opt-broch-55x85', 'pool-print-sizes', '5.5" x 8.5"', '5.5x8.5', 0, 10),
('opt-broch-8x9', 'pool-print-sizes', '8" x 9"', '8x9', 0, 11),
('opt-broch-85x11', 'pool-print-sizes', '8.5" x 11"', '8.5x11', 0, 12),
('opt-broch-9x12', 'pool-print-sizes', '9" x 12"', '9x12', 0, 13),
('opt-broch-11x17', 'pool-print-sizes', '11" x 17"', '11x17', 0, 14),
-- Postcards
('opt-post-4x6', 'pool-print-sizes', '4" x 6"', '4x6', 0, 20),
('opt-post-5x7', 'pool-print-sizes', '5" x 7"', '5x7', 0, 21),
('opt-post-55x85', 'pool-print-sizes', '5.5" x 8.5"', '5.5x8.5', 0, 22),
('opt-post-6x9', 'pool-print-sizes', '6" x 9"', '6x9', 0, 23),
-- Business cards
('opt-bc-35x2', 'pool-print-sizes', '3.5" x 2" (Landscape)', '3.5x2', 0, 30),
('opt-bc-2x35', 'pool-print-sizes', '2" x 3.5" (Vertical)', '2x3.5', 0, 31),
-- Menus
('opt-menu-8x10', 'pool-print-sizes', '8" x 10"', '8x10', 0, 40),
('opt-menu-11x17', 'pool-print-sizes', '11" x 17"', '11x17', 0, 41),
-- Envelopes
('opt-env-35x65', 'pool-print-sizes', '3.5" x 6.5" (#7)', '3.5x6.5', 0, 50),
('opt-env-6x9', 'pool-print-sizes', '6" x 9" (Catalog)', '6x9', 0, 51),
('opt-env-975x437', 'pool-print-sizes', '9.75" x 4.37" (#10)', '9.75x4.37', 0, 52),
('opt-env-10-window', 'pool-print-sizes', '#10 Window', '10-window', 0, 53),
('opt-env-a7', 'pool-print-sizes', '5.25" x 7.25" (#A7)', '5.25x7.25', 0, 54),
('opt-env-a6', 'pool-print-sizes', '4.75" x 6.5" (#A6)', '4.75x6.5', 0, 55)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- Paper type options
INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
('opt-paper-100matte', 'pool-paper-types', '100 lb Matte Cardstock', '100matte', 0, 1),
('opt-paper-100gloss', 'pool-paper-types', '100 lb Gloss Cardstock', '100gloss', 0, 2),
('opt-paper-100gloss-text', 'pool-paper-types', '100 lb Gloss Text', '100gloss-text', 0, 3),
('opt-paper-100matte-paper', 'pool-paper-types', '100 lb Matte Paper', '100matte-paper', 0, 4),
('opt-paper-100uncoated', 'pool-paper-types', '100 lb Uncoated Paper', '100uncoated', 0, 5),
('opt-paper-14pt-matte', 'pool-paper-types', '14pt Cardstock Matte', '14pt-matte', 0, 10),
('opt-paper-14pt-gloss', 'pool-paper-types', '14pt Cardstock Gloss', '14pt-gloss', 0, 11),
('opt-paper-16pt-matte', 'pool-paper-types', '16pt Cardstock Matte', '16pt-matte', 0, 12),
('opt-paper-16pt-gloss', 'pool-paper-types', '16pt Cardstock Gloss', '16pt-gloss', 0, 13),
('opt-paper-24lb-white', 'pool-paper-types', '24 lb Bright White', '24lb-white', 0, 20),
('opt-paper-70lb-uncoated', 'pool-paper-types', '70 lb Uncoated', '70lb-uncoated', 0, 21),
('opt-paper-24lb-standard', 'pool-paper-types', '24 lb Standard', '24lb-standard', 0, 22),
('opt-paper-32lb-gloss', 'pool-paper-types', '32 lb Gloss', '32lb-gloss', 0, 23)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- Binding options
INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
('opt-bind-saddle', 'pool-binding', 'Saddle Stitched', 'saddle', 0, 1),
('opt-bind-spiral', 'pool-binding', 'Plastic Spiral', 'spiral', 0, 2)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- Folding options
INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
('opt-fold-half', 'pool-folding', 'Half Fold', 'half', 0, 1),
('opt-fold-z', 'pool-folding', 'Z-Fold', 'z', 0, 2),
('opt-fold-tri', 'pool-folding', 'Tri-Fold', 'tri', 0, 3)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- Printing style options
INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
('opt-print-color-front', 'pool-printing-style', 'Color Front Only', 'color-front', 0, 1),
('opt-print-color-both', 'pool-printing-style', 'Color Front & Back', 'color-both', 0, 2),
('opt-print-bw-front', 'pool-printing-style', 'Black & White Front Only', 'bw-front', 0, 3),
('opt-print-bw-both', 'pool-printing-style', 'Black & White Front & Back', 'bw-both', 0, 4),
('opt-print-color-inside', 'pool-printing-style', 'Color Inside & Outside', 'color-inside', 0, 5),
('opt-print-bw-inside', 'pool-printing-style', 'Black & White', 'bw-inside', 0, 6)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- Production time options
INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
('opt-prod-same', 'pool-production-time', 'Same Day Store Pickup', 'same-day', 0, 1),
('opt-prod-urgent', 'pool-production-time', 'Urgent Shipping', 'urgent', 0, 2),
('opt-prod-next', 'pool-production-time', 'Next Day', 'next-day', 0, 3),
('opt-prod-2-3', 'pool-production-time', '2-3 Business Days', '2-3', 0, 4),
('opt-prod-5-7', 'pool-production-time', '5-7 Business Days', '5-7', 0, 5),
('opt-prod-10', 'pool-production-time', '10 Days', '10', 0, 6),
('opt-prod-3day', 'pool-production-time', '3 Days', '3', 0, 7),
('opt-prod-5day', 'pool-production-time', '5 Days', '5', 0, 8),
('opt-prod-7day', 'pool-production-time', '7 Days', '7', 0, 9),
('opt-prod-2hr', 'pool-production-time', '2 Hours (Rush)', '2hr', 25, 0)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- Lamination options
INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
('opt-lam-none', 'pool-lamination', 'None', 'none', 0, 1),
('opt-lam-matte', 'pool-lamination', 'Matte', 'matte', 0, 2),
('opt-lam-gloss', 'pool-lamination', 'Gloss', 'gloss', 0, 3)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- Designer help (reuse concept - can share with apparel)
INSERT INTO customization_option_pools (id, `key`, name, description, selection_type, price_type, display_order) VALUES
('pool-designer-help', 'designer_help', 'Designer Help', 'Design assistance options', 'single', 'per_order', 100)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
('opt-design-basic', 'pool-designer-help', 'Basic Help', 'basic', 0, 1),
('opt-design-standard', 'pool-designer-help', 'Standard Help', 'standard', 10, 2),
('opt-design-premium', 'pool-designer-help', 'Premium Help', 'premium', 25, 3)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- Quantity tier pool for print products (generic)
INSERT INTO customization_option_pools (id, `key`, name, description, selection_type, price_type, display_order) VALUES
('pool-qty-tiers', 'quantity_tiers', 'Quantity', 'Quantity-based pricing', 'quantity', 'tier_based', 0)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Seed quantity tiers for print products (generic ranges)
INSERT INTO customization_quantity_tiers (id, pool_id, min_qty, max_qty, unit_price, label, display_order) VALUES
('qt-1', 'pool-qty-tiers', 1, 24, 1.50, '1-24', 1),
('qt-2', 'pool-qty-tiers', 25, 99, 1.00, '25-99', 2),
('qt-3', 'pool-qty-tiers', 100, 249, 0.75, '100-249', 3),
('qt-4', 'pool-qty-tiers', 250, 499, 0.50, '250-499', 4),
('qt-5', 'pool-qty-tiers', 500, 999, 0.35, '500-999', 5),
('qt-6', 'pool-qty-tiers', 1000, NULL, 0.25, '1000+', 6)
ON DUPLICATE KEY UPDATE unit_price=VALUES(unit_price);

-- Banner/material options for signs
INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
('opt-paper-vinyl-13', 'pool-paper-types', '13 oz Matte Vinyl', 'vinyl-13', 0, 50),
('opt-paper-fabric-9', 'pool-paper-types', '9 oz Fabric Banner', 'fabric-9', 0, 51),
('opt-paper-blockout-18', 'pool-paper-types', '18 oz Blockout Vinyl', 'blockout-18', 0, 52),
('opt-paper-mesh-10', 'pool-paper-types', '10 oz Mesh Vinyl', 'mesh-10', 0, 53)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============================================
-- Update category customization schemas
-- ============================================

-- Marketing materials: flyers, brochures, business cards, postcards, etc.
UPDATE categories SET customization_schema = JSON_OBJECT(
  'mode', 'print_product',
  'groups', JSON_ARRAY(
    JSON_OBJECT('poolKey', 'print_sizes', 'label', 'Size', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'paper_types', 'label', 'Paper Type', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'printing_style', 'label', 'Printing', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'production_time', 'label', 'Production Time', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'quantity_tiers', 'label', 'Quantity', 'required', TRUE, 'selectionType', 'quantity', 'useTiers', TRUE),
    JSON_OBJECT('poolKey', 'designer_help', 'label', 'Designer Help', 'required', FALSE, 'selectionType', 'single')
  )
) WHERE id = 'cat-marketing';

-- Signs & Banners (simplified - can expand)
UPDATE categories SET customization_schema = JSON_OBJECT(
  'mode', 'print_product',
  'groups', JSON_ARRAY(
    JSON_OBJECT('poolKey', 'print_sizes', 'label', 'Size', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'paper_types', 'label', 'Material', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'production_time', 'label', 'Production Time', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'quantity_tiers', 'label', 'Quantity', 'required', TRUE, 'selectionType', 'quantity', 'useTiers', TRUE)
  )
) WHERE id = 'cat-signs';

-- Labels & Stickers
UPDATE categories SET customization_schema = JSON_OBJECT(
  'mode', 'print_product',
  'groups', JSON_ARRAY(
    JSON_OBJECT('poolKey', 'print_sizes', 'label', 'Size', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'paper_types', 'label', 'Material', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'production_time', 'label', 'Production Time', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'quantity_tiers', 'label', 'Quantity', 'required', TRUE, 'selectionType', 'quantity', 'useTiers', TRUE)
  )
) WHERE id = 'cat-labels';

-- DTF & UV DTF
UPDATE categories SET customization_schema = JSON_OBJECT(
  'mode', 'print_product',
  'groups', JSON_ARRAY(
    JSON_OBJECT('poolKey', 'production_time', 'label', 'Production Time', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'quantity_tiers', 'label', 'Quantity', 'required', TRUE, 'selectionType', 'quantity', 'useTiers', TRUE)
  )
) WHERE id = 'cat-dtf';

-- Custom Apparels - explicit apparel mode (uses existing flow)
UPDATE categories SET customization_schema = JSON_OBJECT('mode', 'apparel') WHERE id = 'cat-apparels';

-- Trade Show, Mailbox - minimal or no customization for now
UPDATE categories SET customization_schema = JSON_OBJECT('mode', 'print_product', 'groups', JSON_ARRAY()) 
WHERE id IN ('cat-trade', 'cat-mailbox') AND customization_schema IS NULL;

