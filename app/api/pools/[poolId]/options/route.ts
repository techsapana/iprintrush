import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  try {
    const { poolId } = await params;
    const opts = await query(
      'SELECT id, label, value, price_modifier, metadata, enabled, display_order FROM customization_pool_options WHERE pool_id = ? ORDER BY display_order',
      [poolId],
    );

    return NextResponse.json({
      options: (opts as any[]).map((o) => ({
        id: o.id,
        label: o.label,
        value: o.value,
        priceModifier: parseFloat(o.price_modifier || 0),
        metadata: o.metadata ?? null,
        enabled: o.enabled !== 0,
        displayOrder: o.display_order ?? 0,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ options: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  try {
    const { poolId } = await params;
    const body = await request.json();

    const {
      id,
      label,
      value,
      priceModifier = 0,
      enabled = true,
      displayOrder = 0,
      metadata,
    } = body ?? {};

    if (!label) {
      return NextResponse.json({ error: 'Option label is required' }, { status: 400 });
    }

    // If metadata is sent as a JSON string, parse it; if it's already an object, pass through.
    let metadataObj: any = null;
    if (metadata !== undefined && metadata !== null && metadata !== '') {
      if (typeof metadata === 'string') {
        try {
          metadataObj = JSON.parse(metadata);
        } catch {
          return NextResponse.json({ error: 'metadata must be valid JSON' }, { status: 400 });
        }
      } else {
        metadataObj = metadata;
      }
    }

    const optionId = id || `opt-${Date.now()}`;

    await query(
      `INSERT INTO customization_pool_options (id, pool_id, label, value, price_modifier, metadata, enabled, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         label = VALUES(label),
         value = VALUES(value),
         price_modifier = VALUES(price_modifier),
         metadata = VALUES(metadata),
         enabled = VALUES(enabled),
         display_order = VALUES(display_order),
         updated_at = CURRENT_TIMESTAMP`,
      [
        optionId,
        poolId,
        label,
        value ?? null,
        priceModifier,
        metadataObj,
        enabled ? 1 : 0,
        displayOrder,
      ],
    );

    return NextResponse.json({ success: true, id: optionId });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save option' }, { status: 500 });
  }
}

