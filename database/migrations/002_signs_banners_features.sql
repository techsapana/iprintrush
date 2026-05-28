-- Migration: Add comprehensive Signs & Banners features (38 total features)
-- Version: 002
-- Date: 2026-03-14
-- Description: Add all signs and banners customization options

USE iprintrush;

-- ============================================
-- SIGNS & BANNERS SPECIFIC OPTION POOLS
-- ============================================

-- Size & Colors Options
INSERT INTO customization_option_pools (id, `key`, name, description, selection_type, price_type, display_order) VALUES
('pool-banner-sizes', 'banner_sizes', 'Banner Size', 'Pre-defined and custom banner sizes', 'single', 'per_unit', 1),
('pool-custom-size', 'custom_size', 'Custom Size', 'Custom width and height dimensions', 'dimension', 'per_unit', 2),
('pool-size-limits', 'size_limits', 'Size Limits', 'Minimum and maximum size constraints', 'single', 'per_unit', 3);

-- Quantity Options
INSERT INTO customization_option_pools (id, `key`, name, description, selection_type, price_type, display_order) VALUES
('pool-predefined-qty', 'predefined_quantity', 'Predefined Quantity', 'Standard quantity options', 'single', 'per_unit', 4),
('pool-qty-limits', 'quantity_limits', 'Quantity Limits', 'Minimum and maximum quantity constraints', 'single', 'per_unit', 5);

-- Material & Paper Options
INSERT INTO customization_option_pools (id, `key`, name, description, selection_type, price_type, display_order) VALUES
('pool-banner-materials', 'banner_materials', 'Banner Material', 'Material options for signs and banners', 'single', 'per_unit', 6),
('pool-paper-types-banners', 'paper_types_banners', 'Paper Type', 'Paper stock options for banners', 'single', 'per_unit', 7);

-- Print Options
INSERT INTO customization_option_pools (id, `key`, name, description, selection_type, price_type, display_order) VALUES
('pool-print-side', 'print_side', 'Print Side', 'Single or double sided printing', 'single', 'per_unit', 8),
('pool-print-type', 'print_type', 'Print Type', 'Full color or black only printing', 'single', 'per_unit', 9),
('pool-graphic-type', 'graphic_type', 'Graphic Type', 'Single or double sided graphics', 'single', 'per_unit', 10);

-- Finishing Options
INSERT INTO customization_option_pools (id, `key`, name, description, selection_type, price_type, display_order) VALUES
('pool-mounting-clip', 'mounting_clip', 'Mounting Clip', 'Mounting clip options', 'single', 'per_order', 11),
('pool-hems', 'hems', 'Hems', 'Hemming options for banners', 'single', 'per_order', 12),
('pool-grommets', 'grommets', 'Grommets', 'Grommet placement options', 'single', 'per_order', 13),
('pool-pole-pocket', 'pole_pocket', 'Pole Pocket', 'Pole pocket options', 'single', 'per_order', 14),
('pool-webbing', 'webbing', 'Webbing', 'Webbing and D-ring options', 'single', 'per_order', 15),
('pool-corner-reinforcement', 'corner_reinforcement', 'Corner Reinforcement', 'Corner reinforcement options', 'single', 'per_order', 16),
('pool-rope', 'rope', 'Rope', 'Rope sewing options', 'single', 'per_order', 17),
('pool-wind-slits', 'wind_slits', 'Wind Slits', 'Wind slit options', 'single', 'per_order', 18),
('pool-finishing', 'finishing_banners', 'Finishing', 'Various finishing options', 'single', 'per_order', 19),
('pool-edge-option', 'edge_option', 'Edge Option', 'Edge finishing options', 'single', 'per_order', 20);

-- Display & Hardware Options
INSERT INTO customization_option_pools (id, `key`, name, description, selection_type, price_type, display_order) VALUES
('pool-banner-option', 'banner_option', 'Banner Option', 'Banner with or without hardware', 'single', 'per_order', 21),
('pool-buying-option', 'buying_option', 'Buying Option', 'Complete package options', 'single', 'per_order', 22),
('pool-base', 'base', 'Base', 'Stand base options', 'single', 'per_order', 23),
('pool-display-option', 'display_option', 'Display Option', 'Single or double sided display', 'single', 'per_order', 24),
('pool-display-size', 'display_size', 'Display Size', 'Display height options', 'single', 'per_unit', 25),
('pool-case-podium', 'case_podium', 'Case/Podium', 'Carrying case options', 'single', 'per_order', 26),
('pool-back-side', 'back_side', 'Back Side', 'Back panel options', 'single', 'per_order', 27),
('pool-table-diameter', 'table_diameter', 'Table Diameter', 'Table size options', 'single', 'per_unit', 28);

