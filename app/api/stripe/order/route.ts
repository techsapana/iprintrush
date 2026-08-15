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
      `SELECT id, order_number, status, currency, amount_total, shipping_review_required, 
              customer_email, customer_name, created_at, stripe_payment_intent_id, stripe_checkout_session_id
       FROM orders
       WHERE stripe_checkout_session_id = ? OR stripe_payment_intent_id = ?
       LIMIT 1`,
      [sessionId || '', paymentIntent || '']
    ) as any;

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
        let fetchedPaymentIntentId = order.stripe_payment_intent_id;

        if (fetchedPaymentIntentId) {
          const pi = await stripe.paymentIntents.retrieve(fetchedPaymentIntentId);
          stripeStatus = pi.status;
          customerId = pi.customer;
        } else if (order.stripe_checkout_session_id) {
          const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
          stripeStatus = session.payment_status === 'paid' ? 'succeeded' : session.status;
          customerId = session.customer;
          
          if (session.payment_intent && typeof session.payment_intent === 'string') {
            fetchedPaymentIntentId = session.payment_intent;
          }
        }

        if (stripeStatus === 'succeeded') {
          let methodString = 'Stripe Card';
          // Try to get payment details if we have payment_intent
          if (fetchedPaymentIntentId) {
            const pi = await stripe.paymentIntents.retrieve(fetchedPaymentIntentId, {
              expand: ['latest_charge']
            });
            const charge = pi.latest_charge;
            if (charge && charge.payment_method_details) {
              const details = charge.payment_method_details;
              if (details.type === 'card' && details.card) {
                const brand = details.card.brand || '';
                const brandName = brand.charAt(0).toUpperCase() + brand.slice(1);
                methodString = `${brandName} •••• ${details.card.last4}`;
              } else {
                methodString = details.type;
              }
            }
          }

          const { query } = await import('@/app/lib/db');
          await query(
            `UPDATE orders SET status = 'paid', payment_method = ?, stripe_customer_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [methodString, customerId, order.id]
          );
          order.status = 'paid';
          order.paymentMethod = methodString;

          // Send order confirmation email (fallback — webhook may not have fired)
          try {
            const { sendEmail } = await import('@/app/lib/mailer');
            const items = await (await import('@/app/lib/db')).query(
              `SELECT name, quantity, line_total FROM order_items WHERE order_id = ?`,
              [order.id]
            ) as any[];

            const fmt = (v: number) => `$${Number(v || 0).toFixed(2)}`;
            const itemRowsHtml = items.map((i: any) =>
              `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${i.name}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${i.quantity}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${fmt(i.line_total)}</td>
              </tr>`
            ).join('');
            const itemRowsText = items.map((i: any) =>
              `- ${i.name} x${i.quantity}: ${fmt(i.line_total)}`
            ).join('\n');

            const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#29b6f6;padding:28px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">iPrintRush</h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Order Confirmed ✓</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;color:#333;margin:0 0 8px;">Hi <strong>${order.customer_name || 'Valued Customer'}</strong>,</p>
      <p style="color:#555;line-height:1.6;margin:0 0 24px;">Thank you for your order! We've received your payment and your order is now being processed.</p>
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
        <tbody>${itemRowsHtml}</tbody>
      </table>
      <div style="border-top:2px solid #f0f0f0;padding-top:16px;">
        <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid #e5e5e5;font-size:18px;font-weight:700;color:#111;">
          <span>Total Paid</span><span style="color:#29b6f6;">${fmt(order.amount_total)}</span>
        </div>
      </div>
      <div style="margin-top:28px;padding:16px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;">
        <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
          📎 If you haven't uploaded your artwork yet, visit <strong>My Orders</strong> on our website.
        </p>
      </div>
      <p style="margin:24px 0 0;color:#888;font-size:13px;">Questions? <a href="mailto:support@iprintrush.com" style="color:#29b6f6;">support@iprintrush.com</a></p>
    </div>
    <div style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e5e5e5;">
      <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} iPrintRush · All rights reserved</p>
    </div>
  </div>
</body></html>`;

            await sendEmail({
              to: order.customer_email,
              subject: `Order Confirmed – ${order.order_number} | iPrintRush`,
              text: `Hi ${order.customer_name || 'Valued Customer'},\n\nThank you for your order ${order.order_number}!\n\n${itemRowsText}\n\nTotal Paid: ${fmt(order.amount_total)}\n\nQuestions? support@iprintrush.com`,
              html,
            });

            // Notify Admin
            const adminEmail = process.env.MAIL_FROM || 'order@iprintrush.com';
            await sendEmail({
              to: adminEmail,
              subject: `NEW ORDER RECEIVED: ${order.order_number}`,
              text: `A new order has been placed by ${order.customer_name || order.customer_email}.\n\nOrder Number: ${order.order_number}\nTotal: ${fmt(order.amount_total)}\n\nPlease log in to the admin dashboard to view the details.`,
              html: `<div style="font-family:sans-serif;padding:20px;">
                <h2 style="color:#d97706;">New Order Received!</h2>
                <p><strong>Customer:</strong> ${order.customer_name || order.customer_email}</p>
                <p><strong>Order Number:</strong> ${order.order_number}</p>
                <p><strong>Total Paid:</strong> ${fmt(order.amount_total)}</p>
                <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://iprintrush.com'}/admin/orders" style="display:inline-block;padding:10px 15px;background:#29b6f6;color:#fff;text-decoration:none;border-radius:4px;margin-top:10px;">View Order in Admin Panel</a></p>
              </div>`
            });
          } catch (emailErr) {
            // Don't fail the response if email fails
            console.error('Failed to send order confirmation email (fallback):', emailErr);
          }
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
