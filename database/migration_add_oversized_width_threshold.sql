USE iprintrush;

ALTER TABLE shipping_config
  ADD COLUMN IF NOT EXISTS oversized_width_threshold_in DECIMAL(10,2) NOT NULL DEFAULT 44.00,
  ADD COLUMN IF NOT EXISTS oversized_weight_threshold_lb DECIMAL(10,3) NOT NULL DEFAULT 0.00;

UPDATE shipping_config
SET oversized_width_threshold_in = 44.00,
    oversized_weight_threshold_lb = 0.00
WHERE id = 1 OR oversized_width_threshold_in IS NULL;
