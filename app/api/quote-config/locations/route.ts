// Print Location Options API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    const locations = await query(
      'SELECT * FROM print_location_options ORDER BY display_order, name'
    );
    return NextResponse.json({
      locations: locations.map((l: any) => ({
        id: l.id,
        name: l.name,
        priceModifier: parseFloat(l.price_modifier),
        enabled: Boolean(l.enabled),
        displayOrder: l.display_order,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, priceModifier = 0, enabled = true, displayOrder = 0 } = body;

    const locationId = id || `loc-${Date.now()}`;

    await query(
      `INSERT INTO print_location_options (id, name, price_modifier, enabled, display_order)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         price_modifier = VALUES(price_modifier),
         enabled = VALUES(enabled),
         display_order = VALUES(display_order),
         updated_at = CURRENT_TIMESTAMP`,
      [locationId, name, priceModifier, enabled ? 1 : 0, displayOrder]
    );

    return NextResponse.json({ success: true, id: locationId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save location' },
      { status: 500 }
    );
  }
}
