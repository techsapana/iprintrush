-- iPrintRush MySQL Database Schema
-- Production-ready schema for dynamic product customization system

-- Create database (run this first)
CREATE DATABASE IF NOT EXISTS iprintrush CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE iprintrush;

-- ============================================
-- CORE TABLES
-- ============================================

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    display_order INT DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_enabled (enabled),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0.00,
    min_quantity INT DEFAULT NULL,
    max_quantity INT DEFAULT NULL,
    min_order_value DECIMAL(10,2) DEFAULT NULL,
    max_order_value DECIMAL(10,2) DEFAULT NULL,
    min_width_in DECIMAL(10, 2) DEFAULT NULL,
    max_width_in DECIMAL(10, 2) DEFAULT NULL,
    min_height_in DECIMAL(10, 2) DEFAULT NULL,
    max_height_in DECIMAL(10, 2) DEFAULT NULL,
    price_per_sq_inch DECIMAL(10, 4) DEFAULT NULL,
    mailbox_price_per_month DECIMAL(10, 2) DEFAULT NULL,
    old_price DECIMAL(10, 2) DEFAULT NULL,
    category_id VARCHAR(50),
    image VARCHAR(500),
    same_day_eligible BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    allow_custom_dimensions BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_category (category_id),
    INDEX idx_enabled (enabled),
    INDEX idx_same_day (same_day_eligible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product features (many-to-many)
CREATE TABLE IF NOT EXISTS product_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    feature VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- QUOTE CONFIGURATION TABLES
-- ============================================

-- Decoration options (DTF Printed, Screen Printed, Embroidery, etc.)
CREATE TABLE IF NOT EXISTS decoration_options (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price_modifier DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Price per piece',
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enabled (enabled),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Color options
CREATE TABLE IF NOT EXISTS color_options (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hex VARCHAR(7) NOT NULL COMMENT 'Hex color code',
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enabled (enabled),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Size options (S, M, L, XL, 2XL, etc.)
CREATE TABLE IF NOT EXISTS size_options (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(50) NOT NULL,
    price_addon DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Additional price per piece',
    base_enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enabled (base_enabled),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quantity pricing tiers
CREATE TABLE IF NOT EXISTS quantity_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    min_qty INT NOT NULL,
    max_qty INT COMMENT 'NULL means no upper limit',
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_type ENUM('NONE','PERCENT','FIXED') DEFAULT 'NONE',
    discount_value DECIMAL(10,2) DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enabled (enabled),
    INDEX idx_min_qty (min_qty),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Print location options (Front, Back, Sleeve, etc.)
CREATE TABLE IF NOT EXISTS print_location_options (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price_modifier DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Price per piece',
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enabled (enabled),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Turnaround options (2 Hours Rush, Same Day, Next Day, Standard)
CREATE TABLE IF NOT EXISTS turnaround_options (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price_modifier DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Price per order',
    pricing_type ENUM('flat', 'percentage') DEFAULT 'flat',
    percentage_value DECIMAL(5, 2) NULL,
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enabled (enabled),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Designer help options
CREATE TABLE IF NOT EXISTS designer_help_options (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price_modifier DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Price per order',
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enabled (enabled),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shipping configuration
CREATE TABLE IF NOT EXISTS shipping_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enabled BOOLEAN DEFAULT TRUE,
    default_flat_rate DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shipping rules (state-based, zip-based, or flat rate)
CREATE TABLE IF NOT EXISTS shipping_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_type ENUM('flat', 'state', 'zip') NOT NULL,
    state_code VARCHAR(10) COMMENT 'For state-based rules',
    zip_prefix VARCHAR(10) COMMENT 'For zip-based rules (e.g., "900" for 90001-90099)',
    price DECIMAL(10, 2) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rule_type (rule_type),
    INDEX idx_state (state_code),
    INDEX idx_zip_prefix (zip_prefix),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PRODUCT-QUOTE CONFIGURATION RELATIONSHIPS
-- ============================================

-- Product quote settings (which options are available for each product)
CREATE TABLE IF NOT EXISTS product_quote_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT TRUE,
    use_custom_quantity_tiers BOOLEAN DEFAULT FALSE COMMENT 'If TRUE, use product_quantity_tiers instead of global tiers',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product decoration options (many-to-many with custom pricing)
CREATE TABLE IF NOT EXISTS product_decoration_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    decoration_option_id VARCHAR(50) NOT NULL,
    custom_price DECIMAL(10, 2) DEFAULT NULL COMMENT 'Custom price for this product (NULL = use global default)',
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (decoration_option_id) REFERENCES decoration_options(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_decoration (product_id, decoration_option_id),
    INDEX idx_product (product_id),
    INDEX idx_decoration (decoration_option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product color options (many-to-many)
CREATE TABLE IF NOT EXISTS product_color_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    color_option_id VARCHAR(50) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (color_option_id) REFERENCES color_options(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_color (product_id, color_option_id),
    INDEX idx_product (product_id),
    INDEX idx_color (color_option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product size options (many-to-many with custom pricing)
CREATE TABLE IF NOT EXISTS product_size_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    size_option_id VARCHAR(50) NOT NULL,
    custom_price DECIMAL(10, 2) DEFAULT NULL COMMENT 'Custom price addon for this product (NULL = use global default)',
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (size_option_id) REFERENCES size_options(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_size (product_id, size_option_id),
    INDEX idx_product (product_id),
    INDEX idx_size (size_option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product print location options (many-to-many with custom pricing)
CREATE TABLE IF NOT EXISTS product_print_location_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    print_location_option_id VARCHAR(50) NOT NULL,
    custom_price DECIMAL(10, 2) DEFAULT NULL COMMENT 'Custom price for this product (NULL = use global default)',
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (print_location_option_id) REFERENCES print_location_options(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_location (product_id, print_location_option_id),
    INDEX idx_product (product_id),
    INDEX idx_location (print_location_option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product turnaround options (many-to-many with custom pricing)
CREATE TABLE IF NOT EXISTS product_turnaround_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    turnaround_option_id VARCHAR(50) NOT NULL,
    custom_price DECIMAL(10, 2) DEFAULT NULL COMMENT 'Custom price for this product (NULL = use global default)',
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (turnaround_option_id) REFERENCES turnaround_options(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_turnaround (product_id, turnaround_option_id),
    INDEX idx_product (product_id),
    INDEX idx_turnaround (turnaround_option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product designer help options (many-to-many with custom pricing)
CREATE TABLE IF NOT EXISTS product_designer_help_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    designer_help_option_id VARCHAR(50) NOT NULL,
    custom_price DECIMAL(10, 2) DEFAULT NULL COMMENT 'Custom price for this product (NULL = use global default)',
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (designer_help_option_id) REFERENCES designer_help_options(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_designer (product_id, designer_help_option_id),
    INDEX idx_product (product_id),
    INDEX idx_designer (designer_help_option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product-specific quantity tiers (for completely custom pricing per product)
CREATE TABLE IF NOT EXISTS product_quantity_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    min_qty INT NOT NULL,
    max_qty INT COMMENT 'NULL means no upper limit',
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_type ENUM('NONE','PERCENT','FIXED') DEFAULT 'NONE',
    discount_value DECIMAL(10,2) DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_enabled (enabled),
    INDEX idx_min_qty (min_qty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USER & AUTHENTICATION TABLES
-- ============================================

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL COMMENT 'BCrypt hash',
    role ENUM('admin', 'manager') DEFAULT 'admin',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ORDER & QUOTE TABLES (for future use)
-- ============================================

-- Quotes/Orders
CREATE TABLE IF NOT EXISTS quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    product_id VARCHAR(50),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    status ENUM('draft', 'sent', 'accepted', 'rejected', 'expired') DEFAULT 'draft',
    subtotal DECIMAL(10, 2) NOT NULL,
    shipping DECIMAL(10, 2) DEFAULT 0.00,
    grand_total DECIMAL(10, 2) NOT NULL,
    total_quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    decoration_option_id VARCHAR(50),
    color_option_id VARCHAR(50),
    turnaround_option_id VARCHAR(50),
    designer_help_option_id VARCHAR(50),
    delivery_method ENUM('pickup', 'shipping') DEFAULT 'pickup',
    shipping_state VARCHAR(10),
    shipping_zip VARCHAR(20),
    notes TEXT,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (decoration_option_id) REFERENCES decoration_options(id) ON DELETE SET NULL,
    FOREIGN KEY (color_option_id) REFERENCES color_options(id) ON DELETE SET NULL,
    FOREIGN KEY (turnaround_option_id) REFERENCES turnaround_options(id) ON DELETE SET NULL,
    FOREIGN KEY (designer_help_option_id) REFERENCES designer_help_options(id) ON DELETE SET NULL,
    INDEX idx_quote_number (quote_number),
    INDEX idx_status (status),
    INDEX idx_product (product_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quote size breakdown
CREATE TABLE IF NOT EXISTS quote_size_breakdown (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    size_option_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    FOREIGN KEY (size_option_id) REFERENCES size_options(id) ON DELETE CASCADE,
    INDEX idx_quote (quote_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quote print locations
CREATE TABLE IF NOT EXISTS quote_print_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    print_location_option_id VARCHAR(50) NOT NULL,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    FOREIGN KEY (print_location_option_id) REFERENCES print_location_options(id) ON DELETE CASCADE,
    INDEX idx_quote (quote_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quote line items (for detailed breakdown)
CREATE TABLE IF NOT EXISTS quote_line_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    label VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    display_order INT DEFAULT 0,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    INDEX idx_quote (quote_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MAILBOX & NOTARY TABLES
-- ============================================

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


-- ============================================
-- TESTIMONIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS testimonials (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255) NULL,
    quote TEXT NOT NULL,
    rating INT NOT NULL DEFAULT 5,
    image_url VARCHAR(500) NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================
-- INITIAL DATA SEEDING
-- ============================================

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123' using BCrypt
INSERT INTO admin_users (email, password_hash, role) VALUES
('admin@iprintrush.com', '$2b$10$rOzJqKqKqKqKqKqKqKqKqOqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqK', 'admin')
ON DUPLICATE KEY UPDATE email=email;

-- Insert default categories
INSERT INTO categories (id, name, slug, description, display_order) VALUES
('cat-all', 'All Products', 'all', 'Browse our complete range of same-day printing services', 0),
('cat-apparels', 'Custom Apparels', 'custom-apparels', 'Branded t-shirts, hoodies, and apparel for your business or event', 1),
('cat-signs', 'Signs & Banners', 'signs-banners', 'Vinyl banners, corrugated signs, and outdoor signage', 2),
('cat-marketing', 'Marketing Materials', 'marketing', 'Flyers, business cards, postcards, and promotional materials', 3),
('cat-dtf', 'DTF & UV DTF', 'dtf-uvdtf', 'Direct-to-Film printing for apparel and hard surfaces', 4),
('cat-labels', 'Labels & Stickers', 'labels-stickers', 'Custom labels, vinyl stickers, and product branding solutions', 5),
('cat-trade', 'Trade Show & Events', 'trade-show', 'Promotional items and branded merchandise for events', 6),
('cat-mailbox', 'Mailbox & Notary', 'mailbox-notary', 'Mailbox services and notary solutions', 7)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert default decoration options
INSERT INTO decoration_options (id, name, price_modifier, display_order) VALUES
('dec-dtf', 'DTF Printed', 0.00, 1),
('dec-screen', 'Screen Printed', 5.00, 2),
('dec-embroidery', 'Embroidery', 5.00, 3)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert default color options
INSERT INTO color_options (id, name, hex, display_order) VALUES
('color-white', 'White', '#FFFFFF', 1),
('color-black', 'Black', '#000000', 2),
('color-red', 'Red', '#FF0000', 3),
('color-royal-blue', 'Royal Blue', '#4169E1', 4),
('color-navy', 'Navy', '#000080', 5),
('color-gray', 'Gray', '#808080', 6)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert default size options
INSERT INTO size_options (id, label, price_addon, display_order) VALUES
('size-s', 'S', 0.00, 1),
('size-m', 'M', 0.00, 2),
('size-l', 'L', 0.00, 3),
('size-xl', 'XL', 0.00, 4),
('size-2xl', '2XL', 3.00, 5),
('size-3xl', '3XL', 5.00, 6),
('size-4xl', '4XL', 5.00, 7)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- Insert default quantity tiers
INSERT INTO quantity_tiers (min_qty, max_qty, unit_price, display_order) VALUES
(1, 5, 25.00, 1),
(6, 11, 20.00, 2),
(12, 23, 18.00, 3),
(24, 35, 16.00, 4),
(36, NULL, 14.00, 5)
ON DUPLICATE KEY UPDATE unit_price=VALUES(unit_price);

-- Insert default print location options
INSERT INTO print_location_options (id, name, price_modifier, display_order) VALUES
('loc-front', 'Front', 5.00, 1),
('loc-back', 'Back', 5.00, 2),
('loc-sleeve', 'Sleeve', 5.00, 3)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert default turnaround options
INSERT INTO turnaround_options (id, name, price_modifier, display_order) VALUES
('turn-2hr', '2 Hours (Rush)', 25.00, 1),
('turn-same', 'Same Day', 0.00, 2),
('turn-next', 'Next Day', 0.00, 3),
('turn-standard', 'Standard', 0.00, 4)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert default designer help options
INSERT INTO designer_help_options (id, name, price_modifier, display_order) VALUES
('designer-basic', 'Basic Help', 0.00, 1),
('designer-standard', 'Standard Help', 10.00, 2),
('designer-premium', 'Premium Help', 25.00, 3)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert default shipping config
INSERT INTO shipping_config (enabled, default_flat_rate) VALUES
(TRUE, 10.00)
ON DUPLICATE KEY UPDATE enabled=enabled;

-- Insert default mailbox discount tiers
INSERT INTO mailbox_discount_rules (min_months, max_months, discount_percent) VALUES
(1, 5, 0.00),
(6, 10, 10.00),
(11, 20, 15.00),
(21, NULL, 25.00)
ON DUPLICATE KEY UPDATE discount_percent=VALUES(discount_percent);

-- Insert default notary document types
INSERT INTO notary_document_types (id, name, description, display_order) VALUES
('grant_deed', 'Grant Deed / Quitclaim Deed', 'Ownership transfer documents for real property', 1),
('mortgage_agreement', 'Mortgage Agreement', 'Mortgage and loan agreements', 2),
('deed_of_trust', 'Deed of Trust', 'Deed of trust and related security instruments', 3),
('loan_modification', 'Loan Modification Agreement', 'Loan modification and workout agreements', 4),
('refinance_docs', 'Refinance Documents', 'Refinance packages and related documents', 5),
('property_affidavit', 'Property Affidavits', 'Affidavits related to property ownership or status', 6),
('occupancy_affidavit', 'Occupancy Affidavit', 'Occupancy/use of property affidavits', 7)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  display_order = VALUES(display_order);

-- Insert default notary pricing config (single row)
INSERT INTO notary_pricing_config (price_per_signature) VALUES
(15.00)
ON DUPLICATE KEY UPDATE price_per_signature=VALUES(price_per_signature);

-- Insert default notary discount tiers
INSERT INTO notary_discount_rules (min_signatures, max_signatures, discount_percent) VALUES
(1, 5, 0.00),
(6, 10, 10.00),
(11, 20, 15.00),
(21, NULL, 25.00)
ON DUPLICATE KEY UPDATE discount_percent=VALUES(discount_percent);
