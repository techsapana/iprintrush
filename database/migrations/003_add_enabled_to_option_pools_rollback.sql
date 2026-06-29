-- Migration Rollback: Remove enabled column from customization_option_pools
-- Version: 003
-- Date: 2026-06-29
-- Description: Rollback enabled column from customization_option_pools table

USE iprintrush;

-- Drop index first
DROP INDEX IF EXISTS idx_enabled ON customization_option_pools;

-- Drop column
ALTER TABLE customization_option_pools
  DROP COLUMN IF EXISTS enabled;

-- Rollback complete
SELECT 'Migration 003 rollback: enabled column removed from customization_option_pools' as message;