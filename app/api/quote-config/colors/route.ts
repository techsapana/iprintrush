// Color Options API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    const colors = await query(
      'SELECT * FROM color_options ORDER BY display_order, name'
    );
    return NextResponse.json({
      colors: colors.map((c: any) => ({
        id: c.id,
        name: c.name,
        hex: c.hex,
        enabled: Boolean(c.enabled),
        displayOrder: c.display_order,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch colors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, hex, enabled = true, displayOrder = 0 } = body;

    const colorId = id || `color-${Date.now()}`;

    await query(
      `INSERT INTO color_options (id, name, hex, enabled, display_order)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         hex = VALUES(hex),
         enabled = VALUES(enabled),
         display_order = VALUES(display_order),
         updated_at = CURRENT_TIMESTAMP`,
      [colorId, name, hex, enabled ? 1 : 0, displayOrder]
    );

    return NextResponse.json({ success: true, id: colorId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save color' },
      { status: 500 }
    );
  }
}
