import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/app/lib/stripe';
import { query, queryOne } from '@/app/lib/db';
import { sendEmail } from '@/app/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function sendOrderConfirmationEmail(orderId: string | null, orderNumber: string | null) {
  try {
    // Fetch the full order from DB
    let order: any = null;
    if (orderId) {
      order = await queryOne(
        `SELECT id, order_number, customer_name, customer_email, amount_total, amount_subtotal, amount_tax, shipping_amount, discount_amount, delivery_method, payment_method, created_at
         FROM orders WHERE id = ? LIMIT 1`,
        [orderId]
      );
    } else if (orderNumber) {
      order = await queryOne(
        `SELECT id, order_number, customer_name, customer_email, amount_total, amount_subtotal, amount_tax, shipping_amount, discount_amount, delivery_method, payment_method, created_at
         FROM orders WHERE order_number = ? LIMIT 1`,
        [orderNumber]
      );
    }

    if (!order || !order.customer_email) return;

    const items = await query(
      `SELECT name, quantity, line_total FROM order_items WHERE order_id = ?`,
      [order.id]
    ) as any[];

    const formatCurrency = (v: number) => `$${Number(v || 0).toFixed(2)}`;

    const itemRows = items.map((i: any) =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${i.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatCurrency(i.line_total)}</td>
      </tr>`
    ).join('');

    const itemRowsText = items.map((i: any) =>
      `- ${i.name} x${i.quantity}: ${formatCurrency(i.line_total)}`
    ).join('\n');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#29b6f6;padding:28px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">iPrintRush</h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Order Confirmed ✓</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;color:#333;margin:0 0 8px;">Hi <strong>${order.customer_name || 'Valued Customer'}</strong>,</p>
      <p style="color:#555;line-height:1.6;margin:0 0 24px;">
        Thank you for your order! We've received your payment and your order is now being processed. 
        We'll reach out if we need anything from you.
      </p>

      <div style="background:#f8f9fa;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Order Number</p>
        <p style="margin:0;font-size:20px;font-weight:700;color:#29b6f6;">${order.order_number}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#888;">Item</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;text-transform:uppercase;color:#888;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#888;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="border-top:2px solid #f0f0f0;padding-top:16px;">
        ${Number(order.discount_amount) > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#555;"><span>Discount</span><span style="color:#16a34a;">-${formatCurrency(order.discount_amount)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#555;"><span>Subtotal</span><span>${formatCurrency(order.amount_subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#555;"><span>Shipping</span><span>${Number(order.shipping_amount) > 0 ? formatCurrency(order.shipping_amount) : (order.delivery_method === 'pickup' ? 'Local Pickup' : 'TBD')}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#555;"><span>Tax</span><span>${formatCurrency(order.amount_tax)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid #e5e5e5;font-size:18px;font-weight:700;color:#111;">
          <span>Total Paid</span><span style="color:#29b6f6;">${formatCurrency(order.amount_total)}</span>
        </div>
      </div>

      <div style="margin-top:28px;padding:16px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;">
        <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
          📎 If you haven't uploaded your artwork yet, you can do so anytime by visiting <strong>My Orders</strong> on our website. We need your artwork to begin production.
        </p>
      </div>

      <p style="margin:24px 0 0;color:#888;font-size:13px;line-height:1.6;">
        Questions? Contact us at <a href="mailto:support@iprintrush.com" style="color:#29b6f6;">support@iprintrush.com</a>
      </p>
    </div>
    <div style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e5e5e5;">
      <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} iPrintRush · All rights reserved</p>
    </div>
  </div>
</body>
</html>`;

    const text = `
Hi ${order.customer_name || 'Valued Customer'},

Thank you for your order! Your order ${order.order_number} has been confirmed.

Order Summary:
${itemRowsText}

Subtotal: ${formatCurrency(order.amount_subtotal)}
Shipping: ${Number(order.shipping_amount) > 0 ? formatCurrency(order.shipping_amount) : 'TBD'}
Tax: ${formatCurrency(order.amount_tax)}
Total Paid: ${formatCurrency(order.amount_total)}

If you have not uploaded your artwork yet, please log in and visit My Orders.

Questions? Contact us at support@iprintrush.com
    `.trim();

    await sendEmail({
      to: order.customer_email,
      subject: `Order Confirmed – ${order.order_number} | iPrintRush`,
      text,
      html,
    });
  } catch (err) {
    // Don't fail the webhook if email sending fails — just log it
    console.error('Failed to send order confirmation email:', err);
  }
}

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

        let methodString = 'Stripe Checkout';
        if (session.payment_intent && typeof session.payment_intent === 'string') {
          try {
            const pi = await stripe.paymentIntents.retrieve(session.payment_intent, {
              expand: ['latest_charge']
            });
            const charge = pi.latest_charge as any;
            if (charge && charge.payment_method_details) {
              const details = charge.payment_method_details;
              if (details.type === 'card' && details.card) {
                const brand = details.card.brand || '';
                const brandName = brand.charAt(0).toUpperCase() + brand.slice(1);
                methodString = `${brandName}(****${details.card.last4})`;
              } else {
                methodString = details.type;
              }
            }
          } catch (e) {
            console.error('Failed to retrieve PI for webhook:', e);
          }
        }

        if (orderId) {
          await query(
            `UPDATE orders
             SET status = 'paid',
                 payment_method = ?,
                 stripe_payment_intent_id = ?,
                 stripe_customer_id = ?,
                 paid_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [methodString, paymentIntent, customerId, orderId]
          );
        } else if (orderNumber) {
          await query(
            `UPDATE orders
             SET status = 'paid',
                 payment_method = ?,
                 stripe_payment_intent_id = ?,
                 stripe_customer_id = ?,
                 paid_at = CURRENT_TIMESTAMP
             WHERE order_number = ?`,
            [methodString, paymentIntent, customerId, orderNumber]
          );
        }
        // Send order confirmation email
        await sendOrderConfirmationEmail(orderId, orderNumber);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        const orderId = paymentIntent?.metadata?.orderId;
        const orderNumber = paymentIntent?.metadata?.orderNumber;
        const customerId = paymentIntent?.customer || null;
        
        // Only process if it's from our custom Stripe Elements flow
        if (paymentIntent?.metadata?.isCustomStripeElements === 'true') {
          let methodString = 'Stripe Card';
          const charge = paymentIntent?.charges?.data?.[0];
          if (charge && charge.payment_method_details) {
            const details = charge.payment_method_details;
            if (details.type === 'card' && details.card) {
              const brand = details.card.brand || '';
              const brandName = brand.charAt(0).toUpperCase() + brand.slice(1);
              methodString = `${brandName}(****${details.card.last4})`;
            } else {
              methodString = details.type;
            }
          }

          if (orderId) {
            await query(
              `UPDATE orders
               SET status = 'paid',
                   payment_method = ?,
                   stripe_customer_id = ?,
                   paid_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [methodString, customerId, orderId]
            );
          } else if (orderNumber) {
            await query(
              `UPDATE orders
               SET status = 'paid',
                   payment_method = ?,
                   stripe_customer_id = ?,
                   paid_at = CURRENT_TIMESTAMP
               WHERE order_number = ?`,
              [methodString, customerId, orderNumber]
            );
          }
          // Send order confirmation email
          await sendOrderConfirmationEmail(orderId, orderNumber);
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
