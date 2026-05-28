-- Add delivery_method column to orders table
-- This allows storing customer's preferred delivery method (pickup or shipping)

ALTER TABLE orders 
ADD COLUMN delivery_method VARCHAR(20) NOT NULL DEFAULT 'pickup' AFTER order_notes;

-- Add index for better query performance on delivery method
CREATE INDEX idx_delivery_method ON orders(delivery_method);
