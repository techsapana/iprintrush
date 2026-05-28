// Designer Help Options API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    const designerHelp = await query(
      'SELECT * FROM designer_help_options ORDER BY display_order, name'
    );
    return NextResponse.json({
      designerHelp: designerHelp.map((d: any) => ({
        id: d.id,
        name: d.name,
        priceModifier: parseFloat(d.price_modifier),
        enabled: Boolean(d.enabled),
        displayOrder: d.display_order,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch designer help' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, priceModifier = 0, enabled = true, displayOrder = 0 } = body;

    const designerId = id || `designer-${Date.now()}`;

    await query(
      `INSERT INTO designer_help_options (id, name, price_modifier, enabled, display_order)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         price_modifier = VALUES(price_modifier),
         enabled = VALUES(enabled),
         display_order = VALUES(display_order),
         updated_at = CURRENT_TIMESTAMP`,
      [designerId, name, priceModifier, enabled ? 1 : 0, displayOrder]
    );

    return NextResponse.json({ success: true, id: designerId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save designer help' },
      { status: 500 }
    );
  }
}
