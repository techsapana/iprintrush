import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    const rows: any = await query(
      'SELECT id, label, image_url, display_order, created_at FROM portfolio_images ORDER BY display_order ASC, id DESC'
    );
    const items = Array.isArray(rows)
      ? rows.map((r: any) => ({
          id: Number(r.id),
          label: String(r.label || ''),
          imageUrl: String(r.image_url || ''),
          displayOrder: Number(r.display_order || 0),
          createdAt: r.created_at || null,
        }))
      : [];
    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load portfolio' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const result: any = await query(
      'INSERT INTO portfolio_images (label, image_url, display_order) VALUES (?, ?, ?)',
      [label, imageUrl, displayOrder]
    );
    return NextResponse.json({ ok: true, id: result?.insertId || null });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create portfolio item' }, { status: 500 });
  }
}

