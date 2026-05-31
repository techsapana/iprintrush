import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const company = String(body?.company || '').trim();
    const quote = String(body?.quote || '').trim();
    const rating = Number.isFinite(Number(body?.rating)) ? Math.max(1, Math.min(5, Number(body.rating))) : 5;
    const imageUrl = body?.imageUrl ? String(body.imageUrl).trim() : null;
    const enabled = body?.enabled !== false;
    const displayOrder = Number.isFinite(Number(body?.displayOrder)) ? Number(body.displayOrder) : 0;

    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!quote) {
      return NextResponse.json({ error: 'Quote is required.' }, { status: 400 });
    }

    await query(
      'UPDATE testimonials SET name = ?, company = ?, quote = ?, rating = ?, image_url = ?, enabled = ?, display_order = ? WHERE id = ?',
      [name, company, quote, rating, imageUrl, enabled, displayOrder, id]
    );
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update testimonial' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(_req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await query('DELETE FROM testimonials WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete testimonial' }, { status: 500 });
  }
}