import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const order = await queryOne(
      `SELECT id, order_number, status, currency, amount_total, created_at
       FROM orders
       WHERE stripe_checkout_session_id = ?
       LIMIT 1`,
      [sessionId]
    );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        currency: order.currency,
        amountTotal: Number(order.amount_total || 0),
        createdAt: order.created_at,
      },
    });
  } catch (err: any) {
    console.error('Error fetching order by session:', err);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

