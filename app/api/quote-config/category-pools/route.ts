// Get pools with all options for a category (for product form when category uses print_product)
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

export async function GET(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get('categoryId');
    if (!categoryId) {
      return NextResponse.json({ schema: null, pools: [] });
    }

    const category = await queryOne(
      'SELECT customization_schema FROM categories WHERE id = ? OR slug = ? OR name = ?',
      [categoryId, categoryId, categoryId]
    );

    if (!category?.customization_schema) {
      return NextResponse.json({ schema: null, pools: [] });
    }

    let schema: any = null;
    try {
      schema =
        typeof category.customization_schema === 'string'
          ? JSON.parse(category.customization_schema)
          : category.customization_schema;
    } catch {
      return NextResponse.json({ schema: null, pools: [] });
    }

    if (schema?.mode !== 'print_product' || !schema.groups?.length) {
      return NextResponse.json({ schema, pools: [] });
    }

    const poolKeys = schema.groups.map((g: any) => g.poolKey).filter(Boolean);
    if (poolKeys.length === 0) {
      return NextResponse.json({ schema, pools: [] });
    }

    const placeholders = poolKeys.map(() => '?').join(',');
    const pools = await query(
      `SELECT * FROM customization_option_pools WHERE \`key\` IN (${placeholders}) ORDER BY display_order`,
      poolKeys
    );

    const poolsWithOptions: any[] = [];
    for (const pool of pools as any[]) {
      const [options, qtyTiers] = await Promise.all([
        query(
          'SELECT * FROM customization_pool_options WHERE pool_id = ? AND enabled = TRUE ORDER BY display_order',
          [pool.id]
        ),
        pool.selection_type === 'quantity'
          ? query(
              'SELECT * FROM customization_quantity_tiers WHERE pool_id = ? AND enabled = TRUE ORDER BY min_qty',
              [pool.id]
            )
          : Promise.resolve([]),
      ]);

      poolsWithOptions.push({
        id: pool.id,
        key: pool.key,
        name: pool.name,
        selectionType: pool.selection_type,
        priceType: pool.price_type,
        options: (options as any[]).map((o: any) => ({
          id: o.id,
          label: o.label,
          value: o.value,
          priceModifier: parseFloat(o.price_modifier || 0),
        })),
quantityTiers:
           pool.selection_type === 'quantity'
             ? (qtyTiers as any[]).map((t: any) => ({
                 minQty: t.min_qty,
                 maxQty: t.max_qty,
                 unitPrice: parseFloat(t.unit_price),
                 discountType: (t.discount_type === 'PERCENT' || t.discount_type === 'FIXED') ? t.discount_type : 'NONE',
                 discountValue: Number.isFinite(parseFloat(t.discount_value)) ? parseFloat(t.discount_value) : 0,
                 label: t.label,
               }))
             : undefined,
      });
    }

    return NextResponse.json({ schema, pools: poolsWithOptions });
  } catch (error: any) {
    console.error('Error fetching category pools:', error);
    return NextResponse.json({ schema: null, pools: [] });
  }
}
