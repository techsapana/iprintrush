import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { hasDbTable } from '@/app/lib/dbFeatureTables';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mapHeroProductRow(p: any) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: parseFloat(p.price),
    minQuantity: p.min_quantity != null ? Number(p.min_quantity) : null,
    maxQuantity: p.max_quantity != null ? Number(p.max_quantity) : null,
    oldPrice: p.old_price != null ? parseFloat(p.old_price) : null,
    category: p.category_name || p.category_id,
    categoryId: p.category_id,
    linkedCategorySlug: p.l_category || null,
    categorySlug: p.category_slug,
    image: p.image || '/placeholder.jpg',
    sameDayEligible: Boolean(p.same_day_eligible),
    outOfStock: Boolean(p.out_of_stock),
    createdAt: p.created_at || null,
    features: [],
    galleryImages: [],
  };
}

export async function GET() {
  try {
    if (!(await hasDbTable('hero_same_day_products'))) {
      return NextResponse.json({ products: [], curated: false });
    }

    const rows: any[] = (await query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM hero_same_day_products h
      INNER JOIN products p ON p.id = h.product_id AND p.enabled = TRUE
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY h.sort_order ASC, h.id ASC`,
    )) as any[];

    const products = rows.map(mapHeroProductRow);
    return NextResponse.json({ products, curated: products.length > 0 });
  } catch (error: any) {
    console.error('hero-same-day-products GET:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load hero same-day products' },
      { status: 500 },
    );
  }
}