-- Flag & Pole Options
INSERT INTO customization_option_pools (id, `key`, name, description, selection_type, price_type, display_order) VALUES
('pool-pole-bracket', 'pole_bracket', 'Pole Bracket', 'Pole and bracket options', 'single', 'per_order', 29),
('pool-led-light', 'led_light', 'LED Light', 'LED lighting options', 'single', 'per_order', 30);

-- Insert & Material Options
INSERT INTO customization_option_pools (id, `key`, name, description, selection_type, price_type, display_order) VALUES
('pool-insert', 'insert', 'Insert', 'Insert material options', 'single', 'per_unit', 31),
('pool-acrylic', 'acrylic', 'Acrylic', 'Acrylic material options', 'single', 'per_unit', 32),
('pool-stand-off', 'stand_off', 'Stand Off', 'Stand off mounting options', 'single', 'per_order', 33);

-- Additional Options
INSERT INTO customization_option_pools (id, `key`, name, description, selection_type, price_type, display_order) VALUES
('pool-lamination', 'lamination_banners', 'Lamination', 'Lamination options for banners', 'single', 'per_order', 34),
('pool-color-profile', 'color_profile', 'Color Profile', 'Color printing options', 'single', 'per_unit', 35),
('pool-carrying-bag', 'carrying_bag', 'Carrying Bag', 'Carrying bag options', 'single', 'per_order', 36),
('pool-rider', 'rider', 'Rider', 'Rider sign options', 'single', 'per_order', 37),
('pool-pennant-flag', 'pennant_flag', 'Pennant Flag', 'Pennant flag options', 'single', 'per_order', 38),
('pool-hole-punch', 'hole_punch', 'Hole Punch', 'Hole punch options', 'single', 'per_order', 39),
('pool-frame-color', 'frame_color', 'Frame Color', 'Frame color options', 'single', 'per_unit', 40)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================
-- BANNER SIZE OPTIONS
-- ============================================

INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
-- Pre-defined Sizes
('opt-size-8x11', 'pool-banner-sizes', '8.5" × 11"', '8.5x11', 0, 1),
('opt-size-2x35', 'pool-banner-sizes', '2\' × 3.5"', '2x3.5', 0, 2),
('opt-size-2x4', 'pool-banner-sizes', '2\' × 4\'', '2x4', 0, 3),
('opt-size-2x6', 'pool-banner-sizes', '2\' × 6\'', '2x6', 0, 4),
('opt-size-3x5', 'pool-banner-sizes', '3\' × 5\'', '3x5', 0, 5),
('opt-size-4x6', 'pool-banner-sizes', '4\' × 6\'', '4x6', 0, 6),
('opt-size-4x8', 'pool-banner-sizes', '4\' × 8\'', '4x8', 0, 7),
('opt-size-6x10', 'pool-banner-sizes', '6\' × 10\'', '6x10', 0, 8),
('opt-size-8x10', 'pool-banner-sizes', '8\' × 10\'', '8x10', 0, 9),
('opt-size-custom', 'pool-banner-sizes', 'Custom Size', 'custom', 0, 10)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============================================
-- CUSTOM SIZE OPTIONS
-- ============================================

INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, metadata, display_order) VALUES
('opt-custom-size', 'pool-custom-size', 'Custom Dimensions', 'custom', 0, 
 JSON_OBJECT('minWidth', 8, 'maxWidth', 120, 'minHeight', 8, 'maxHeight', 120, 'unit', 'inches'), 1)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============================================
-- SIZE LIMITS
-- ============================================

INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, metadata, display_order) VALUES
('opt-size-limits', 'pool-size-limits', 'Standard Size Limits', 'standard', 0,
 JSON_OBJECT('minWidth', 8, 'maxWidth', 120, 'minHeight', 8, 'maxHeight', 120, 'unit', 'inches'), 1)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============================================
