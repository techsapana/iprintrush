import { NextResponse } from 'next/server';
import { queryOne, query } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const log: string[] = [];
  let success = true;

  const ensureColumn = async (table: string, column: string, ddl: string) => {
    try {
      const col = await queryOne(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
      if (!col) {
        await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
        log.push(`Added ${column} to ${table}`);
      } else {
        log.push(`Column ${column} already exists in ${table}`);
      }
    } catch (e: any) {
      success = false;
      log.push(`Error adding ${column} to ${table}: ${e.message}`);
    }
  };

  try {
    // 1. turnaround_options
    await ensureColumn('turnaround_options', 'min_width_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('turnaround_options', 'max_width_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('turnaround_options', 'min_height_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('turnaround_options', 'max_height_in', 'DECIMAL(10,2) NULL');

    // 2. product_turnaround_options
    await ensureColumn('product_turnaround_options', 'min_width_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('product_turnaround_options', 'max_width_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('product_turnaround_options', 'min_height_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('product_turnaround_options', 'max_height_in', 'DECIMAL(10,2) NULL');

    // 3. product_pool_options
    await ensureColumn('product_pool_options', 'min_width_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('product_pool_options', 'max_width_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('product_pool_options', 'min_height_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('product_pool_options', 'max_height_in', 'DECIMAL(10,2) NULL');

    // 4. site_settings
    await ensureColumn('site_settings', 'weekend_opening_time', 'VARCHAR(64) NULL');
    await ensureColumn('site_settings', 'weekend_closing_time', 'VARCHAR(64) NULL');

    // 5. orders table ENUM update for workflow_status
    try {
      await query(`ALTER TABLE orders MODIFY COLUMN workflow_status ENUM('pending','in_production','proof_pending','proof_approved','artwork_approval_pending','completed','shipped','cancelled','on_hold','order_review','artwork_pending','artwork_approved','ready_for_pickup','ready_for_shipping') NOT NULL DEFAULT 'order_review'`);
      log.push("Updated orders.workflow_status ENUM to include 'ready_for_pickup'");
    } catch (e: any) {
      log.push(`Error updating workflow_status ENUM: ${e.message}`);
    }

    // 6. product_reviews table
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS product_reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_email VARCHAR(255) NULL,
          rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
          review_text TEXT NOT NULL,
          status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
      `);
      log.push("Ensured product_reviews table exists.");
    } catch (e: any) {
      log.push(`Error creating product_reviews table: ${e.message}`);
    }

  } catch (err: any) {
    success = false;
    log.push(`General Error: ${err.message}`);
  }

  return NextResponse.json({
    success,
    message: success ? 'Migration completed successfully.' : 'Migration completed with errors.',
    log
  });
}
