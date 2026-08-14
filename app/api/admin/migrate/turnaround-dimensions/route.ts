import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  const logs: string[] = [];
  try {
    // 1. Add min_width_in, max_width_in, min_height_in, max_height_in to product_turnaround_options
    try {
      await query(`
        ALTER TABLE product_turnaround_options 
        ADD COLUMN min_width_in DECIMAL(10,2) NULL AFTER max_qty,
        ADD COLUMN max_width_in DECIMAL(10,2) NULL AFTER min_width_in,
        ADD COLUMN min_height_in DECIMAL(10,2) NULL AFTER max_width_in,
        ADD COLUMN max_height_in DECIMAL(10,2) NULL AFTER min_height_in
      `);
      logs.push('Added dimension limit columns to product_turnaround_options');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        logs.push('Dimension limit columns already exist in product_turnaround_options');
      } else {
        throw e;
      }
    }

    // 2. Add min_width_in, max_width_in, min_height_in, max_height_in to turnaround_options
    try {
      await query(`
        ALTER TABLE turnaround_options 
        ADD COLUMN min_width_in DECIMAL(10,2) NULL AFTER max_qty,
        ADD COLUMN max_width_in DECIMAL(10,2) NULL AFTER min_width_in,
        ADD COLUMN min_height_in DECIMAL(10,2) NULL AFTER max_width_in,
        ADD COLUMN max_height_in DECIMAL(10,2) NULL AFTER min_height_in
      `);
      logs.push('Added dimension limit columns to turnaround_options (global)');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        logs.push('Dimension limit columns already exist in turnaround_options (global)');
      } else {
        throw e;
      }
    }

    // 3. Add dimension limit columns to product_pool_options
    try {
      await query(`
        ALTER TABLE product_pool_options 
        ADD COLUMN min_width_in DECIMAL(10,2) NULL AFTER max_qty,
        ADD COLUMN max_width_in DECIMAL(10,2) NULL AFTER min_width_in,
        ADD COLUMN min_height_in DECIMAL(10,2) NULL AFTER max_width_in,
        ADD COLUMN max_height_in DECIMAL(10,2) NULL AFTER min_height_in
      `);
      logs.push('Added dimension limit columns to product_pool_options');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        logs.push('Dimension limit columns already exist in product_pool_options');
      } else {
        throw e;
      }
    }

    // 4. Add dimension limit columns to customization_pool_options
    try {
      await query(`
        ALTER TABLE customization_pool_options 
        ADD COLUMN min_width_in DECIMAL(10,2) NULL AFTER price_modifier,
        ADD COLUMN max_width_in DECIMAL(10,2) NULL AFTER min_width_in,
        ADD COLUMN min_height_in DECIMAL(10,2) NULL AFTER max_width_in,
        ADD COLUMN max_height_in DECIMAL(10,2) NULL AFTER min_height_in
      `);
      logs.push('Added dimension limit columns to customization_pool_options');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        logs.push('Dimension limit columns already exist in customization_pool_options');
      } else {
        throw e;
      }
    }

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ success: false, error: error.message, logs }, { status: 500 });
  }
}