-- QUANTITY OPTIONS
-- ============================================

INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
-- Predefined Quantity
('opt-qty-1', 'pool-predefined-qty', '1', '1', 0, 1),
('opt-qty-2', 'pool-predefined-qty', '2', '2', 0, 2),
('opt-qty-5', 'pool-predefined-qty', '5', '5', 0, 3),
('opt-qty-10', 'pool-predefined-qty', '10', '10', 0, 4),
('opt-qty-25', 'pool-predefined-qty', '25', '25', 0, 5),
('opt-qty-50', 'pool-predefined-qty', '50', '50', 0, 6),
('opt-qty-100', 'pool-predefined-qty', '100', '100', 0, 7),
('opt-qty-250', 'pool-predefined-qty', '250', '250', 0, 8),
('opt-qty-500', 'pool-predefined-qty', '500', '500', 0, 9),
('opt-qty-1000', 'pool-predefined-qty', '1000', '1000', 0, 10),

-- Quantity Limits
('opt-qty-limits', 'pool-qty-limits', 'Standard Quantity Limits', 'standard', 0, 11)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============================================
-- MATERIAL OPTIONS
-- ============================================

INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
-- Banner Materials
('opt-material-pvc', 'pool-banner-materials', '1/8" Thick White PVC Board', 'pvc-18', 0, 1),
('opt-material-vinyl-13', 'pool-banner-materials', '13 oz Matte Vinyl', 'vinyl-13', 0, 2),
('opt-material-vinyl-gloss', 'pool-banner-materials', '13 oz Gloss Vinyl', 'vinyl-13-gloss', 0, 3),
('opt-material-fabric-9', 'pool-banner-materials', '9 oz Fabric Banner', 'fabric-9', 0, 4),
('opt-material-blockout-18', 'pool-banner-materials', '18 oz Blockout Vinyl', 'blockout-18', 0, 5),
('opt-material-mesh-10', 'pool-banner-materials', '10 oz Mesh Vinyl', 'mesh-10', 0, 6),

-- Paper Types
('opt-paper-100gloss', 'pool-paper-types-banners', '100 lb Gloss', '100gloss', 0, 1),
('opt-paper-80matte', 'pool-paper-types-banners', '80 lb Matte', '80matte', 0, 2),
('opt-paper-100matte', 'pool-paper-types-banners', '100 lb Matte', '100matte', 0, 3),
('opt-paper-others', 'pool-paper-types-banners', 'Other Paper Types', 'others', 0, 4)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============================================
-- PRINT OPTIONS
-- ============================================

INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
-- Print Side
('opt-print-single', 'pool-print-side', 'Single Sided', 'single', 0, 1),
('opt-print-double', 'pool-print-side', 'Double Sided', 'double', 5, 2),

-- Print Type
('opt-print-full-color', 'pool-print-type', 'Full Color', 'full-color', 0, 1),
('opt-print-black', 'pool-print-type', 'Black Only', 'black-only', -3, 2),

-- Graphic Type
('opt-graphic-single', 'pool-graphic-type', 'Single Side Print-Through', 'single-print-through', 0, 1),
('opt-graphic-single-reverse', 'pool-graphic-type', 'Single Side Print-Through (Reverse)', 'single-print-through-reverse', 0, 2),
('opt-graphic-double', 'pool-graphic-type', 'Double Sided', 'double-sided', 5, 3)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============================================
-- FINISHING OPTIONS
-- ============================================

INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
-- Mounting Clip
('opt-clip-yes', 'pool-mounting-clip', 'Yes', 'yes', 2, 1),
('opt-clip-no', 'pool-mounting-clip', 'No', 'no', 0, 2),

-- Hems
('opt-hems-all', 'pool-hems', 'All Sides', 'all-sides', 3, 1),
('opt-hems-none', 'pool-hems', 'No Hem', 'no-hem', 0, 2),

-- Grommets
('opt-grommets-4-corners', 'pool-grommets', '4 Corners Only', '4-corners', 2, 1),
('opt-grommets-every-2ft', 'pool-grommets', 'Every 2\' (Top & Bottom)', 'every-2ft', 5, 2),
('opt-grommets-none', 'pool-grommets', 'No Grommets', 'none', 0, 3),

