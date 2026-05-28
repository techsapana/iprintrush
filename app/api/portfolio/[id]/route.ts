import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const label = String(body?.label || '').trim();
    const imageUrl = String(body?.imageUrl || '').trim();
    const displayOrder = Number.isFinite(Number(body?.displayOrder)) ? Number(body.displayOrder) : 0;

    if (!label) {
      return NextResponse.json({ error: 'Label is required.' }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
    }

    await query(
      'UPDATE portfolio_images SET label = ?, image_url = ?, display_order = ? WHERE id = ?',
      [label, imageUrl, displayOrder, id]
    );
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update portfolio item' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await query('DELETE FROM portfolio_images WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete portfolio item' }, { status: 500 });
  }
}

