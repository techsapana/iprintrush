-- Migration Rollback: Remove Customer Account Features
-- Version: 001
-- Date: 2026-03-12
-- Description: Rollback customer account features (remove preferences, saved_items columns)

-- Drop indexes first
DROP INDEX IF EXISTS idx_customer_users_updated_at ON customer_users;
DROP INDEX IF EXISTS idx_customer_users_enabled ON customer_users;
DROP INDEX IF EXISTS idx_customer_users_email ON customer_users;

-- Remove columns (Note: This will lose all preference and saved items data)
ALTER TABLE customer_users 
DROP COLUMN IF EXISTS preferences;

ALTER TABLE customer_users 
DROP COLUMN IF EXISTS saved_items;

ALTER TABLE customer_users 
DROP COLUMN IF EXISTS updated_at;

-- Rollback complete
SELECT 'Migration 001 rollback: Customer features removed successfully' as message;
