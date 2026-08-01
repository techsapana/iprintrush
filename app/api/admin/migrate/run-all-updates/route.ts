import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET(req: NextRequest) {
  try {
    const results = [];

    // Safe execution helper
    const safeExecute = async (sql: string, description: string) => {
      try {
        await query(sql);
        results.push({ description, status: 'success' });
      } catch (err: any) {
        // If it's a duplicate column error, that's fine
        if (err.code === 'ER_DUP_FIELDNAME') {
          results.push({ description, status: 'already_exists' });
        } else {
          results.push({ description, status: 'error', message: err.message });
        }
      }
    };

    // 1. product_turnaround_options
    await safeExecute(
      "ALTER TABLE product_turnaround_options ADD COLUMN pricing_type VARCHAR(50) DEFAULT 'flat'",
      "Add pricing_type to product_turnaround_options"
    );
    await safeExecute(
      "ALTER TABLE product_turnaround_options ADD COLUMN percentage_value DECIMAL(10,2) DEFAULT NULL",
      "Add percentage_value to product_turnaround_options"
    );

    // 2. turnaround_options
    await safeExecute(
      "ALTER TABLE turnaround_options ADD COLUMN pricing_type VARCHAR(50) DEFAULT 'flat'",
      "Add pricing_type to turnaround_options"
    );
    await safeExecute(
      "ALTER TABLE turnaround_options ADD COLUMN percentage_value DECIMAL(10,2) DEFAULT NULL",
      "Add percentage_value to turnaround_options"
    );

    // 3. product_quantity_tiers
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

    // 4. quantity_tiers
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

    // 5. product_color_options
    await safeExecute(
      "ALTER TABLE product_color_options ADD COLUMN image_url VARCHAR(255) DEFAULT NULL",
      "Add image_url to product_color_options"
    );

    // 6. order_messages (for OrderChat)
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
    // 7. customer_users (missing columns from earlier migrations)
    await safeExecute(
      "ALTER TABLE customer_users ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL AFTER email",
      "Add phone to customer_users"
    );
    await safeExecute(
      "ALTER TABLE customer_users ADD COLUMN IF NOT EXISTS preferences JSON NULL",
      "Add preferences to customer_users"
    );
    await safeExecute(
      "ALTER TABLE customer_users ADD COLUMN IF NOT EXISTS saved_items JSON NULL",
      "Add saved_items to customer_users"
    );
    await safeExecute(
      "ALTER TABLE customer_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
      "Add updated_at to customer_users"
    );

    return NextResponse.json({
      success: true,
      message: 'Migration completed.',
      results
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