-- Pole Pocket
('opt-pocket-none', 'pool-pole-pocket', 'No Pole Pocket', 'none', 0, 1),
('opt-pocket-2-top-bottom', 'pool-pole-pocket', '2" Top & Bottom', '2-top-bottom', 2, 2),
('opt-pocket-3-top-bottom', 'pool-pole-pocket', '3" Top & Bottom', '3-top-bottom', 3, 3),
('opt-pocket-2-top-only', 'pool-pole-pocket', '2" Top Only', '2-top-only', 1, 4),

-- Webbing
('opt-webbing-none', 'pool-webbing', 'No Webbing', 'none', 0, 1),
('opt-webbing-1', 'pool-webbing', '1" Webbing', '1-webbing', 3, 2),
('opt-webbing-1-d-rings', 'pool-webbing', '1" Webbing with D-Rings', '1-webbing-d-rings', 5, 3),

-- Corner Reinforcement
('opt-corner-none', 'pool-corner-reinforcement', 'No Reinforced Corners', 'none', 0, 1),
('opt-corner-top', 'pool-corner-reinforcement', 'Reinforce Top Only', 'top-only', 2, 2),
('opt-corner-bottom', 'pool-corner-reinforcement', 'Reinforce Bottom Only', 'bottom-only', 2, 3),
('opt-corner-all', 'pool-corner-reinforcement', 'Reinforce All Sides', 'all-sides', 5, 4),

-- Rope
('opt-rope-none', 'pool-rope', 'No Rope Sewn', 'none', 0, 1),
('opt-rope-3-16-top', 'pool-rope', '3/16" Rope – Top Only', '3-16-top', 3, 2),
('opt-rope-3-16-bottom', 'pool-rope', '3/16" Rope – Bottom Only', '3-16-bottom', 3, 3),
('opt-rope-3-16-both', 'pool-rope', '3/16" Rope – Top & Bottom', '3-16-both', 5, 4),

-- Wind Slits
('opt-wind-none', 'pool-wind-slits', 'No Wind Slits', 'none', 0, 1),
('opt-wind-yes', 'pool-wind-slits', 'Yes (Wind Slits)', 'yes', 2, 2),

-- Finishing
('opt-finishing-hem-grommet-left', 'pool-finishing_banners', 'Hem with Grommet Strip – Left', 'hem-grommet-left', 3, 1),
('opt-finishing-hem-grommet-top', 'pool-finishing_banners', 'Hem with Grommet Strip – Top', 'hem-grommet-top', 3, 2),
('opt-finishing-hem-only', 'pool-finishing_banners', 'Hem Only', 'hem-only', 2, 3),
('opt-finishing-custom-pocket', 'pool-finishing_banners', 'Custom Pole Pocket', 'custom-pocket', 4, 4),

-- Edge Option
('opt-edge-standard', 'pool-edge-option', 'Standard Edge', 'standard', 0, 1)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============================================
-- DISPLAY & HARDWARE OPTIONS
-- ============================================

INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
-- Banner Option
('opt-banner-hardware', 'pool-banner-option', 'Banner + Hardware', 'banner-hardware', 15, 1),
('opt-banner-only', 'pool-banner-option', 'Banner Only', 'banner-only', 0, 2),

-- Buying Option
('opt-buy-flag-pole', 'pool-buying-option', 'Flag + Pole', 'flag-pole', 25, 1),
('opt-buy-flag-only', 'pool-buying-option', 'Flag Only', 'flag-only', 0, 2),
('opt-buy-stand-insert', 'pool-buying-option', 'Stand + Insert', 'stand-insert', 30, 3),
('opt-buy-insert-only', 'pool-buying-option', 'Insert Only', 'insert-only', 0, 4),

-- Base
('opt-base-stake', 'pool-base', 'Ground Stake', 'ground-stake', 5, 1),
('opt-base-cross', 'pool-base', 'Cross Base', 'cross-base', 10, 2),
('opt-base-cross-stake', 'pool-base', 'Cross Base + Ground Stake', 'cross-stake', 15, 3),
('opt-base-cross-water', 'pool-base', 'Cross Base + Water Bag', 'cross-water', 20, 4),
('opt-base-square', 'pool-base', 'Square Base', 'square-base', 12, 5),

