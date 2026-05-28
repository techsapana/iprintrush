-- Order workflow, shipping, and admin fields
-- Run after migration_stripe_orders.sql

USE iprintrush;

ALTER TABLE orders
  ADD COLUMN workflow_status ENUM(
    'pending',
    'in_production',
    'proof_pending',
    'proof_approved',
    'completed',
    'shipped',
    'cancelled',
    'on_hold'
  ) NOT NULL DEFAULT 'pending',
  ADD COLUMN order_type VARCHAR(100) NULL COMMENT 'Banner, Sign, Apparel, Service, etc.',
  ADD COLUMN delivery_type ENUM('standard', 'rush', 'same_day', 'after_hours') NULL,
  ADD COLUMN shipping_address_json JSON NULL,
  ADD COLUMN tracking_number VARCHAR(255) NULL,
  ADD COLUMN delivery_status ENUM('scheduled', 'out_for_delivery', 'delivered', 'failed') NULL,
  ADD COLUMN payment_method VARCHAR(50) NULL,
  ADD COLUMN discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN coupon_code VARCHAR(100) NULL,
  ADD COLUMN production_start_at TIMESTAMP NULL,
  ADD COLUMN production_complete_at TIMESTAMP NULL,
  ADD COLUMN estimated_completion_at TIMESTAMP NULL,
  ADD COLUMN assigned_staff VARCHAR(255) NULL,
  ADD COLUMN internal_notes TEXT NULL,
  ADD COLUMN rush_flag BOOLEAN NOT NULL DEFAULT FALSE;

