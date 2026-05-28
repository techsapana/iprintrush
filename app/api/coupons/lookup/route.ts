import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const productIds = Array.isArray(body.productIds)
      ? body.productIds.filter((x: any) => typeof x === 'string' && x.trim().length > 0)
      : [];
    if (productIds.length === 0) return NextResponse.json({ coupons: [] });

    const rows: any = await query(
      `SELECT product_id, coupon_code, discount_percent, is_active
       FROM product_coupon_codes
       WHERE product_id IN (${productIds.map(() => '?').join(',')})`,
      productIds,
    );

    return NextResponse.json({
      coupons: Array.isArray(rows)
        ? rows.map((r: any) => ({
            productId: r.product_id,
            code: String(r.coupon_code || '').toUpperCase(),
            discountPercent: Number(r.discount_percent || 0),
            isActive: r.is_active !== 0,
          }))
        : [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to lookup coupons' }, { status: 500 });
  }
}