-- Display Option
('opt-display-single', 'pool-display-option', 'Single Sided', 'single', 0, 1),
('opt-display-double', 'pool-display-option', 'Double Sided', 'double', 5, 2),

-- Display Size
('opt-display-6ft', 'pool-display-size', '6 ft', '6ft', 0, 1),
('opt-display-8ft', 'pool-display-size', '8 ft', '8ft', 10, 2),
('opt-display-10ft', 'pool-display-size', '10 ft', '10ft', 20, 3),

-- Case/Podium
('opt-case-canvas', 'pool-case-podium', 'Soft Canvas Bag', 'canvas-bag', 15, 1),

-- Back Side
('opt-back-3-open', 'pool-back-side', '3-Sided Open Back', '3-open', 0, 1),
('opt-back-4-closed', 'pool-back-side', '4-Sided Closed Back', '4-closed', 5, 2),

-- Table Diameter
('opt-table-315', 'pool-table-diameter', '31.5" (Overhang 27")', '31.5', 0, 1),
('opt-table-36', 'pool-table-diameter', '36" (Overhang 27")', '36', 5, 2),
('opt-table-48', 'pool-table-diameter', '48" (Overhang 25")', '48', 10, 3),
('opt-table-60', 'pool-table-diameter', '60" (Overhang 19")', '60', 15, 4)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============================================
-- FLAG & POLE OPTIONS
-- ============================================

INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
-- Pole Bracket
('opt-bracket-none', 'pool-pole-bracket', 'No', 'none', 0, 1),
('opt-bracket-pole-only', 'pool-pole-bracket', 'Pole Only', 'pole-only', 15, 2),
('opt-bracket-pole-bracket', 'pool-pole-bracket', 'Pole with Bracket', 'pole-bracket', 25, 3),

-- LED Light
('opt-led-none', 'pool-led-light', 'No Light', 'none', 0, 1),
('opt-led-1', 'pool-led-light', '1 LED Light', '1-led', 10, 2),
('opt-led-2', 'pool-led-light', '2 LED Lights', '2-led', 20, 3)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============================================
-- INSERT & MATERIAL OPTIONS
-- ============================================

INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
-- Insert
('opt-insert-fabric', 'pool-insert', 'UV Printed Fabric', 'uv-fabric', 0, 1),
('opt-insert-matte', 'pool-insert', 'UV Printed Matte Banner', 'uv-matte', 0, 2),

-- Acrylic
('opt-acrylic-14', 'pool-acrylic', '1/4" Plexiglass', '14-plexiglass', 10, 1),

-- Stand Off
('opt-standoff-yes', 'pool-stand-off', 'Yes (Included)', 'yes', 5, 1),
('opt-standoff-no', 'pool-stand-off', 'No', 'no', 0, 2)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============================================
-- ADDITIONAL OPTIONS
-- ============================================

INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, display_order) VALUES
-- Lamination
('opt-lam-yes', 'pool-lamination_banners', 'Yes', 'yes', 3, 1),
('opt-lam-no', 'pool-lamination_banners', 'No', 'no', 0, 2),

-- Color Profile
('opt-color-double', 'pool-color-profile', 'Double Layer Print', 'double-layer', 5, 1),
('opt-color-single', 'pool-color-profile', 'Single Layer', 'single-layer', 0, 2),

-- Carrying Bag
('opt-bag-yes', 'pool-carrying-bag', 'Yes', 'yes', 8, 1),
('opt-bag-no', 'pool-carrying-bag', 'No', 'no', 0, 2),

-- Rider
('opt-rider-yes', 'pool-rider', 'Yes (24" × 6" Rider Sign)', 'yes', 15, 1),
('opt-rider-no', 'pool-rider', 'No', 'no', 0, 2),

-- Pennant Flag
('opt-pennant-yes', 'pool-pennant-flag', 'Yes', 'yes', 10, 1),
('opt-pennant-no', 'pool-pennant-flag', 'No', 'no', 0, 2),

-- Hole Punch
('opt-punch-yes', 'pool-hole-punch', 'Yes', 'yes', 2, 1),
('opt-punch-no', 'pool-hole-punch', 'No', 'no', 0, 2),

