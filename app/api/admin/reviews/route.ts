import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reviews = await query(`
      SELECT r.*, p.name as product_name
      FROM product_reviews r
      LEFT JOIN products p ON r.product_id = p.id
      ORDER BY r.created_at DESC
    `);

    return NextResponse.json({ success: true, reviews: reviews || [] });
  } catch (error: any) {
    console.error('Error fetching admin reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    await query('UPDATE product_reviews SET status = ? WHERE id = ?', [status, id]);

    return NextResponse.json({ success: true, message: 'Review status updated' });
  } catch (error: any) {
    console.error('Error updating review status:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing review ID' }, { status: 400 });
    }

    await query('DELETE FROM product_reviews WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Review deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
