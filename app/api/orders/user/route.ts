import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { normalizeWorkflowStatus } from '@/app/lib/orderWorkflow';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';
import path from 'path';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const orderId = searchParams.get('orderId');

    if (!email) {
      return NextResponse.json(
        { error: 'Missing email' },
        { status: 400 }
      );
    }

    // If orderId is provided, fetch single order
    if (orderId) {
      const order = await query(
        `SELECT 
           id,
           order_number,
           status,
           workflow_status,
           currency,
           amount_subtotal,
           amount_tax,
           amount_total,
           shipping_amount,
           discount_amount,
           coupon_code,
           customer_name,
           customer_email,
           customer_phone,
           billing_address_json,
           shipping_address_json,
           delivery_method,
           tracking_number,
           estimated_delivery_date,
           created_at,
           paid_at,
           IF(ISNULL(customer_hidden), 0, customer_hidden) AS customer_hidden
         FROM orders
         WHERE customer_email = ? AND id = ?
         LIMIT 1`,
        [email, orderId]
      );

      if (!Array.isArray(order) || order.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const o = order[0] as any;

      // If this order was soft-deleted by customer, hide it
      if (Number(o.customer_hidden) === 1) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const items = await query(
        `SELECT oi.id, oi.product_id, oi.name, oi.unit_price, oi.quantity, oi.line_total, oi.customization_json, oi.artwork_files_json, oi.custom_size_note,
                p.image as product_image, p.slug as product_slug,
                requirement_files_json, requirement_status, requirement_review_notes
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?
         ORDER BY oi.id`,
        [o.id]
      );

      let billingAddress = null;
      if (o.billing_address_json) {
        try {
          billingAddress =
            typeof o.billing_address_json === 'string'
              ? JSON.parse(o.billing_address_json)
              : o.billing_address_json;
        } catch {
          // ignore bad JSON
        }
      }

      let shippingAddress = null;
      if (o.shipping_address_json) {
        try {
          shippingAddress =
            typeof o.shipping_address_json === 'string'
              ? JSON.parse(o.shipping_address_json)
              : o.shipping_address_json;
        } catch {
          // ignore bad JSON
        }
      }

      const transformedItems = (items as any[]).map((i) => {
        let customization = null;
        if (i.customization_json) {
          try {
            customization =
              typeof i.customization_json === 'string'
                ? JSON.parse(i.customization_json)
                : i.customization_json;
          } catch {
            // ignore bad JSON
          }
        }
        let artworkFiles: string[] | null = null;
        if (i.artwork_files_json) {
          try {
            const parsed =
              typeof i.artwork_files_json === 'string'
                ? JSON.parse(i.artwork_files_json)
                : i.artwork_files_json;
            if (Array.isArray(parsed)) {
              artworkFiles = parsed;
            }
          } catch {
            // ignore bad JSON
          }
        }

        let requirementFiles: string[] | null = null;
        if (i.requirement_files_json) {
          try {
            const parsed =
              typeof i.requirement_files_json === 'string'
                ? JSON.parse(i.requirement_files_json)
                : i.requirement_files_json;
            if (Array.isArray(parsed)) requirementFiles = parsed;
          } catch {
            // ignore
          }
        }

        return {
          id: i.id,
          productId: i.product_id,
          name: i.name,
          unitPrice: parseFloat(i.unit_price || 0),
          quantity: parseInt(i.quantity || 0, 10),
          lineTotal: parseFloat(i.line_total || 0),
          image: i.product_image || '/placeholder.jpg',
          productSlug: i.product_slug || null,
          customization,
          artworkFiles: artworkFiles || [],
          customSizeNote: i.custom_size_note || '',
          requirementFiles: requirementFiles || [],
          requirementStatus: i.requirement_status || 'none',
          requirementReviewNotes: i.requirement_review_notes || '',
        };
      });

      return NextResponse.json({
        order: {
          id: o.id,
          orderNumber: o.order_number,
          status: o.status,
          workflowStatus: normalizeWorkflowStatus(o.workflow_status),
          currency: o.currency,
          amountSubtotal: parseFloat(o.amount_subtotal || 0),
          amountTax: parseFloat(o.amount_tax || 0),
          amountTotal: parseFloat(o.amount_total || 0),
          shippingAmount: parseFloat(o.shipping_amount || 0),
          discountAmount: parseFloat(o.discount_amount || 0),
          couponCode: o.coupon_code || null,
          customerName: o.customer_name || '',
          customerEmail: o.customer_email || '',
          customerPhone: o.customer_phone || '',
          deliveryMethod: o.delivery_method || 'pickup',
          trackingNumber: o.tracking_number || '',
          estimatedDeliveryDate: o.estimated_delivery_date || null,
          billingAddress,
          shippingAddress,
          createdAt: o.created_at,
          paidAt: o.paid_at,
        },
        items: transformedItems,
      });
    }

    // Fetch all orders for this customer email
    const orders = await query(
      `SELECT 
         id,
         order_number,
         status,
         workflow_status,
         currency,
         amount_subtotal,
         amount_tax,
         amount_total,
         customer_name,
         customer_email,
         customer_phone,
         billing_address_json,
         shipping_address_json,
         delivery_method,
         tracking_number,
         estimated_delivery_date,
         shipping_carrier,
         shipping_service,
         payment_method,
         created_at,
         paid_at,
         IF(ISNULL(customer_hidden), 0, customer_hidden) AS customer_hidden
       FROM orders
       WHERE customer_email = ?
       ORDER BY created_at DESC`,
      [email]
    );

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    // Fetch items per order — filter hidden orders in JS
    const results = [];
    for (const o of (orders as any[])) {
      // Skip orders soft-deleted by customer
      if (Number(o.customer_hidden) === 1) continue;

      const items = await query(
        `SELECT oi.id, oi.product_id, oi.name, oi.unit_price, oi.quantity, oi.line_total, oi.customization_json, oi.artwork_files_json, oi.custom_size_note,
                p.image as product_image, p.slug as product_slug,
                requirement_files_json, requirement_status, requirement_review_notes
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?
         ORDER BY oi.id`,
        [o.id]
      );

      let billingAddress = null;
      if (o.billing_address_json) {
        try {
          billingAddress =
            typeof o.billing_address_json === 'string'
              ? JSON.parse(o.billing_address_json)
              : o.billing_address_json;
        } catch {
          // ignore bad JSON
        }
      }

      let shippingAddress = null;
      if (o.shipping_address_json) {
        try {
          shippingAddress =
            typeof o.shipping_address_json === 'string'
              ? JSON.parse(o.shipping_address_json)
              : o.shipping_address_json;
        } catch {
          // ignore bad JSON
        }
      }

      const transformedItems = (items as any[]).map((i) => {
        let customization = null;
        if (i.customization_json) {
          try {
            customization =
              typeof i.customization_json === 'string'
                ? JSON.parse(i.customization_json)
                : i.customization_json;
          } catch {
            // ignore bad JSON
          }
        }
        let artworkFiles: string[] | null = null;
        if (i.artwork_files_json) {
          try {
            const parsed =
              typeof i.artwork_files_json === 'string'
                ? JSON.parse(i.artwork_files_json)
                : i.artwork_files_json;
            if (Array.isArray(parsed)) {
              artworkFiles = parsed;
            }
          } catch {
            // ignore bad JSON
          }
        }

        let requirementFiles: string[] | null = null;
        if (i.requirement_files_json) {
          try {
            const parsed =
              typeof i.requirement_files_json === 'string'
                ? JSON.parse(i.requirement_files_json)
                : i.requirement_files_json;
            if (Array.isArray(parsed)) requirementFiles = parsed;
          } catch {
            // ignore
          }
        }

        return {
          id: i.id,
          productId: i.product_id,
          name: i.name,
          unitPrice: parseFloat(i.unit_price || 0),
          quantity: parseInt(i.quantity || 0, 10),
          lineTotal: parseFloat(i.line_total || 0),
          image: i.product_image || '/placeholder.jpg',
          productSlug: i.product_slug || null,
          customization,
          artworkFiles: artworkFiles || [],
          customSizeNote: i.custom_size_note || '',
          requirementFiles: requirementFiles || [],
          requirementStatus: i.requirement_status || 'none',
          requirementReviewNotes: i.requirement_review_notes || '',
        };
      });

      results.push({
        order: {
          id: o.id,
          orderNumber: o.order_number,
          status: o.status,
          workflowStatus: normalizeWorkflowStatus(o.workflow_status),
          currency: o.currency,
          amountSubtotal: parseFloat(o.amount_subtotal || 0),
          amountTax: parseFloat(o.amount_tax || 0),
          amountTotal: parseFloat(o.amount_total || 0),
          customerName: o.customer_name || '',
          customerEmail: o.customer_email || '',
          customerPhone: o.customer_phone || '',
          deliveryMethod: o.delivery_method || 'pickup',
          trackingNumber: o.tracking_number || '',
          estimatedDeliveryDate: o.estimated_delivery_date || null,
          shippingCarrier: o.shipping_carrier || null,
          shippingService: o.shipping_service || null,
          paymentMethod: o.payment_method || null,
          billingAddress,
          shippingAddress,
          createdAt: o.created_at,
          paidAt: o.paid_at,
        },
        items: transformedItems,
      });
    }

    return NextResponse.json({ orders: results });
  } catch (err: any) {
    console.error('User orders fetch error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const customer = getCustomerFromRequest(request);
    if (!customer?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = Number(body.orderId);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
    }

    const orders: any[] = (await query(
      'SELECT id, customer_email FROM orders WHERE id = ? LIMIT 1',
      [orderId]
    )) as any[];
    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (orders[0].customer_email !== customer.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Artwork files are retained on the server for the admin when an order is soft-deleted by a customer
    try {
      await query('UPDATE orders SET customer_hidden = 1 WHERE id = ? AND customer_email = ?', [
        orderId,
        customer.email,
      ]);
    } catch (updateErr: any) {
      // If customer_hidden column doesn't exist yet (pre-migration production DB), ignore the error.
      // The migration at /api/admin/migrate/run-all-updates will add this column.
      if (updateErr?.code !== 'ER_BAD_FIELD_ERROR') {
        throw updateErr;
      }
      console.warn('customer_hidden column missing — run migration at /api/admin/migrate/run-all-updates');
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('User order delete error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to delete order' },
      { status: 500 }
    );
  }
}

