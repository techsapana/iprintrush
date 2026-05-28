// Business Category Products API
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const products = await query(
      `SELECT p.*, bcp.display_order as category_display_order
       FROM business_category_products bcp
       JOIN products p ON bcp.product_id = p.id
       WHERE bcp.business_category_id = ?
       ORDER BY bcp.display_order, p.name`,
      [id]
    );

    return NextResponse.json({
      products: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: parseFloat(p.price),
        image: p.image,
        category: p.category,
        categoryDisplayOrder: p.category_display_order,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
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
    const { productIds } = body; // Array of product IDs with optional displayOrder

    // Delete existing products
    await query('DELETE FROM business_category_products WHERE business_category_id = ?', [id]);

    // Insert new products
    if (Array.isArray(productIds) && productIds.length > 0) {
      const values = productIds.map((item: string | { id: string; displayOrder?: number }, index: number) => {
        if (typeof item === 'string') {
          return [id, item, index];
        } else {
          return [id, item.id, item.displayOrder ?? index];
        }
      });

      await query(
        `INSERT INTO business_category_products (business_category_id, product_id, display_order)
         VALUES ${values.map(() => '(?, ?, ?)').join(', ')}`,
        values.flat()
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update products' },
      { status: 500 }
    );
  }
}
