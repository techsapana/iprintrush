// Single Turnaround Option API
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
    const turnaround = await queryOne(
      'SELECT * FROM turnaround_options WHERE id = ?',
      [id]
    );

    if (!turnaround) {
      return NextResponse.json({ error: 'Turnaround not found' }, { status: 404 });
    }

    return NextResponse.json({
      turnaround: {
        id: turnaround.id,
        name: turnaround.name,
        priceModifier: parseFloat(turnaround.price_modifier),
        enabled: Boolean(turnaround.enabled),
        displayOrder: turnaround.display_order,
        pricingType: turnaround.pricing_type || 'flat',
        percentageValue: turnaround.percentage_value != null ? parseFloat(turnaround.percentage_value) : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch turnaround' },
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

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.priceModifier !== undefined) {
      updates.push('price_modifier = ?');
      values.push(body.priceModifier);
    }
    if (body.pricingType !== undefined) {
      updates.push('pricing_type = ?');
      values.push(body.pricingType);
    }
    if (body.percentageValue !== undefined) {
      updates.push('percentage_value = ?');
      values.push(body.percentageValue);
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
      values.push(id);
      await query(
        `UPDATE turnaround_options SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update turnaround' },
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
    await query('DELETE FROM turnaround_options WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete turnaround' },
      { status: 500 }
    );
  }
}