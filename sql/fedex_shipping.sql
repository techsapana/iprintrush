-- FedEx checkout: product package type + order delivery estimate
ALTER TABLE products
  ADD COLUMN package_type VARCHAR(64) NOT NULL DEFAULT 'YOUR_PACKAGING' AFTER package_height_in;

ALTER TABLE orders
  ADD COLUMN shipping_service_name VARCHAR(120) NULL AFTER shipping_service,
  ADD COLUMN estimated_delivery_date VARCHAR(64) NULL AFTER shipping_service_name;
