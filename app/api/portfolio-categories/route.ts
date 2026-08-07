import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows: any = await query(
      'SELECT id, name, display_order, created_at FROM portfolio_categories ORDER BY display_order ASC, id ASC'
    );
    const categories = Array.isArray(rows)
      ? rows.map((r: any) => ({
          id: Number(r.id),
          name: String(r.name || ''),
          displayOrder: Number(r.display_order || 0),
          createdAt: r.created_at || null,
        }))
      : [];
    return NextResponse.json({ categories });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load portfolio categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const displayOrder = Number.isFinite(Number(body?.displayOrder)) ? Number(body.displayOrder) : 0;

    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }

    const result: any = await query(
      'INSERT INTO portfolio_categories (name, display_order) VALUES (?, ?)',
      [name, displayOrder]
    );
    return NextResponse.json({ ok: true, id: result?.insertId || null });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create portfolio category' }, { status: 500 });
  }
}
