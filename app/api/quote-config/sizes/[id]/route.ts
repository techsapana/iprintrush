// Single Size Option API
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const size = await queryOne('SELECT * FROM size_options WHERE id = ?', [
      params.id,
    ]);

    if (!size) {
      return NextResponse.json({ error: 'Size not found' }, { status: 404 });
    }

    return NextResponse.json({
      size: {
        id: size.id,
        label: size.label,
        priceAddon: parseFloat(size.price_addon),
        baseEnabled: Boolean(size.base_enabled),
        displayOrder: size.display_order,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch size' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];

    if (body.label !== undefined) {
      updates.push('label = ?');
      values.push(body.label);
    }
    if (body.priceAddon !== undefined) {
      updates.push('price_addon = ?');
      values.push(body.priceAddon);
    }
    if (body.baseEnabled !== undefined) {
      updates.push('base_enabled = ?');
      values.push(body.baseEnabled ? 1 : 0);
    }
    if (body.displayOrder !== undefined) {
      updates.push('display_order = ?');
      values.push(body.displayOrder);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(params.id);
      await query(`UPDATE size_options SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update size' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await query('DELETE FROM size_options WHERE id = ?', [params.id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete size' },
      { status: 500 }
    );
  }
}
