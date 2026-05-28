import { NextResponse, NextRequest } from 'next/server';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';
import { query } from '@/app/lib/db';

export async function GET(req: NextRequest) {
  try {
    const customer = getCustomerFromRequest(req);
    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await query(
      `SELECT 
        nr.id,
        nr.request_number,
        nr.signature_count,
        nr.total_amount,
        nr.notes,
        nr.status,
        nr.created_at,
        nr.updated_at,
        GROUP_CONCAT(ndt.name ORDER BY ndt.display_order SEPARATOR ', ') AS document_types
      FROM notary_requests nr
      LEFT JOIN notary_request_documents nrd ON nr.id = nrd.request_id
      LEFT JOIN notary_document_types ndt ON nrd.document_type_id = ndt.id
      WHERE nr.customer_email = ?
      GROUP BY nr.id
      ORDER BY nr.created_at DESC`,
      [customer.email]
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to fetch customer notary requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}
