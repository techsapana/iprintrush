import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { hasDbTable } from '@/app/lib/dbFeatureTables';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CUSTOM_APPAREL_SLUG = 'custom-apparels';

function mapProductRow(p: any) {
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
    if (await hasDbTable('home_custom_apparel_products')) {
      const rows: any[] = (await query(
        `SELECT p.*, c.name AS category_name, c.slug AS category_slug
         FROM home_custom_apparel_products h
         INNER JOIN products p ON p.id = h.product_id AND p.enabled = TRUE
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE c.slug = ? OR c.name = 'Custom Apparels'
         ORDER BY h.sort_order ASC, h.id ASC`,
        [CUSTOM_APPAREL_SLUG],
      )) as any[];
      const products = rows.map(mapProductRow);
      if (products.length > 0) {
        return NextResponse.json({ products, curated: true });
      }
    }

    const fallback: any[] = (await query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.enabled = TRUE AND (c.slug = ? OR c.name = 'Custom Apparels')
       ORDER BY p.created_at DESC
       LIMIT 12`,
      [CUSTOM_APPAREL_SLUG],
    )) as any[];

    return NextResponse.json({
      products: fallback.map(mapProductRow),
      curated: false,
    });
  } catch (error: any) {
    console.error('home-custom-apparel-products GET:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load custom apparel products' },
      { status: 500 },
    );
  }
}
