// Categories API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';
import { hasDbTable, ensureNavbarCategoryOrderRows } from '@/app/lib/dbFeatureTables';

export async function GET(request: NextRequest) {
  try {
    const useNavOrder = await hasDbTable('navbar_category_order');
    let categories: any[];

    if (useNavOrder) {
      await ensureNavbarCategoryOrderRows();
      categories = (await query(
        `SELECT c.*, n.nav_position AS nav_position
         FROM categories c
         INNER JOIN navbar_category_order n ON n.category_id = c.id
         WHERE c.enabled = TRUE
         ORDER BY n.nav_position ASC, c.name ASC`,
      )) as any[];
    } else {
      categories = (await query(
        'SELECT * FROM categories WHERE enabled = TRUE ORDER BY display_order, name',
      )) as any[];
    }

    const transformed = (categories as any[]).map((c: any) => {
      let customizationSchema = null;
      if (c.customization_schema) {
        try {
          customizationSchema = typeof c.customization_schema === 'string'
            ? JSON.parse(c.customization_schema)
            : c.customization_schema;
        } catch {}
      }
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        customizationSchema,
        navPosition:
          c.nav_position != null && Number.isFinite(Number(c.nav_position))
            ? Number(c.nav_position)
            : Number(c.display_order ?? 0),
      };
    });

    return NextResponse.json({ categories: transformed });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, slug, description, displayOrder = 0 } = body;

    const categoryId = id || `category-${Date.now()}`;
    const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-');

    await query(
      `INSERT INTO categories (id, name, slug, description, display_order, enabled)
       VALUES (?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         slug = VALUES(slug),
         description = VALUES(description),
         display_order = VALUES(display_order),
         updated_at = CURRENT_TIMESTAMP`,
      [categoryId, name, categorySlug, description || '', displayOrder]
    );

    if (await hasDbTable('navbar_category_order')) {
      const existing: any = await queryOne(
        'SELECT category_id FROM navbar_category_order WHERE category_id = ?',
        [categoryId],
      );
      if (!existing) {
        const maxRow: any = await queryOne('SELECT MAX(nav_position) AS m FROM navbar_category_order');
        let next = Number(maxRow?.m) || 0;
        if (next % 10 !== 0) next = Math.ceil(next / 10) * 10;
        if (next === 0) next = 10;
        else next += 10;
        await query(
          'INSERT INTO navbar_category_order (category_id, nav_position) VALUES (?, ?)',
          [categoryId, next],
        );
      }
    }

    return NextResponse.json({ success: true, id: categoryId });
  } catch (error: any) {
    console.error('Error creating/updating category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save category' },
      { status: 500 }
    );
  }
}
