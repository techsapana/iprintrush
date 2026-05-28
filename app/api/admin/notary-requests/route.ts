import { NextResponse, NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import { query } from '@/app/lib/db';

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await query(`
      SELECT 
        nr.id,
        nr.request_number,
        nr.customer_name,
        nr.customer_email,
        nr.customer_phone,
        nr.signature_count,
        nr.base_amount,
        nr.discount_percent,
        nr.discount_amount,
        nr.total_amount,
        nr.notes,
        nr.status,
        nr.created_at,
        nr.updated_at,
        GROUP_CONCAT(ndt.name ORDER BY ndt.display_order SEPARATOR ', ') AS document_types
      FROM notary_requests nr
      LEFT JOIN notary_request_documents nrd ON nr.id = nrd.request_id
      LEFT JOIN notary_document_types ndt ON nrd.document_type_id = ndt.id
      GROUP BY nr.id
      ORDER BY nr.created_at DESC
    `);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to fetch notary requests:', error);
    return NextResponse.json({ error: 'Failed to fetch notary requests' }, { status: 500 });
  }
}
