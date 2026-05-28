# Dynamic Product Customization System

This document describes the dynamic, category-driven customization system for iPrintRush.

## Overview

- **Custom Apparels**: Uses the existing apparel flow (decoration, color, sizes, print locations, turnaround, designer help). No changes needed.
- **Other Categories** (Marketing Materials, Signs & Banners, Labels & Stickers, DTF, etc.): Use a schema-driven dynamic system where each category defines which option groups to show.

## Setup

1. **Run the migration** to add the new tables and seed data:

   ```bash
   mysql -u root -p iprintrush < database/migration_dynamic_customization.sql
   ```

   Or run the SQL file in your MySQL client.

2. **Categories** will be updated with `customization_schema`:
   - `cat-apparels`: `{"mode":"apparel"}` - uses existing flow
   - `cat-marketing`, `cat-signs`, `cat-labels`, `cat-dtf`: `{"mode":"print_product","groups":[...]}` - dynamic

## Option Pools

Global option pools are seeded with options from the Sameday Print & Services spec:

| Pool Key | Description | Options |
|----------|-------------|---------|
| `print_sizes` | Standard dimensions | 5.5x8.5, 8.5x11, 11x17, 4x6, 5x7, 3.5x2, etc. |
| `paper_types` | Paper stock | 100lb matte/gloss, 14pt/16pt cardstock, 24lb white, vinyl, fabric, etc. |
| `binding` | Binding options | Saddle stitched, Plastic spiral |
| `folding` | Brochure folding | Half fold, Z-fold, Tri-fold |
| `printing_style` | Color/B&W | Color front only, Color both sides, B&W, etc. |
| `production_time` | Turnaround | Same day, Urgent, Next day, 5-7 days, etc. |
| `lamination` | Lamination | None, Matte, Gloss |
| `quantity_tiers` | Quantity pricing | Tiered by quantity (1-24, 25-99, 100+, etc.) |

## Adding Product-Specific Options

Products can override which options from each pool are available:

- **product_pool_options**: Links product to specific pool options with optional custom prices
- **product_pool_quantity_tiers**: Custom quantity tiers for a product

## Extending

To add a new option pool:

1. Insert into `customization_option_pools` (id, key, name, selection_type, price_type)
2. Insert options into `customization_pool_options`
3. Add the pool to a category's `customization_schema.groups` in the database

Example for a new "Catalog" product type:

```sql
UPDATE categories SET customization_schema = JSON_SET(
  customization_schema,
  '$.groups',
  JSON_ARRAY(
    JSON_OBJECT('poolKey', 'print_sizes', 'label', 'Size', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'paper_types', 'label', 'Cover Paper', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'binding', 'label', 'Binding', 'required', TRUE, 'selectionType', 'single'),
    JSON_OBJECT('poolKey', 'quantity_tiers', 'label', 'Quantity', 'required', TRUE, 'selectionType', 'quantity', 'useTiers', TRUE),
    JSON_OBJECT('poolKey', 'production_time', 'label', 'Production Time', 'required', TRUE, 'selectionType', 'single')
  )
) WHERE id = 'cat-your-category';
```
