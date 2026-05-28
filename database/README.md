# Database Setup Guide

## MySQL Database Setup

This project uses MySQL for all dynamic data storage. Follow these steps to set up the database:

### 1. Install MySQL

Make sure MySQL is installed and running on your system.

### 2. Create Database and Tables

Run the schema file to create all necessary tables:

```bash
mysql -u root -p < database/schema.sql
```

Or if you prefer to run it manually:

```bash
mysql -u root -p
```

Then execute:

```sql
SOURCE database/schema.sql;
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory with your database credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=iprintrush

# Stripe (required for checkout)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Install Dependencies

Make sure mysql2 is installed:

```bash
pnpm install
# or
npm install
```

### 5. Verify Connection

Start your Next.js development server:

```bash
pnpm dev
```

The application will automatically connect to the database when API routes are called.

## Stripe Setup (Payments)

This project uses **Stripe Checkout**.

1. Install deps:

```bash
npm install
```

2. Run the Stripe orders migration (after `database/schema.sql`):

```bash
mysql -u root -p < database/migration_stripe_orders.sql
```

2b. (Optional) If you upgraded an existing database and want old/new price display:

```bash
mysql -u root -p < database/migration_old_price.sql
```

3. Start the dev server:

```bash
npm run dev
```

4. Forward Stripe webhooks to your local app (Stripe CLI):

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Copy the printed signing secret into `STRIPE_WEBHOOK_SECRET`.

## Database Schema Overview

The database includes the following main tables:

- **products** - Product catalog
- **categories** - Product categories
- **decoration_options** - Decoration types (DTF, Screen Print, Embroidery)
- **color_options** - Available colors
- **size_options** - Size options with price addons
- **quantity_tiers** - Quantity-based pricing tiers
- **print_location_options** - Print locations (Front, Back, Sleeve)
- **turnaround_options** - Turnaround time options
- **designer_help_options** - Designer help tiers
- **shipping_config** - Shipping configuration
- **shipping_rules** - Shipping rules (flat, state-based, zip-based)
- **product_quote_settings** - Per-product quote configuration
- **quotes** - Generated quotes/orders
- **admin_users** - Admin user accounts

## Default Admin Credentials

- Email: `admin@iprintrush.com`
- Password: `admin123`

**Note:** Change the default password in production!

## API Endpoints

All data is now fetched from MySQL-backed API endpoints:

- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `GET /api/products/[id]` - Get single product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `GET /api/quote-config/global` - Get global quote configuration
- `GET /api/quote-config/[productId]` - Get product-specific quote settings
- `POST /api/quote/calculate` - Calculate quote

## Migration from localStorage

The system has been migrated from localStorage to MySQL. All product and category data is now stored in the database and managed through the admin panel.
