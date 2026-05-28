// Quantity Tiers API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    const tiers = await query(
      'SELECT * FROM quantity_tiers ORDER BY display_order, min_qty'
    );
    return NextResponse.json({
      tiers: tiers.map((t: any) => ({
        id: t.id.toString(),
        minQty: t.min_qty,
        maxQty: t.max_qty,
        unitPrice: parseFloat(t.unit_price),
        discountPercent: t.discount_percent != null ? parseFloat(t.discount_percent) : 0,
        enabled: Boolean(t.enabled),
        displayOrder: t.display_order,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tiers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { minQty, maxQty, unitPrice, discountPercent = 0, enabled = true, displayOrder = 0 } = body;
    const discount = Number(discountPercent);

    const result = await query(
      `INSERT INTO quantity_tiers (min_qty, max_qty, unit_price, discount_percent, enabled, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        minQty,
        maxQty || null,
        unitPrice,
        Number.isFinite(discount) ? discount : 0,
        enabled ? 1 : 0,
        displayOrder,
      ],
    );

    return NextResponse.json({ success: true, id: (result as any).insertId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save tier' },
      { status: 500 }
    );
  }
}
