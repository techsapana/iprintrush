import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import { hasDbTable, ensureNavbarCategoryOrderRows } from '@/app/lib/dbFeatureTables';
import { isNavbarStripCategory } from '@/app/lib/siteNavCategory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CatRow = {
  id: string;
  name: string;
  slug: string;
  nav_position: number;
};

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    if (!(await hasDbTable('navbar_category_order'))) {
      return NextResponse.json({ categories: [], tableMissing: true });
    }
    await ensureNavbarCategoryOrderRows();

    const rows: any[] = (await query(
      `SELECT c.id, c.name, c.slug, n.nav_position
       FROM categories c
       INNER JOIN navbar_category_order n ON n.category_id = c.id
       WHERE c.enabled = TRUE
       ORDER BY n.nav_position ASC, c.name ASC`,
    )) as any[];

    const categories: CatRow[] = rows
      .map((r) => ({
        id: String(r.id),
        name: String(r.name),
        slug: String(r.slug),
        nav_position: Number(r.nav_position),
      }))
      .filter((c) => isNavbarStripCategory(c));

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('admin navbar-category-order GET:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    if (!(await hasDbTable('navbar_category_order'))) {
      return NextResponse.json(
        { error: 'Table navbar_category_order does not exist. Run the SQL migration first.' },
        { status: 503 },
      );
    }
    await ensureNavbarCategoryOrderRows();

    const body = await request.json().catch(() => ({}));
    const categoryId = String(body.categoryId || '').trim();
    const direction = String(body.direction || '').toLowerCase();
    if (!categoryId || (direction !== 'up' && direction !== 'down')) {
      return NextResponse.json({ error: 'categoryId and direction (up|down) required' }, { status: 400 });
    }

    const rows: any[] = (await query(
      `SELECT c.id, c.name, c.slug, n.nav_position
       FROM categories c
       INNER JOIN navbar_category_order n ON n.category_id = c.id
       WHERE c.enabled = TRUE
       ORDER BY n.nav_position ASC, c.name ASC`,
    )) as any[];

    const strip = rows
      .map((r) => ({
        id: String(r.id),
        name: String(r.name),
        slug: String(r.slug),
        nav_position: Number(r.nav_position),
      }))
      .filter((c) => isNavbarStripCategory(c));

    const idx = strip.findIndex((c) => c.id === categoryId);
    if (idx < 0) {
      return NextResponse.json({ error: 'Category not found in navbar list' }, { status: 404 });
    }
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= strip.length) {
      return NextResponse.json({ success: true, categories: strip, unchanged: true });
    }

    const a = strip[idx];
    const b = strip[swapWith];
    const posA = a.nav_position;
    const posB = b.nav_position;

    await query('UPDATE navbar_category_order SET nav_position = ? WHERE category_id = ?', [posB, a.id]);
    await query('UPDATE navbar_category_order SET nav_position = ? WHERE category_id = ?', [posA, b.id]);

    const out: any[] = (await query(
      `SELECT c.id, c.name, c.slug, n.nav_position
       FROM categories c
       INNER JOIN navbar_category_order n ON n.category_id = c.id
       WHERE c.enabled = TRUE
       ORDER BY n.nav_position ASC, c.name ASC`,
    )) as any[];

    const categories = out
      .map((r) => ({
        id: String(r.id),
        name: String(r.name),
        slug: String(r.slug),
        nav_position: Number(r.nav_position),
      }))
      .filter((c) => isNavbarStripCategory(c));

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error('admin navbar-category-order POST:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
