import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  const logs: string[] = [];

  try {
    // 1. Add min_qty and max_qty to product_pool_options
    try {
      await query(`
        ALTER TABLE product_pool_options 
        ADD COLUMN min_qty INT NULL AFTER percentage_value,
        ADD COLUMN max_qty INT NULL AFTER min_qty
      `);
      logs.push('Added min_qty and max_qty to product_pool_options');
    } catch (err: any) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        logs.push('Columns min_qty and max_qty already exist in product_pool_options');
      } else {
        throw err;
      }
    }

    // 2. Add min_qty and max_qty to product_turnaround_options
    try {
      await query(`
        ALTER TABLE product_turnaround_options 
        ADD COLUMN min_qty INT NULL AFTER percentage_value,
        ADD COLUMN max_qty INT NULL AFTER min_qty
      `);
      logs.push('Added min_qty and max_qty to product_turnaround_options');
    } catch (err: any) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        logs.push('Columns min_qty and max_qty already exist in product_turnaround_options');
      } else {
        throw err;
      }
    }

    // 3. (Optional) Check if they exist in global turnaround_options too just in case we need them globally later
    try {
      await query(`
        ALTER TABLE turnaround_options 
        ADD COLUMN min_qty INT NULL AFTER percentage_value,
        ADD COLUMN max_qty INT NULL AFTER min_qty
      `);
      logs.push('Added min_qty and max_qty to turnaround_options (global)');
    } catch (err: any) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        logs.push('Columns min_qty and max_qty already exist in turnaround_options (global)');
      } else {
        // Ignored if global table structure differs, just for future-proofing
      }
    }

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: error.message, logs },
      { status: 500 }
    );
  }
}
