import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Add preferences column
    await query(`
      ALTER TABLE customer_users 
      ADD COLUMN IF NOT EXISTS preferences JSON NULL
    `);

    // Add saved_items column
    await query(`
      ALTER TABLE customer_users 
      ADD COLUMN IF NOT EXISTS saved_items JSON NULL
    `);

    // Add updated_at column if it doesn't exist
    await query(`
      ALTER TABLE customer_users 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'Customer table migration completed successfully' 
    });
  } catch (err: any) {
    console.error('Migration error:', err);
    return NextResponse.json({ 
      error: err?.message || 'Migration failed' 
    }, { status: 500 });
  }
}
