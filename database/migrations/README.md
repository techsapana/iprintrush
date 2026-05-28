# Database Migrations

This directory contains SQL migration files for the iPrintRush application database.

## Migration Files

### 001_add_customer_features.sql
**Purpose**: Add customer account management features
**Features Added**:
- `preferences` (JSON) - Communication preferences storage
- `saved_items` (JSON) - Saved product IDs array
- `updated_at` (TIMESTAMP) - Last update timestamp
- Performance indexes for better query performance

### 001_add_customer_features_rollback.sql
**Purpose**: Rollback migration 001
**Warning**: This will delete all preference and saved items data

## Usage

### Apply All Migrations
```bash
mysql -u root -p iprintrush < database/migrate.sql
```

### Apply Single Migration
```bash
mysql -u root -p iprintrush < database/migrations/001_add_customer_features.sql
```

### Rollback Migration
```bash
mysql -u root -p iprintrush < database/migrations/001_add_customer_features_rollback.sql
```

## Database Schema Changes

### customer_users table additions:

```sql
-- Communication preferences JSON structure
{
  "promotions": true|false,
  "specialOffer": true|false, 
  "siteUpdate": true|false,
  "survey": true|false
}

-- Saved items JSON structure
["product_id_1", "product_id_2", "product_id_3"]
```

## API Endpoints Affected

These migrations enable the following API endpoints:

- `/api/customer/change-password` - Password management
- `/api/customer/preferences` - Communication preferences
- `/api/customer/saved-items` - Product saved items
- `/api/admin/users` - Admin user management

## Notes

- All JSON columns are nullable to maintain backward compatibility
- Indexes added for improved query performance
- Migration uses `IF NOT EXISTS` for safe re-running
- Updated_at column automatically updates on any row change
