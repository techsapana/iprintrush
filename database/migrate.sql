-- Master Migration Script
-- Run this script to apply all pending migrations
-- Usage: mysql -u root -p iprintrush < migrate.sql

-- Set SQL mode for better compatibility
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- Migration 001: Add Customer Account Features
-- Adding preferences, saved_items, and updated_at columns to customer_users table

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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_users_updated_at ON customer_users(updated_at);
CREATE INDEX IF NOT EXISTS idx_customer_users_enabled ON customer_users(enabled);
CREATE INDEX IF NOT EXISTS idx_customer_users_email ON customer_users(email);

-- Migration 002: Add enabled column to customization_option_pools (fixes schema sync)
-- This column was missing from the original dynamic customization migration
ALTER TABLE customization_option_pools
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_enabled ON customization_option_pools(enabled);

-- Show migration completion
SELECT 'Migration completed successfully!' as status;
