import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const body = await req.json();
    const name = String(body?.name || '').trim();
    const displayOrder = Number.isFinite(Number(body?.displayOrder)) ? Number(body.displayOrder) : 0;

    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }

    await query(
      'UPDATE portfolio_categories SET name = ?, display_order = ? WHERE id = ?',
      [name, displayOrder, id]
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    if (id === '1') {
      return NextResponse.json({ error: 'Cannot delete the default Uncategorized folder.' }, { status: 400 });
    }

    // Set images to Uncategorized (ID 1)
    await query('UPDATE portfolio_images SET category_id = 1 WHERE category_id = ?', [id]);
    await query('DELETE FROM portfolio_categories WHERE id = ?', [id]);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete category' }, { status: 500 });
  }
}
