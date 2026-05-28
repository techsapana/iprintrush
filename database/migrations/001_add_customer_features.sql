-- Migration: Add Customer Account Features
-- Version: 001
-- Date: 2026-03-12
-- Description: Add preferences, saved_items, and updated_at columns to customer_users table

-- Add preferences column for communication preferences
ALTER TABLE customer_users 
ADD COLUMN IF NOT EXISTS preferences JSON NULL 
COMMENT 'Communication preferences: {promotions, specialOffer, siteUpdate, survey}';

-- Add saved_items column for product wishlist
ALTER TABLE customer_users 
ADD COLUMN IF NOT EXISTS saved_items JSON NULL 
COMMENT 'Array of saved product IDs';

-- Add updated_at column for tracking modifications
ALTER TABLE customer_users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
COMMENT 'Last update timestamp';

-- Create index for better query performance on updated_at
CREATE INDEX IF NOT EXISTS idx_customer_users_updated_at ON customer_users(updated_at);

-- Create index for better query performance on enabled status
CREATE INDEX IF NOT EXISTS idx_customer_users_enabled ON customer_users(enabled);

-- Create index for better query performance on email
CREATE INDEX IF NOT EXISTS idx_customer_users_email ON customer_users(email);

-- Migration complete
SELECT 'Migration 001: Customer features added successfully' as message;
