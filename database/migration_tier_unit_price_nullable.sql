-- Migration: Make unit_price nullable in quantity tier tables
-- Supports discount-only tier model (NO unit_price required)

USE iprintrush;

-- Make unit_price nullable in global quantity_tiers
ALTER TABLE quantity_tiers
MODIFY unit_price DECIMAL(10,2) NULL;

-- Make unit_price nullable in product-specific quantity_tiers
ALTER TABLE product_quantity_tiers
MODIFY unit_price DECIMAL(10,2) NULL;

-- Make unit_price nullable in customization pool quantity tiers
ALTER TABLE customization_quantity_tiers
MODIFY unit_price DECIMAL(10,2) NULL;

-- Make unit_price nullable in product pool quantity tiers
ALTER TABLE product_pool_quantity_tiers
MODIFY unit_price DECIMAL(10,2) NULL;