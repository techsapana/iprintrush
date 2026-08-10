import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results = [];

    // 1. Add out_of_stock to product_color_options
    try {
      await query(`
        ALTER TABLE product_color_options
        ADD COLUMN out_of_stock BOOLEAN NOT NULL DEFAULT FALSE
      `);
      results.push('Added out_of_stock to product_color_options');
    } catch (e: any) {
      if (e.message && e.message.includes('Duplicate column name')) {
        results.push('out_of_stock already exists on product_color_options');
      } else {
        throw e;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema successfully updated for color out of stock feature',
      details: results,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error occurred during migration',
      },
      { status: 500 }
    );
  }
}
