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

    const sql = `
      CREATE TABLE IF NOT EXISTS custom_quotes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        product_category VARCHAR(255) NOT NULL,
        reference_link TEXT,
        brand_model_sku VARCHAR(255),
        specifications TEXT NOT NULL,
        quantity INT NOT NULL,
        preferred_size VARCHAR(255),
        preferred_color VARCHAR(255),
        uploaded_files JSON NULL,
        needs_customization VARCHAR(50) NOT NULL,
        decoration_method VARCHAR(255),
        decoration_location VARCHAR(255),
        decoration_colors VARCHAR(255),
        timing_requirement VARCHAR(100) NOT NULL,
        delivery_method VARCHAR(100) NOT NULL,
        delivery_address TEXT,
        budget_range VARCHAR(255),
        additional_notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await query(sql);

    return NextResponse.json({
      success: true,
      message: 'custom_quotes table created successfully'
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create table'
    }, { status: 500 });
  }
}
