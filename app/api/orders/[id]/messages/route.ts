import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromCookies } from '@/app/lib/adminAuth';
import { getCustomerFromCookies } from '@/app/lib/customerAuth';
import { sendEmail } from '@/app/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function checkAccess(request: Request, orderId: string) {
  const url = new URL(request.url);
  const context = url.searchParams.get('context');

  if (context === 'customer') {
    const customer = await getCustomerFromCookies();
    if (customer) {
      const rows = await query(`SELECT id, customer_email FROM orders WHERE id = ?`, [orderId]);
      const order = (rows as any[])?.[0];
      if (order && order.customer_email.toLowerCase() === customer.email.toLowerCase()) {
        return { role: 'customer' as const, email: customer.email, order };
      }
    }
  }

  // 1. Check if admin
  const admin = await getAdminFromCookies();
  if (admin) return { role: 'admin' as const, email: admin.email };

  // 2. Check if customer fallback
  const customer = await getCustomerFromCookies();
  if (customer) {
    const rows = await query(`SELECT id, customer_email FROM orders WHERE id = ?`, [orderId]);
    const order = (rows as any[])?.[0];
    if (order && order.customer_email.toLowerCase() === customer.email.toLowerCase()) {
      return { role: 'customer' as const, email: customer.email, order };
    }
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await checkAccess(request, id);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messages = await query(
      `SELECT id, sender_type, message, attachment_url, attachment_name, created_at 
       FROM order_messages 
       WHERE order_id = ? 
       ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error('Fetch messages error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await checkAccess(request, id);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, attachmentUrl, attachmentName } = body;

    if (!message && !attachmentUrl) {
      return NextResponse.json({ error: 'Message or attachment required' }, { status: 400 });
    }

    await query(
      `INSERT INTO order_messages (order_id, sender_type, message, attachment_url, attachment_name)
       VALUES (?, ?, ?, ?, ?)`,
      [id, access.role, message || '', attachmentUrl || null, attachmentName || null]
    );

    // If Admin sends a message, notify the customer
    if (access.role === 'admin') {
      const rows = await query(`SELECT customer_email, customer_name, order_number FROM orders WHERE id = ?`, [id]);
      const order = (rows as any[])?.[0];
      if (order && order.customer_email) {
        try {
          const content = `
            <h2>New Message on your Order #${order.order_number}</h2>
            <p>Hello ${order.customer_name || 'Customer'},</p>
            <p>Our team has left a new message or proof for your review regarding order #${order.order_number}.</p>
            <p><strong>Message:</strong></p>
            <blockquote style="border-left: 4px solid #ccc; padding-left: 10px; color: #555;">
              ${message}
            </blockquote>
            ${attachmentUrl ? '<p><em>An attachment was also included.</em></p>' : ''}
            <p>Please log in to your account and visit the <strong>My Orders</strong> section to view and reply.</p>
          `;
          await sendEmail({
            to: order.customer_email,
            subject: `New Message on Order #${order.order_number}`,
            html: content
          });
        } catch (mailErr) {
          console.error('Failed to send email notification:', mailErr);
        }
      }
    }

    // Return the newly created message
    const newMsgRows = await query(
      `SELECT id, sender_type, message, attachment_url, attachment_name, created_at 
       FROM order_messages 
       WHERE order_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    return NextResponse.json({ message: (newMsgRows as any[])[0] });
  } catch (err: any) {
    console.error('Post message error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to post message' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await checkAccess(request, id);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Ensure the message belongs to the order and the current sender
    await query(
      `DELETE FROM order_messages WHERE id = ? AND order_id = ? AND sender_type = ?`,
      [messageId, id, access.role]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete message error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to delete message' }, { status: 500 });
  }
}
