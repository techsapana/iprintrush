import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add template URL columns to the products table
    const sql = `
      ALTER TABLE products 
      ADD COLUMN pdf_template_url TEXT NULL,
      ADD COLUMN ai_template_url TEXT NULL;
    `;

    try {
      await query(sql);
    } catch (e: any) {
      // Ignore if columns already exist
      if (e.code !== 'ER_DUP_FIELDNAME') {
        throw e;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Product template columns added successfully'
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}
