import { NextResponse, NextRequest } from 'next/server';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import { query } from '@/app/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();

    if (!['pending', 'approved', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await query(
      'UPDATE notary_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, params.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update notary request:', error);
    return NextResponse.json({ error: 'Failed to update notary request' }, { status: 500 });
  }
}
