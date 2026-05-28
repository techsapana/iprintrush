USE iprintrush;

ALTER TABLE product_quote_settings
  ADD COLUMN IF NOT EXISTS disabled_pool_ids_json JSON NULL AFTER use_custom_quantity_tiers;

