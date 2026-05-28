-- Add customization storage to order_items
-- Run after migration_stripe_orders.sql

USE iprintrush;

ALTER TABLE order_items
ADD COLUMN customization_json JSON NULL
COMMENT 'Quote selections, line items, and human-readable customizations';
