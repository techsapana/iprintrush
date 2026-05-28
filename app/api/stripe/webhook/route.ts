import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/app/lib/stripe';
import { query } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err?.message || err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const orderId = session?.metadata?.orderId;
        const orderNumber = session?.metadata?.orderNumber;
        const paymentIntent = session?.payment_intent || null;
        const customerId = session?.customer || null;

        if (orderId) {
          await query(
            `UPDATE orders
             SET status = 'paid',
                 stripe_payment_intent_id = ?,
                 stripe_customer_id = ?,
                 paid_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [paymentIntent, customerId, orderId]
          );
        } else if (orderNumber) {
          await query(
            `UPDATE orders
             SET status = 'paid',
                 stripe_payment_intent_id = ?,
                 stripe_customer_id = ?,
                 paid_at = CURRENT_TIMESTAMP
             WHERE order_number = ?`,
            [paymentIntent, customerId, orderNumber]
          );
        }
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as any;
        const orderId = session?.metadata?.orderId;
        const orderNumber = session?.metadata?.orderNumber;
        if (orderId) {
          await query(`UPDATE orders SET status = 'failed' WHERE id = ?`, [orderId]);
        } else if (orderNumber) {
          await query(`UPDATE orders SET status = 'failed' WHERE order_number = ?`, [orderNumber]);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as any;
        const orderId = session?.metadata?.orderId;
        const orderNumber = session?.metadata?.orderNumber;
        if (orderId) {
          await query(`UPDATE orders SET status = 'cancelled' WHERE id = ?`, [orderId]);
        } else if (orderNumber) {
          await query(`UPDATE orders SET status = 'cancelled' WHERE order_number = ?`, [orderNumber]);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

