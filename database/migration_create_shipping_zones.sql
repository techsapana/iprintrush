-- ============================================
-- Local Delivery Zone System Tables
-- ============================================

-- Shipping zones (admin-managed delivery areas)
CREATE TABLE IF NOT EXISTS shipping_zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_name VARCHAR(255) NOT NULL COMMENT 'Admin-visible display name (never shown to customers)',
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Delivery fee charged when subtotal < free delivery minimum',
    free_delivery_minimum DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Subtotal threshold for free delivery (0 = no free delivery)',
    enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether this zone is active',
    same_day_delivery BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether same-day delivery is offered in this zone',
    cutoff_time TIME NULL COMMENT 'Order cutoff for same-day delivery (e.g., 14:00:00)',
    delivery_window VARCHAR(255) NULL COMMENT 'Human-readable delivery window (e.g., "2-4 PM")',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enabled (enabled),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shipping zone ZIP codes (each zone covers many ZIPs; each ZIP belongs to at most one zone)
CREATE TABLE IF NOT EXISTS shipping_zone_zips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_id INT NOT NULL COMMENT 'FK to shipping_zones.id',
    zip_code VARCHAR(10) NOT NULL COMMENT '5-digit ZIP code (exact match only)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES shipping_zones(id) ON DELETE CASCADE,
    UNIQUE KEY idx_zip_code (zip_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
