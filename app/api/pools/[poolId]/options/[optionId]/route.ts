import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ poolId: string; optionId: string }> }) {
  try {
    const { poolId, optionId } = await params;
    const body = await request.json().catch(() => ({}));
    const { label, value, priceModifier, enabled, displayOrder, metadata } = body ?? {};

    const updates: string[] = [];
    const values: any[] = [];

    if (label !== undefined) {
      updates.push('label = ?');
      values.push(label);
    }
    if (value !== undefined) {
      updates.push('value = ?');
      values.push(value);
    }
    if (priceModifier !== undefined) {
      updates.push('price_modifier = ?');
      values.push(priceModifier);
    }
    if (enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(enabled ? 1 : 0);
    }
    if (displayOrder !== undefined) {
      updates.push('display_order = ?');
      values.push(displayOrder ?? 0);
    }
    if (metadata !== undefined) {
      let metadataObj: any = null;
      if (metadata === null || metadata === '') {
        metadataObj = null;
      } else if (typeof metadata === 'string') {
        metadataObj = JSON.parse(metadata);
      } else {
        metadataObj = metadata;
      }
      updates.push('metadata = ?');
      values.push(metadataObj);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(optionId);

    await query(
      `UPDATE customization_pool_options SET ${updates.join(', ')} WHERE id = ? AND pool_id = ?`,
      [...values, poolId],
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update option' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ poolId: string; optionId: string }> }) {
  try {
    const { poolId, optionId } = await params;
    await query(
      'DELETE FROM customization_pool_options WHERE id = ? AND pool_id = ?',
      [optionId, poolId],
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete option' }, { status: 500 });
  }
}

