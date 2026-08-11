import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Starting migration for category area-based pricing...');
    
    // Add the new column
    try {
      await query('ALTER TABLE categories ADD COLUMN supports_area_based_pricing BOOLEAN DEFAULT FALSE');
      console.log('Added supports_area_based_pricing column to categories table');
    } catch (e: any) {
      if (e.message.includes('Duplicate column name')) {
        console.log('Column supports_area_based_pricing already exists');
      } else {
        throw e;
      }
    }

    // Enable for the legacy categories + new requested category
    const categoriesToEnable = [
      'Signs & Banners',
      'Marketing Materials',
      'DTF & UV DTF',
      'Labels & Stickers',
      'Promotional and Personalized Product'
    ];
    
    for (const name of categoriesToEnable) {
      await query(
        'UPDATE categories SET supports_area_based_pricing = TRUE WHERE name = ?',
        [name]
      );
    }
    console.log('Enabled area-based pricing for legacy categories');

    return NextResponse.json({
      success: true,
      message: 'Successfully migrated categories for area-based pricing'
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
