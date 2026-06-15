USE iprintrush;

ALTER TABLE shipping_config
  ADD COLUMN IF NOT EXISTS under_100_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS between_100_199_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS over_200_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- seed default values
UPDATE shipping_config
SET under_100_rate = 12.99,

    between_100_199_rate = 9.99,
    over_200_rate = 0.00
WHERE id = 1; 


