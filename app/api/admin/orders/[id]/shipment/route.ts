import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import { createFedexShipment, fedexConfig } from '@/app/lib/fedex';
import { normalizeWorkflowStatus } from '@/app/lib/orderWorkflow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
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
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const serviceType = String(body.serviceType || 'FEDEX_GROUND');

    const order: any = await queryOne(
      `SELECT id, order_number, customer_name, customer_phone, customer_email, shipping_address_json,
              delivery_method, workflow_status, tracking_number
       FROM orders
       WHERE id = ?
       LIMIT 1`,
      [orderId]
    );
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.delivery_method !== 'shipping') {
      return NextResponse.json(
        { error: 'Shipment can only be triggered for shipping orders.' },
        { status: 400 }
      );
    }

    if (order.tracking_number) {
      return NextResponse.json(
        { error: 'Shipment already created for this order.', trackingNumber: order.tracking_number },
        { status: 400 }
      );
    }

    const workflow = normalizeWorkflowStatus(order.workflow_status);
    if (workflow !== 'ready_for_shipping') {
      return NextResponse.json(
        { error: 'Order must be in Ready for Shipping status before creating shipment.' },
        { status: 400 }
      );
    }

    let shippingAddress: any = null;
    if (order.shipping_address_json) {
      try {
        shippingAddress =
          typeof order.shipping_address_json === 'string'
            ? JSON.parse(order.shipping_address_json)
            : order.shipping_address_json;
      } catch {
        shippingAddress = null;
      }
    }
    if (!shippingAddress?.address || !shippingAddress?.city || !shippingAddress?.state || !shippingAddress?.zip) {
      return NextResponse.json(
        { error: 'Order shipping address is incomplete.' },
        { status: 400 }
      );
    }

    const items: any[] = (await query(
      `SELECT oi.quantity, p.weight_lb, p.package_length_in, p.package_width_in, p.package_height_in
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    )) as any[];

    const packages = (items || []).map((row, idx) => ({
      weight: Math.max(0.1, Number(row.weight_lb || 1) * Math.max(1, Number(row.quantity || 1))),
      length: Math.max(1, Number(row.package_length_in || 12)),
      width: Math.max(1, Number(row.package_width_in || 12)),
      height: Math.max(1, Number(row.package_height_in || 4)),
      description: `Order ${order.order_number} package ${idx + 1}`,
    }));
    if (packages.length === 0) {
      packages.push({ weight: 1, length: 12, width: 12, height: 4, description: `Order ${order.order_number}` });
    }

    const shipment = await createFedexShipment({
      shipper: {
        contact: {
          name: fedexConfig.defaultShipper.company,
          phone: fedexConfig.defaultShipper.phone,
          company: fedexConfig.defaultShipper.company,
        },
        address: fedexConfig.defaultShipper.address,
      },
      recipient: {
        contact: {
          name: order.customer_name || 'Customer',
          phone: order.customer_phone || fedexConfig.defaultShipper.phone,
          email: order.customer_email || undefined,
        },
        address: {
          streetLines: [String(shippingAddress.address), shippingAddress.apt].filter(Boolean),
          city: String(shippingAddress.city),
          stateOrProvinceCode: String(shippingAddress.state),
          postalCode: String(shippingAddress.zip),
          countryCode: 'US',
          residential: true,
        },
      },
      packages,
      serviceType,
      referenceId: order.order_number,
      labelFormat: 'PDF',
    });

    if (!shipment.success || !shipment.trackingNumber) {
      return NextResponse.json(
        { error: shipment.error || 'Failed to create FedEx shipment' },
        { status: 500 }
      );
    }

    await query(
      `UPDATE orders
       SET tracking_number = ?, delivery_status = 'out_for_delivery', workflow_status = 'shipped', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [shipment.trackingNumber, orderId]
    );

    return NextResponse.json({
      success: true,
      trackingNumber: shipment.trackingNumber,
      label: shipment.label || '',
      labelFormat: shipment.labelFormat || 'PDF',
      serviceType,
      workflowStatus: 'shipped',
    });
  } catch (err: any) {
    console.error('Admin shipment trigger error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to trigger shipment' },
      { status: 500 }
    );
  }
}
