-- Add homepage promo banner texts (dynamic)
ALTER TABLE site_settings
  ADD COLUMN promo_headline VARCHAR(255) NULL AFTER tax_rate_percent,
  ADD COLUMN promo_subheadline VARCHAR(255) NULL AFTER promo_headline;

