import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import { hasDbTable } from '@/app/lib/dbFeatureTables';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CUSTOM_APPAREL_SLUG = 'custom-apparels';

async function assertCustomApparelProductIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows: any[] = (await query(
    `SELECT p.id FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.id IN (${placeholders})
       AND p.enabled = TRUE
       AND (c.slug = ? OR c.name = 'Custom Apparels')`,
    [...ids, CUSTOM_APPAREL_SLUG],
  )) as any[];
  const allowed = new Set(rows.map((r) => String(r.id)));
  return ids.filter((id) => allowed.has(id));
}

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    if (!(await hasDbTable('home_custom_apparel_products'))) {
      return NextResponse.json({ productIds: [] });
    }
    const rows: any[] = (await query(
      'SELECT product_id FROM home_custom_apparel_products ORDER BY sort_order ASC, id ASC',
    )) as any[];
    return NextResponse.json({ productIds: rows.map((r) => String(r.product_id)) });
  } catch (error: any) {
    console.error('admin home-custom-apparel GET:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    if (!(await hasDbTable('home_custom_apparel_products'))) {
      return NextResponse.json(
        { error: 'Table home_custom_apparel_products does not exist. Run the SQL migration first.' },
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawIds = Array.isArray(body.productIds) ? body.productIds : [];
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const x of rawIds) {
      const id = String(x || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      unique.push(id);
      if (unique.length >= 24) break;
    }

    const validated = await assertCustomApparelProductIds(unique);
    if (validated.length !== unique.length) {
      return NextResponse.json(
        { error: 'One or more products are not in Custom Apparels or are disabled.' },
        { status: 400 },
      );
    }

    await query('DELETE FROM home_custom_apparel_products');
    let order = 0;
    for (const productId of validated) {
      await query(
        'INSERT INTO home_custom_apparel_products (product_id, sort_order) VALUES (?, ?)',
        [productId, order],
      );
      order += 1;
    }

    return NextResponse.json({ success: true, productIds: validated });
  } catch (error: any) {
    console.error('admin home-custom-apparel PUT:', error);
    return NextResponse.json({ error: error.message || 'Failed to save' }, { status: 500 });
  }
}