-- Frame Color
('opt-frame-white', 'pool-frame-color', 'White', 'white', 0, 1),
('opt-frame-pecan', 'pool-frame-color', 'Pecan', 'pecan', 2, 2),
('opt-frame-black', 'pool-frame-color', 'Black', 'black', 2, 3),
('opt-frame-black-aluminum', 'pool-frame-color', 'Black Aluminum', 'black-aluminum', 5, 4)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============================================
-- UPDATE SIGNS & BANNERS CATEGORY SCHEMA
-- ============================================

UPDATE categories SET customization_schema = JSON_OBJECT(
  'mode', 'print_product',
  'groups', JSON_ARRAY(
    -- Basic Info
    JSON_OBJECT('poolKey', 'banner_sizes', 'label', 'Size', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'custom_size', 'label', 'Custom Size', 'required', FALSE, 'selectionType', 'dimension'),
    JSON_OBJECT('poolKey', 'size_limits', 'label', 'Size Limits', 'required', FALSE, 'selectionType', 'single'),
    
    -- Quantity
    JSON_OBJECT('poolKey', 'predefined_quantity', 'label', 'Quantity', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'quantity_limits', 'label', 'Quantity Limits', 'required', FALSE, 'selectionType', 'single'),
    
    -- Materials
    JSON_OBJECT('poolKey', 'banner_materials', 'label', 'Material', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'paper_types_banners', 'label', 'Paper Type', 'required', FALSE, 'selectionType', 'single'),
    
    -- Print Options
    JSON_OBJECT('poolKey', 'print_side', 'label', 'Print Side', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'print_type', 'label', 'Print Type', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'graphic_type', 'label', 'Graphic Type', 'required', FALSE, 'selectionType', 'single'),
    
    -- Finishing Options
    JSON_OBJECT('poolKey', 'mounting_clip', 'label', 'Mounting Clip', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'hems', 'label', 'Hems', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'grommets', 'label', 'Grommets', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'pole_pocket', 'label', 'Pole Pocket', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'webbing', 'label', 'Webbing', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'corner_reinforcement', 'label', 'Corner Reinforcement', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'rope', 'label', 'Rope', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'wind_slits', 'label', 'Wind Slits', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'finishing_banners', 'label', 'Finishing', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'edge_option', 'label', 'Edge Option', 'required', FALSE, 'selectionType', 'single'),
    
    -- Display & Hardware
    JSON_OBJECT('poolKey', 'banner_option', 'label', 'Banner Option', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'buying_option', 'label', 'Buying Option', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'base', 'label', 'Base', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'display_option', 'label', 'Display Option', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'display_size', 'label', 'Display Size', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'case_podium', 'label', 'Case/Podium', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'back_side', 'label', 'Back Side', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'table_diameter', 'label', 'Table Diameter', 'required', FALSE, 'selectionType', 'single'),
    
    -- Flag & Pole
    JSON_OBJECT('poolKey', 'pole_bracket', 'label', 'Pole Bracket', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'led_light', 'label', 'LED Light', 'required', FALSE, 'selectionType', 'single'),
    
    -- Insert & Materials
    JSON_OBJECT('poolKey', 'insert', 'label', 'Insert', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'acrylic', 'label', 'Acrylic', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'stand_off', 'label', 'Stand Off', 'required', FALSE, 'selectionType', 'single'),
    
    -- Additional Options
    JSON_OBJECT('poolKey', 'lamination_banners', 'label', 'Lamination', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'color_profile', 'label', 'Color Profile', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'carrying_bag', 'label', 'Carrying Bag', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'rider', 'label', 'Rider', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'pennant_flag', 'label', 'Pennant Flag', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'hole_punch', 'label', 'Hole Punch', 'required', FALSE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'frame_color', 'label', 'Frame Color', 'required', FALSE, 'selectionType', 'single'),
    
    -- Standard Options
    JSON_OBJECT('poolKey', 'production_time', 'label', 'Production Time', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'quantity_tiers', 'label', 'Quantity Pricing', 'required', TRUE, 'selectionType', 'quantity', 'useTiers', TRUE),
    JSON_OBJECT('poolKey', 'designer_help', 'label', 'Designer Help', 'required', FALSE, 'selectionType', 'single')
  )
) WHERE id = 'cat-signs';

-- Migration complete
SELECT 'Migration 002: Signs & Banners features (38 total) added successfully' as message;
