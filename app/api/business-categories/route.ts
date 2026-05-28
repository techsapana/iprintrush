// Business Categories API
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    const categories = await query(
      'SELECT * FROM business_categories WHERE enabled = 1 ORDER BY display_order, name'
    );
    return NextResponse.json({
      categories: categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        displayOrder: c.display_order,
        enabled: Boolean(c.enabled),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch business categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, icon = '📋', displayOrder = 0, enabled = true } = body;

    const categoryId = id || `business-${Date.now()}`;

    await query(
      `INSERT INTO business_categories (id, name, description, icon, display_order, enabled)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         icon = VALUES(icon),
         display_order = VALUES(display_order),
         enabled = VALUES(enabled),
         updated_at = CURRENT_TIMESTAMP`,
      [categoryId, name, description, icon, displayOrder, enabled ? 1 : 0]
    );

    return NextResponse.json({ success: true, id: categoryId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save business category' },
      { status: 500 }
    );
  }
}
