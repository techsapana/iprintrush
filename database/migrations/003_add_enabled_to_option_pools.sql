-- Migration: Add enabled column to customization_option_pools
-- Version: 003
-- Date: 2026-06-29
-- Description: Add missing enabled column to customization_option_pools table (schema sync)

USE iprintrush;

ALTER TABLE customization_option_pools
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_enabled ON customization_option_pools(enabled);

-- Migration complete
SELECT 'Migration 003: enabled column added to customization_option_pools successfully' as message;