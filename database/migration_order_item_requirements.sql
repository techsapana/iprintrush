-- Requirement file upload + approval workflow per order item
-- Run after migration_order_item_artwork.sql

USE iprintrush;

ALTER TABLE order_items
  ADD COLUMN requirement_files_json JSON NULL,
  ADD COLUMN requirement_status ENUM('none', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'none',
  ADD COLUMN requirement_uploaded_at TIMESTAMP NULL,
  ADD COLUMN requirement_reviewed_at TIMESTAMP NULL,
  ADD COLUMN requirement_review_notes TEXT NULL;

