-- Add order_notes column to orders table
-- This allows storing customer notes from checkout form

ALTER TABLE orders 
ADD COLUMN order_notes TEXT NULL AFTER billing_address_json;

-- Add index for better search performance on notes
CREATE INDEX idx_order_notes ON orders(order_notes(100));
