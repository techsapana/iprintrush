// Single Color Option API
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const color = await queryOne('SELECT * FROM color_options WHERE id = ?', [
      params.id,
    ]);

    if (!color) {
      return NextResponse.json({ error: 'Color not found' }, { status: 404 });
    }

    return NextResponse.json({
      color: {
        id: color.id,
        name: color.name,
        hex: color.hex,
        enabled: Boolean(color.enabled),
        displayOrder: color.display_order,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch color' },
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

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.hex !== undefined) {
      updates.push('hex = ?');
      values.push(body.hex);
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
      values.push(params.id);
      await query(`UPDATE color_options SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update color' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await query('DELETE FROM color_options WHERE id = ?', [params.id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete color' },
      { status: 500 }
    );
  }
}
