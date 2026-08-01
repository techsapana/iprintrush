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
