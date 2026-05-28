// Decoration Options API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

export async function GET() {
  try {
    const decorations = await query(
      'SELECT * FROM decoration_options ORDER BY display_order, name'
    );
    return NextResponse.json({
      decorations: decorations.map((d: any) => ({
        id: d.id,
        name: d.name,
        priceModifier: parseFloat(d.price_modifier),
        enabled: Boolean(d.enabled),
        displayOrder: d.display_order,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch decorations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, priceModifier = 0, enabled = true, displayOrder = 0 } = body;

    const decorationId = id || `dec-${Date.now()}`;

    await query(
      `INSERT INTO decoration_options (id, name, price_modifier, enabled, display_order)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         price_modifier = VALUES(price_modifier),
         enabled = VALUES(enabled),
         display_order = VALUES(display_order),
         updated_at = CURRENT_TIMESTAMP`,
      [decorationId, name, priceModifier, enabled ? 1 : 0, displayOrder]
    );

    return NextResponse.json({ success: true, id: decorationId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save decoration' },
      { status: 500 }
    );
  }
}
