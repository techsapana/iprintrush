// Admin Orders API - list all orders
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import {
  ORDER_WORKFLOW_OPTIONS,
  getWorkflowWriteCandidates,
  normalizeWorkflowStatus,
} from '@/app/lib/orderWorkflow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workflow = searchParams.get('workflow');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    let sql = `
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.currency,
        o.amount_subtotal,
        o.amount_tax,
        o.amount_total,
        o.customer_name,
        o.customer_email,
        o.created_at,
        o.paid_at,
        o.workflow_status,
        o.delivery_type,
        o.delivery_status,
        o.payment_method,
        o.rush_flag,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
        (SELECT COUNT(*) FROM order_items oi
         WHERE oi.order_id = o.id
           AND oi.artwork_files_json IS NOT NULL
           AND oi.artwork_files_json != '[]'
           AND oi.artwork_files_json != 'null') as artwork_item_count
      FROM orders o
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (workflow && ORDER_WORKFLOW_OPTIONS.includes(workflow as any)) {
      const candidates = getWorkflowWriteCandidates(workflow);
      sql += ` AND o.workflow_status IN (${candidates.map(() => '?').join(', ')})`;
      params.push(...candidates);
    }

    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const orders = await query(sql, params);

    const transformed = (orders as any[]).map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      currency: o.currency,
      amountSubtotal: parseFloat(o.amount_subtotal || 0),
      amountTax: parseFloat(o.amount_tax || 0),
      amountTotal: parseFloat(o.amount_total || 0),
      customerName: o.customer_name || '',
      customerEmail: o.customer_email || '',
      createdAt: o.created_at,
      paidAt: o.paid_at,
      workflowStatus: normalizeWorkflowStatus(o.workflow_status),
      deliveryType: o.delivery_type || null,
      deliveryStatus: o.delivery_status || null,
      paymentMethod: o.payment_method || null,
      rush: Boolean(o.rush_flag),
      itemCount: parseInt(o.item_count || 0, 10),
      artworkItemCount: parseInt(o.artwork_item_count || 0, 10),
    }));

    return NextResponse.json({ orders: transformed });
  } catch (err: any) {
    console.error('Admin orders list error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
