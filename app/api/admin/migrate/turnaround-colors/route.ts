import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results = [];

    // 1. Add allowed_colors_json to product_turnaround_options
    try {
      await query(`
        ALTER TABLE product_turnaround_options
        ADD COLUMN allowed_colors_json JSON DEFAULT NULL
      `);
      results.push('Added allowed_colors_json to product_turnaround_options');
    } catch (e: any) {
      if (e.message && e.message.includes('Duplicate column name')) {
        results.push('allowed_colors_json already exists on product_turnaround_options');
      } else {
        throw e;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema successfully updated for turnaround color restrictions',
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
