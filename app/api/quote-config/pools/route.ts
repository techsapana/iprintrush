// List available customization option pools for admin UI
import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    const pools = await query(
      'SELECT id, `key`, name, selection_type, price_type FROM customization_option_pools ORDER BY display_order'
    );

    return NextResponse.json({
      pools: (pools as any[]).map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        selectionType: p.selection_type,
        priceType: p.price_type,
      })),
    });
  } catch (error: any) {
    // Tables might not exist if migration not run
    return NextResponse.json({ pools: [] });
  }
}
