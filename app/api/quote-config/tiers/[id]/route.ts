// Single Quantity Tier API
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing ID param" },
        { status: 400 }
      );
    }
    const tier = await queryOne('SELECT * FROM quantity_tiers WHERE id = ?', [
      parseInt(id),
    ]);

    if (!tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    return NextResponse.json({
      tier: {
        id: tier.id.toString(),
        minQty: tier.min_qty,
        maxQty: tier.max_qty,
        unitPrice: parseFloat(tier.unit_price),
        discountPercent:
          tier.discount_percent != null ? parseFloat(tier.discount_percent) : 0,
        enabled: Boolean(tier.enabled),
        displayOrder: tier.display_order,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tier' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing ID param" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];

    if (body.minQty !== undefined) {
      updates.push('min_qty = ?');
      values.push(body.minQty);
    }
    if (body.maxQty !== undefined) {
      updates.push('max_qty = ?');
      values.push(body.maxQty !== null ? body.maxQty : null);
    }
    if (body.unitPrice !== undefined) {
      updates.push('unit_price = ?');
      values.push(body.unitPrice);
    }
    if (body.discountPercent !== undefined) {
      const discount = Number(body.discountPercent);
      updates.push('discount_percent = ?');
      values.push(Number.isFinite(discount) ? discount : 0);
    }
    if (body.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(body.enabled ? 1 : 0);
    }
    if (body.displayOrder !== undefined) {
      updates.push('display_order = ?');
      values.push(body.displayOrder);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(parseInt(id));
      await query(`UPDATE quantity_tiers SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update tier' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing ID param" },
        { status: 400 }
      );
    }
    await query('DELETE FROM quantity_tiers WHERE id = ?', [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete tier' },
      { status: 500 }
    );
  }
}