-- Business Categories Table
CREATE TABLE IF NOT EXISTS business_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(10) DEFAULT '📋',
    display_order INT DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enabled (enabled),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Business Category Products (many-to-many relationship)
CREATE TABLE IF NOT EXISTS business_category_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_category_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_category_id) REFERENCES business_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_category_product (business_category_id, product_id),
    INDEX idx_category (business_category_id),
    INDEX idx_product (product_id),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default business categories
INSERT INTO business_categories (id, name, description, icon, display_order) VALUES
('restaurant', 'Restaurants & Cafes', 'Menus, flyers, signage, and promotional materials', '🍽️', 1),
('realestate', 'Real Estate', 'Property postcards, business cards, and signage', '🏠', 2),
('sports', 'Sports Clubs', 'Team apparel, banners, and event materials', '⚽', 3),
('salon', 'Salons & Spas', 'Business cards, flyers, and appointment reminders', '💇', 4),
('retail', 'Retail Stores', 'Point-of-sale materials, labels, and packaging', '🛍️', 5),
('events', 'Event Planning', 'Invitations, signage, and promotional materials', '🎉', 6)
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), icon=VALUES(icon), display_order=VALUES(display_order);
