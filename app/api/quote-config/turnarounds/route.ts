// Turnaround Options API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    const turnarounds = await query(
      'SELECT * FROM turnaround_options ORDER BY display_order, name'
    );
    return NextResponse.json({
      turnarounds: turnarounds.map((t: any) => ({
        id: t.id,
        name: t.name,
        priceModifier: parseFloat(t.price_modifier),
        enabled: Boolean(t.enabled),
        displayOrder: t.display_order,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch turnarounds' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, priceModifier = 0, enabled = true, displayOrder = 0 } = body;

    const turnaroundId = id || `turn-${Date.now()}`;

    await query(
      `INSERT INTO turnaround_options (id, name, price_modifier, enabled, display_order)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         price_modifier = VALUES(price_modifier),
         enabled = VALUES(enabled),
         display_order = VALUES(display_order),
         updated_at = CURRENT_TIMESTAMP`,
      [turnaroundId, name, priceModifier, enabled ? 1 : 0, displayOrder]
    );

    return NextResponse.json({ success: true, id: turnaroundId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save turnaround' },
      { status: 500 }
    );
  }
}
