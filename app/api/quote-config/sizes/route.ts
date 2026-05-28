// Size Options API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    const sizes = await query(
      'SELECT * FROM size_options ORDER BY display_order, label'
    );
    return NextResponse.json({
      sizes: sizes.map((s: any) => ({
        id: s.id,
        label: s.label,
        priceAddon: parseFloat(s.price_addon),
        baseEnabled: Boolean(s.base_enabled),
        displayOrder: s.display_order,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sizes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, label, priceAddon = 0, baseEnabled = true, displayOrder = 0 } = body;

    const sizeId = id || `size-${Date.now()}`;

    await query(
      `INSERT INTO size_options (id, label, price_addon, base_enabled, display_order)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         label = VALUES(label),
         price_addon = VALUES(price_addon),
         base_enabled = VALUES(base_enabled),
         display_order = VALUES(display_order),
         updated_at = CURRENT_TIMESTAMP`,
      [sizeId, label, priceAddon, baseEnabled ? 1 : 0, displayOrder]
    );

    return NextResponse.json({ success: true, id: sizeId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save size' },
      { status: 500 }
    );
  }
}
