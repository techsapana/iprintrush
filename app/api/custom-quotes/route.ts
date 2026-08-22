import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Submit a new quote request
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate required fields based on our schema
    const requiredFields = ['full_name', 'email', 'phone', 'product_category', 'specifications', 'quantity', 'needs_customization', 'timing_requirement', 'delivery_method'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const uploadedFilesJson = data.uploaded_files && data.uploaded_files.length > 0 
      ? JSON.stringify(data.uploaded_files) 
      : null;

    const sql = `
      INSERT INTO custom_quotes (
        full_name, company, email, phone,
        product_category, reference_link, brand_model_sku, specifications, quantity, preferred_size, preferred_color, uploaded_files,
        needs_customization, decoration_method, decoration_location, decoration_colors,
        timing_requirement, delivery_method, delivery_address,
        budget_range, additional_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.full_name,
      data.company || null,
      data.email,
      data.phone,
      data.product_category,
      data.reference_link || null,
      data.brand_model_sku || null,
      data.specifications,
      data.quantity,
      data.preferred_size || null,
      data.preferred_color || null,
      uploadedFilesJson,
      data.needs_customization,
      data.decoration_method || null,
      data.decoration_location || null,
      data.decoration_colors || null,
      data.timing_requirement,
      data.delivery_method,
      data.delivery_address || null,
      data.budget_range || null,
      data.additional_notes || null
    ];

    await query(sql, values);

    return NextResponse.json({ success: true, message: 'Quote request submitted successfully' });
  } catch (error: any) {
    console.error('Submit quote request error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit quote request' }, { status: 500 });
  }
}

// Fetch all quote requests (Admin only)
export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = `SELECT * FROM custom_quotes ORDER BY created_at DESC`;
    const results = await query(sql);

    return NextResponse.json({ success: true, quotes: results || [] });
  } catch (error: any) {
    console.error('Fetch quotes error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch quotes' }, { status: 500 });
  }
}
