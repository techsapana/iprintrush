import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET(req: NextRequest) {
  try {
    const results = [];

    // Safe execution helper — skips if column/table already exists
    const safeExecute = async (sql: string, description: string) => {
      try {
        await query(sql);
        results.push({ description, status: 'success' });
      } catch (err: any) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          results.push({ description, status: 'already_exists' });
        } else {
          results.push({ description, status: 'error', message: err.message });
        }
      }
    };

    // ─────────────────────────────────────────────────────────────────
    // SECTION 1: orders table — all columns required by the application
    // ─────────────────────────────────────────────────────────────────

    await safeExecute(
      "ALTER TABLE orders ADD COLUMN workflow_status ENUM('pending','in_production','proof_pending','proof_approved','artwork_approval_pending','completed','shipped','cancelled','on_hold') NOT NULL DEFAULT 'pending'",
      "Add workflow_status to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN order_type VARCHAR(100) DEFAULT NULL",
      "Add order_type to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN delivery_type ENUM('standard','rush','same_day','after_hours') DEFAULT NULL",
      "Add delivery_type to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN shipping_address_json JSON DEFAULT NULL",
      "Add shipping_address_json to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN billing_address_json JSON DEFAULT NULL",
      "Add billing_address_json to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(255) DEFAULT NULL",
      "Add tracking_number to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN delivery_status ENUM('scheduled','out_for_delivery','delivered','failed') DEFAULT NULL",
      "Add delivery_status to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT NULL",
      "Add payment_method to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "Add discount_amount to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(100) DEFAULT NULL",
      "Add coupon_code to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN production_start_at TIMESTAMP NULL DEFAULT NULL",
      "Add production_start_at to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN production_complete_at TIMESTAMP NULL DEFAULT NULL",
      "Add production_complete_at to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN estimated_completion_at TIMESTAMP NULL DEFAULT NULL",
      "Add estimated_completion_at to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN assigned_staff VARCHAR(255) DEFAULT NULL",
      "Add assigned_staff to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN internal_notes TEXT DEFAULT NULL",
      "Add internal_notes to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN order_notes TEXT DEFAULT NULL",
      "Add order_notes to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN rush_flag TINYINT(1) NOT NULL DEFAULT 0",
      "Add rush_flag to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN shipping_review_required TINYINT(1) NOT NULL DEFAULT 0",
      "Add shipping_review_required to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN customer_hidden TINYINT(1) NOT NULL DEFAULT 0",
      "Add customer_hidden to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(50) DEFAULT NULL",
      "Add customer_phone to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN shipping_carrier VARCHAR(50) DEFAULT NULL",
      "Add shipping_carrier to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN shipping_service VARCHAR(100) DEFAULT NULL",
      "Add shipping_service to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN shipping_service_name VARCHAR(120) DEFAULT NULL",
      "Add shipping_service_name to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN estimated_delivery_date VARCHAR(64) DEFAULT NULL",
      "Add estimated_delivery_date to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN shipping_payload_json JSON DEFAULT NULL",
      "Add shipping_payload_json to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN stripe_checkout_session_id VARCHAR(255) DEFAULT NULL",
      "Add stripe_checkout_session_id to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN stripe_payment_intent_id VARCHAR(255) DEFAULT NULL",
      "Add stripe_payment_intent_id to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN stripe_customer_id VARCHAR(255) DEFAULT NULL",
      "Add stripe_customer_id to orders"
    );
    await safeExecute(
      "ALTER TABLE orders ADD COLUMN paid_at TIMESTAMP NULL DEFAULT NULL",
      "Add paid_at to orders"
    );

    // Add indexes for performance on commonly queried columns
    await safeExecute(
      "ALTER TABLE orders ADD INDEX idx_customer_email (customer_email)",
      "Add index on orders.customer_email"
    );
    await safeExecute(
      "ALTER TABLE orders ADD INDEX idx_workflow_status (workflow_status)",
      "Add index on orders.workflow_status"
    );
    await safeExecute(
      "ALTER TABLE orders ADD INDEX idx_status (status)",
      "Add index on orders.status"
    );

    // ─────────────────────────────────────────────────────────────────
    // SECTION 2: order_items table
    // ─────────────────────────────────────────────────────────────────

    await safeExecute(
      "ALTER TABLE order_items ADD COLUMN customization_json JSON DEFAULT NULL",
      "Add customization_json to order_items"
    );
    await safeExecute(
      "ALTER TABLE order_items ADD COLUMN artwork_files_json JSON DEFAULT NULL",
      "Add artwork_files_json to order_items"
    );
    await safeExecute(
      "ALTER TABLE order_items ADD COLUMN reuploaded_artwork_json JSON DEFAULT NULL",
      "Add reuploaded_artwork_json to order_items"
    );
    await safeExecute(
      "ALTER TABLE order_items ADD COLUMN replacement_artwork_json JSON DEFAULT NULL",
      "Add replacement_artwork_json to order_items"
    );
    await safeExecute(
      "ALTER TABLE order_items ADD COLUMN custom_size_note TEXT DEFAULT NULL",
      "Add custom_size_note to order_items"
    );
    await safeExecute(
      "ALTER TABLE order_items ADD COLUMN requirement_files_json JSON DEFAULT NULL",
      "Add requirement_files_json to order_items"
    );
    await safeExecute(
      "ALTER TABLE order_items ADD COLUMN requirement_status ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none'",
      "Add requirement_status to order_items"
    );
    await safeExecute(
      "ALTER TABLE order_items ADD COLUMN requirement_uploaded_at TIMESTAMP NULL DEFAULT NULL",
      "Add requirement_uploaded_at to order_items"
    );
    await safeExecute(
      "ALTER TABLE order_items ADD COLUMN requirement_reviewed_at TIMESTAMP NULL DEFAULT NULL",
      "Add requirement_reviewed_at to order_items"
    );
    await safeExecute(
      "ALTER TABLE order_items ADD COLUMN requirement_review_notes TEXT DEFAULT NULL",
      "Add requirement_review_notes to order_items"
    );

    // ─────────────────────────────────────────────────────────────────
    // SECTION 3: product_turnaround_options
    // ─────────────────────────────────────────────────────────────────

    await safeExecute(
      "ALTER TABLE product_turnaround_options ADD COLUMN pricing_type VARCHAR(50) DEFAULT 'flat'",
      "Add pricing_type to product_turnaround_options"
    );
    await safeExecute(
      "ALTER TABLE product_turnaround_options ADD COLUMN percentage_value DECIMAL(10,2) DEFAULT NULL",
      "Add percentage_value to product_turnaround_options"
    );

    // ─────────────────────────────────────────────────────────────────
    // SECTION 4: turnaround_options
    // ─────────────────────────────────────────────────────────────────

    await safeExecute(
      "ALTER TABLE turnaround_options ADD COLUMN pricing_type VARCHAR(50) DEFAULT 'flat'",
      "Add pricing_type to turnaround_options"
    );
    await safeExecute(
      "ALTER TABLE turnaround_options ADD COLUMN percentage_value DECIMAL(10,2) DEFAULT NULL",
      "Add percentage_value to turnaround_options"
    );

    // ─────────────────────────────────────────────────────────────────
    // SECTION 5: product_quantity_tiers
    // ─────────────────────────────────────────────────────────────────

    await safeExecute(
      "ALTER TABLE product_quantity_tiers ADD COLUMN discount_type ENUM('NONE', 'PERCENT', 'FIXED') DEFAULT 'NONE'",
      "Add discount_type to product_quantity_tiers"
    );
    await safeExecute(
      "ALTER TABLE product_quantity_tiers ADD COLUMN discount_value DECIMAL(10,2) DEFAULT 0",
      "Add discount_value to product_quantity_tiers"
    );
    await safeExecute(
      "ALTER TABLE product_quantity_tiers ADD COLUMN enabled TINYINT(1) DEFAULT 1",
      "Add enabled to product_quantity_tiers"
    );
    await safeExecute(
      "ALTER TABLE product_quantity_tiers ADD COLUMN display_order INT DEFAULT 0",
      "Add display_order to product_quantity_tiers"
    );

    // ─────────────────────────────────────────────────────────────────
    // SECTION 6: quantity_tiers
    // ─────────────────────────────────────────────────────────────────

    await safeExecute(
      "ALTER TABLE quantity_tiers ADD COLUMN discount_type ENUM('NONE', 'PERCENT', 'FIXED') DEFAULT 'NONE'",
      "Add discount_type to quantity_tiers"
    );
    await safeExecute(
      "ALTER TABLE quantity_tiers ADD COLUMN discount_value DECIMAL(10,2) DEFAULT 0",
      "Add discount_value to quantity_tiers"
    );
    await safeExecute(
      "ALTER TABLE quantity_tiers ADD COLUMN enabled TINYINT(1) DEFAULT 1",
      "Add enabled to quantity_tiers"
    );

    // ─────────────────────────────────────────────────────────────────
    // SECTION 7: product_color_options
    // ─────────────────────────────────────────────────────────────────

    await safeExecute(
      "ALTER TABLE product_color_options ADD COLUMN image_url VARCHAR(255) DEFAULT NULL",
      "Add image_url to product_color_options"
    );

    // ─────────────────────────────────────────────────────────────────
    // SECTION 8: customer_users
    // ─────────────────────────────────────────────────────────────────

    await safeExecute(
      "ALTER TABLE customer_users ADD COLUMN phone VARCHAR(30) NULL AFTER email",
      "Add phone to customer_users"
    );
    await safeExecute(
      "ALTER TABLE customer_users ADD COLUMN preferences JSON NULL",
      "Add preferences to customer_users"
    );
    await safeExecute(
      "ALTER TABLE customer_users ADD COLUMN saved_items JSON NULL",
      "Add saved_items to customer_users"
    );
    await safeExecute(
      "ALTER TABLE customer_users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
      "Add updated_at to customer_users"
    );
    await safeExecute(
      "ALTER TABLE customer_users ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1",
      "Add enabled to customer_users"
    );

    // ─────────────────────────────────────────────────────────────────
    // SECTION 9: order_messages table (for OrderChat)
    // ─────────────────────────────────────────────────────────────────

    await safeExecute(
      `CREATE TABLE IF NOT EXISTS order_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        sender_type ENUM('customer', 'admin', 'system') NOT NULL,
        message TEXT,
        attachment_url VARCHAR(255),
        attachment_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )`,
      "Create order_messages table"
    );

    // ─────────────────────────────────────────────────────────────────
    // SECTION 10: products table extras
    // ─────────────────────────────────────────────────────────────────

    await safeExecute(
      "ALTER TABLE products ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1",
      "Add enabled to products"
    );
    await safeExecute(
      "ALTER TABLE products ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0",
      "Add featured to products"
    );

    // ─────────────────────────────────────────────────────────────────
    // SECTION 11: site_settings auto discounts
    // ─────────────────────────────────────────────────────────────────
    // NOTE: 'announcement_discount_*' refers to the Global Popup discount (legacy name)
    // 'bar_discount_*' refers to the actual top Announcement Bar date-based discount
    await safeExecute(
      "ALTER TABLE site_settings ADD COLUMN announcement_discount_enabled TINYINT(1) NOT NULL DEFAULT 0",
      "Add announcement_discount_enabled to site_settings"
    );
    await safeExecute(
      "ALTER TABLE site_settings ADD COLUMN announcement_discount_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage'",
      "Add announcement_discount_type to site_settings"
    );
    await safeExecute(
      "ALTER TABLE site_settings ADD COLUMN announcement_discount_value DECIMAL(10,2) NOT NULL DEFAULT 0",
      "Add announcement_discount_value to site_settings"
    );
    await safeExecute(
      "ALTER TABLE site_settings ADD COLUMN announcement_discount_condition ENUM('none', 'first_order') NOT NULL DEFAULT 'none'",
      "Add announcement_discount_condition to site_settings"
    );

    // New Announcement Bar Date-based discount columns
    await safeExecute(
      "ALTER TABLE site_settings ADD COLUMN bar_discount_enabled TINYINT(1) NOT NULL DEFAULT 0",
      "Add bar_discount_enabled to site_settings"
    );
    await safeExecute(
      "ALTER TABLE site_settings ADD COLUMN bar_discount_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage'",
      "Add bar_discount_type to site_settings"
    );
    await safeExecute(
      "ALTER TABLE site_settings ADD COLUMN bar_discount_value DECIMAL(10,2) NOT NULL DEFAULT 0",
      "Add bar_discount_value to site_settings"
    );
    await safeExecute(
      "ALTER TABLE site_settings ADD COLUMN bar_discount_start_date DATETIME DEFAULT NULL",
      "Add bar_discount_start_date to site_settings"
    );
    await safeExecute(
      "ALTER TABLE site_settings ADD COLUMN bar_discount_end_date DATETIME DEFAULT NULL",
      "Add bar_discount_end_date to site_settings"
    );

    const summary = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      already_exists: results.filter(r => r.status === 'already_exists').length,
      errors: results.filter(r => r.status === 'error').length,
    };

    return NextResponse.json({
      success: true,
      message: 'Migration completed. All columns are now synced.',
      summary,
      results
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
