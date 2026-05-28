import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

export async function GET(_req: NextRequest) {
  try {
    const pricing = await queryOne(
      'SELECT price_per_signature FROM notary_pricing_config ORDER BY id ASC LIMIT 1',
    );
    const docs = await query(
      'SELECT id, name, description FROM notary_document_types WHERE enabled = TRUE ORDER BY display_order, name',
    );
    const rules = await query(
      'SELECT min_signatures, max_signatures, discount_percent FROM notary_discount_rules ORDER BY min_signatures ASC',
    );

    const pricePerSignature = pricing
      ? Number(pricing.price_per_signature || 0)
      : 0;

    return NextResponse.json({
      pricePerSignature,
      documentTypes: (docs as any[]).map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description || '',
      })),
      discountRules: (rules as any[]).map((r) => ({
        minSignatures: Number(r.min_signatures),
        maxSignatures: r.max_signatures != null ? Number(r.max_signatures) : null,
        discountPercent: Math.min(Number(r.discount_percent || 0), 25),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching notary config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load notary configuration' },
      { status: 500 },
    );
  }
}

