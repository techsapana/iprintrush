USE iprintrush;

-- Allow optional product shipping + size constraints
ALTER TABLE products
  MODIFY COLUMN weight_lb DECIMAL(10, 3) NULL,
  MODIFY COLUMN package_length_in DECIMAL(10, 2) NULL,
  MODIFY COLUMN package_width_in DECIMAL(10, 2) NULL,
  MODIFY COLUMN package_height_in DECIMAL(10, 2) NULL,
  MODIFY COLUMN min_width_in DECIMAL(10, 2) NULL,
  MODIFY COLUMN max_width_in DECIMAL(10, 2) NULL,
  MODIFY COLUMN min_height_in DECIMAL(10, 2) NULL,
  MODIFY COLUMN max_height_in DECIMAL(10, 2) NULL,
  MODIFY COLUMN min_quantity INT NULL,
  MODIFY COLUMN max_quantity INT NULL;

-- Site-managed visuals
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS promo_banner_image_url VARCHAR(500) NULL AFTER promo_subheadline,
  ADD COLUMN IF NOT EXISTS notary_image_url VARCHAR(500) NULL AFTER promo_banner_image_url,
  ADD COLUMN IF NOT EXISTS mailbox_image_url VARCHAR(500) NULL AFTER notary_image_url;

