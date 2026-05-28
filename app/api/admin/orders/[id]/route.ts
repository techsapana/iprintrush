// Admin Orders API - single order with items
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';
import {
  getWorkflowWriteCandidates,
  normalizeWorkflowStatus,
} from '@/app/lib/orderWorkflow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const order = await queryOne(
      `SELECT 
        id,
        order_number,
        status,
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
        workflow_status,
        order_type,
        delivery_type,
        delivery_status,
        payment_method,
        discount_amount,
        coupon_code,
        production_start_at,
        production_complete_at,
        estimated_completion_at,
        assigned_staff,
        internal_notes,
        rush_flag,
        stripe_checkout_session_id,
        created_at,
        paid_at
      FROM orders
      WHERE id = ?`,
      [orderId]
    );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const items = await query(
      `SELECT id, product_id, name, unit_price, quantity, line_total, customization_json, artwork_files_json,
              requirement_files_json, requirement_status, requirement_uploaded_at, requirement_reviewed_at, requirement_review_notes
       FROM order_items
       WHERE order_id = ?
       ORDER BY id`,
      [orderId]
    );

    let billingAddress = null;
    if ((order as any).billing_address_json) {
      try {
        billingAddress =
          typeof (order as any).billing_address_json === 'string'
            ? JSON.parse((order as any).billing_address_json)
            : (order as any).billing_address_json;
      } catch {
        // ignore
      }
    }

    let shippingAddress = null;
    if ((order as any).shipping_address_json) {
      try {
        shippingAddress =
          typeof (order as any).shipping_address_json === 'string'
            ? JSON.parse((order as any).shipping_address_json)
            : (order as any).shipping_address_json;
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      order: {
        id: (order as any).id,
        orderNumber: (order as any).order_number,
        status: (order as any).status,
        currency: (order as any).currency,
        amountSubtotal: parseFloat((order as any).amount_subtotal || 0),
        amountTax: parseFloat((order as any).amount_tax || 0),
        amountTotal: parseFloat((order as any).amount_total || 0),
        customerName: (order as any).customer_name || '',
        customerEmail: (order as any).customer_email || '',
        customerPhone: (order as any).customer_phone || '',
        billingAddress,
        shippingAddress,
        workflowStatus: normalizeWorkflowStatus((order as any).workflow_status),
        orderType: (order as any).order_type || null,
        deliveryType: (order as any).delivery_type || null,
        deliveryMethod: (order as any).delivery_method || 'pickup',
        deliveryStatus: (order as any).delivery_status || null,
        trackingNumber: (order as any).tracking_number || '',
        paymentMethod: (order as any).payment_method || null,
        discountAmount: parseFloat((order as any).discount_amount || 0),
        couponCode: (order as any).coupon_code || null,
        productionStartAt: (order as any).production_start_at,
        productionCompleteAt: (order as any).production_complete_at,
        estimatedCompletionAt: (order as any).estimated_completion_at,
        assignedStaff: (order as any).assigned_staff || null,
        internalNotes: (order as any).internal_notes || null,
        rush: Boolean((order as any).rush_flag),
        createdAt: (order as any).created_at,
        paidAt: (order as any).paid_at,
      },
      items: (items as any[]).map((i) => {
        let customization = null;
        if (i.customization_json) {
          try {
            customization =
              typeof i.customization_json === 'string'
                ? JSON.parse(i.customization_json)
                : i.customization_json;
          } catch {
            // ignore
          }
        }
        let requirementFiles: string[] = [];
        let artworkFiles: string[] = [];
        if (i.artwork_files_json) {
          try {
            const parsed =
              typeof i.artwork_files_json === 'string'
                ? JSON.parse(i.artwork_files_json)
                : i.artwork_files_json;
            if (Array.isArray(parsed)) artworkFiles = parsed;
          } catch {
            // ignore
          }
        }
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
          customization,
          artworkFiles,
          requirementFiles,
          requirementStatus: i.requirement_status || 'none',
          requirementUploadedAt: i.requirement_uploaded_at || null,
          requirementReviewedAt: i.requirement_reviewed_at || null,
          requirementReviewNotes: i.requirement_review_notes || '',
        };
      }),
    });
  } catch (err: any) {
    console.error('Admin order detail error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await request.json();

    const fields: string[] = [];
    const values: any[] = [];

    const hasWorkflowStatusPatch = body.workflowStatus !== undefined;
    if (hasWorkflowStatusPatch) {
      fields.push('workflow_status = ?');
      values.push(getWorkflowWriteCandidates(body.workflowStatus)[0]);
    }
    if (body.deliveryType !== undefined) {
      fields.push('delivery_type = ?');
      values.push(body.deliveryType || null);
    }
    if (body.deliveryStatus !== undefined) {
      fields.push('delivery_status = ?');
      values.push(body.deliveryStatus || null);
    }
    if (body.trackingNumber !== undefined) {
      fields.push('tracking_number = ?');
      values.push(body.trackingNumber || null);
    }
    if (body.paymentMethod !== undefined) {
      fields.push('payment_method = ?');
      values.push(body.paymentMethod || null);
    }
    if (body.discountAmount !== undefined) {
      fields.push('discount_amount = ?');
      values.push(body.discountAmount);
    }
    if (body.couponCode !== undefined) {
      fields.push('coupon_code = ?');
      values.push(body.couponCode || null);
    }
    if (body.productionStartAt !== undefined) {
      fields.push('production_start_at = ?');
      values.push(body.productionStartAt || null);
    }
    if (body.productionCompleteAt !== undefined) {
      fields.push('production_complete_at = ?');
      values.push(body.productionCompleteAt || null);
    }
    if (body.estimatedCompletionAt !== undefined) {
      fields.push('estimated_completion_at = ?');
      values.push(body.estimatedCompletionAt || null);
    }
    if (body.assignedStaff !== undefined) {
      fields.push('assigned_staff = ?');
      values.push(body.assignedStaff || null);
    }
    if (body.internalNotes !== undefined) {
      fields.push('internal_notes = ?');
      values.push(body.internalNotes || null);
    }
    if (body.rush !== undefined) {
      fields.push('rush_flag = ?');
      values.push(body.rush ? 1 : 0);
    }
    if (body.orderType !== undefined) {
      fields.push('order_type = ?');
      values.push(body.orderType || null);
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: true });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    const sql = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
    values.push(orderId);

    if (hasWorkflowStatusPatch) {
      const workflowCandidates = getWorkflowWriteCandidates(body.workflowStatus);
      let updateError: any = null;
      for (const workflowCandidate of workflowCandidates) {
        try {
          const candidateValues = [...values];
          const workflowIdx = fields.indexOf('workflow_status = ?');
          if (workflowIdx >= 0) {
            candidateValues[workflowIdx] = workflowCandidate;
          }
          await query(sql, candidateValues);
          return NextResponse.json({
            success: true,
            workflowStatus: normalizeWorkflowStatus(workflowCandidate),
          });
        } catch (err: any) {
          updateError = err;
        }
      }
      throw updateError;
    }

    await query(sql, values);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin order update error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const items: any[] = (await query(
      `SELECT artwork_files_json
       FROM order_items
       WHERE order_id = ?`,
      [orderId]
    )) as any[];

    const uploadsRoot = path.join(process.cwd(), 'uploads');
    for (const item of items) {
      let files: string[] = [];
      if (item?.artwork_files_json) {
        try {
          const parsed =
            typeof item.artwork_files_json === 'string'
              ? JSON.parse(item.artwork_files_json)
              : item.artwork_files_json;
          if (Array.isArray(parsed)) files = parsed;
        } catch {
          files = [];
        }
      }

      for (const relPath of files) {
        try {
          const resolved = path.resolve(path.join(uploadsRoot, relPath));
          if (resolved.startsWith(uploadsRoot) && existsSync(resolved)) {
            await unlink(resolved);
          }
        } catch {
          // Continue deleting other files/order rows even if one file fails.
        }
      }
    }

    await query('DELETE FROM orders WHERE id = ?', [orderId]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin order delete error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to delete order' },
      { status: 500 }
    );
  }
}
