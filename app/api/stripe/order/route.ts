import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    const paymentIntent = req.nextUrl.searchParams.get('payment_intent');
    
    if (!sessionId && !paymentIntent) {
      return NextResponse.json({ error: 'Missing session_id or payment_intent' }, { status: 400 });
    }

    let order = await queryOne(
      `SELECT id, order_number, status, currency, amount_total, shipping_review_required, created_at, stripe_payment_intent_id, stripe_checkout_session_id
       FROM orders
       WHERE stripe_checkout_session_id = ? OR stripe_payment_intent_id = ?
       LIMIT 1`,
      [sessionId || '', paymentIntent || '']
    );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fallback sync: if order is still pending, check Stripe directly
    // This handles cases where the webhook is delayed or not running locally
    if (order.status === 'pending') {
      const { getStripe } = await import('@/app/lib/stripe');
      const stripe = getStripe();
      let stripeStatus = null;
      let customerId = null;

      try {
        if (order.stripe_payment_intent_id) {
          const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
          stripeStatus = pi.status;
          customerId = pi.customer;
        } else if (order.stripe_checkout_session_id) {
          const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
          stripeStatus = session.payment_status === 'paid' ? 'succeeded' : session.status;
          customerId = session.customer;
        }

        if (stripeStatus === 'succeeded') {
          const { query } = await import('@/app/lib/db');
          await query(
            `UPDATE orders SET status = 'paid', stripe_customer_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [customerId, order.id]
          );
          order.status = 'paid';
        } else if (stripeStatus === 'canceled' || stripeStatus === 'requires_payment_method') {
          // Note: don't automatically fail it here unless it's definitively failed, 
          // but we can leave it pending or update it.
        }
      } catch (syncErr) {
        console.error('Failed to sync with Stripe:', syncErr);
      }
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        currency: order.currency,
        amountTotal: Number(order.amount_total || 0),
        shippingReviewRequired: Boolean((order as any).shipping_review_required),
        createdAt: order.created_at,
      },
    });
  } catch (err: any) {
    console.error('Error fetching order by session:', err);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

