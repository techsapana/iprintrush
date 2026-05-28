-- Add featured column to products
-- Run after schema.sql and other migrations

USE iprintrush;

ALTER TABLE products
ADD COLUMN featured BOOLEAN DEFAULT FALSE
COMMENT 'Show in Featured Products section on home page';
