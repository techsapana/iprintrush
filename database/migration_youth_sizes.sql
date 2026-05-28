-- Add youth size options for apparel (up to 2XL)
-- Run after schema.sql has created size_options

USE iprintrush;

INSERT INTO size_options (id, label, price_addon, display_order)
VALUES
  ('youth-s', 'Youth S', 0.00, 10),
  ('youth-m', 'Youth M', 0.00, 11),
  ('youth-l', 'Youth L', 0.00, 12),
  ('youth-xl', 'Youth XL', 0.00, 13),
  ('youth-2xl', 'Youth 2XL', 3.00, 14)
ON DUPLICATE KEY UPDATE label = VALUES(label);

