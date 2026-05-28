// Single Business Category API
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await queryOne(
      'SELECT * FROM business_categories WHERE id = ?',
      [id]
    );

    if (!category) {
      return NextResponse.json({ error: 'Business category not found' }, { status: 404 });
    }

    // Get products for this category
    const products = await query(
      `SELECT p.*, bcp.display_order as category_display_order
       FROM business_category_products bcp
       JOIN products p ON bcp.product_id = p.id
       WHERE bcp.business_category_id = ?
       ORDER BY bcp.display_order, p.name`,
      [id]
    );

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        displayOrder: category.display_order,
        enabled: Boolean(category.enabled),
        products: products.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: parseFloat(p.price),
          image: p.image,
          category: p.category,
          categoryDisplayOrder: p.category_display_order,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch business category' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }
    if (body.icon !== undefined) {
      updates.push('icon = ?');
      values.push(body.icon);
    }
    if (body.displayOrder !== undefined) {
      updates.push('display_order = ?');
      values.push(body.displayOrder);
    }
    if (body.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(body.enabled ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      await query(`UPDATE business_categories SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update business category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await query('DELETE FROM business_categories WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete business category' },
      { status: 500 }
    );
  }
}
