USE iprintrush;

ALTER TABLE shipping_config
  ADD COLUMN IF NOT EXISTS oversized_width_threshold_in DECIMAL(10,2) NOT NULL DEFAULT 44.00;

UPDATE shipping_config
SET oversized_width_threshold_in = 44.00
WHERE id = 1;
