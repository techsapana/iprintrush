-- Artwork files and custom size notes per order item
-- Run after migration_order_customizations.sql

USE iprintrush;

ALTER TABLE order_items
  ADD COLUMN artwork_files_json JSON NULL,
  ADD COLUMN custom_size_note TEXT NULL;

