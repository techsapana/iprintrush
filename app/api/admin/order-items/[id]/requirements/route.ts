import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const itemId = params.id;
    if (!itemId) {
      return NextResponse.json({ error: 'Missing order item id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const status = body.status;
    const notes = body.notes;

    if (!['approved', 'rejected', 'pending', 'none'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Use approved/rejected/pending/none.' },
        { status: 400 }
      );
    }

    await query(
      `UPDATE order_items
       SET requirement_status = ?,
           requirement_reviewed_at = ?,
           requirement_review_notes = ?
       WHERE id = ?`,
      [
        status,
        status === 'approved' || status === 'rejected' ? new Date() : null,
        notes != null ? String(notes) : null,
        itemId,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin requirement status update error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update requirement status' },
      { status: 500 }
    );
  }
}

