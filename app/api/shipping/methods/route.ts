import { NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import {
  detectOversizedItems,
  getShippingTierSubtotalFromCartItems,
  getShippingCost,
  ShippingConfig,
} from "@/app/lib/shippingEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items = [], shippingAddress = {} } = body;

    // Get shipping config from database
    const configRows = (await query(`SELECT * FROM shipping_config LIMIT 1`)) as any[];
    const row = configRows[0] || {};

    const config: ShippingConfig = {
      enabled: Boolean(row.enabled ?? true),
      defaultFlatRate: parseFloat(row.default_flat_rate || 0),
      under100Rate: parseFloat(row.under_100_rate || 0),
      between100And199Rate: parseFloat(row.between_100_199_rate || 0),
      over200Rate: parseFloat(row.over_200_rate || 0),
      localUnder100Rate: parseFloat(row.local_under_100_rate || 0),
      localBetween100And199Rate: parseFloat(row.local_between_100_199_rate || 0),
      localOver200Rate: parseFloat(row.local_over_200_rate || 0),
      rules: [],
    };

    const oversized = detectOversizedItems(items);
    const shippingTierSubtotal = Number.isFinite(Number(body.shippingTierSubtotal))
      ? Math.max(0, Number(body.shippingTierSubtotal))
      : getShippingTierSubtotalFromCartItems(items);

    // Calculate shipping costs using unified function
    const standardCost = getShippingCost(shippingTierSubtotal, 'standard_shipping', config);
    const localCost = getShippingCost(shippingTierSubtotal, 'local_delivery', config);

    const methods = oversized
      ? [
          { type: 'pickup', id: 'pickup', label: 'Store Pickup', cost: 0 },
          { type: 'local_delivery', id: 'local_delivery', label: 'Local Delivery', cost: localCost },
          { type: 'review_required', id: 'review_required', label: 'Shipping Review Required', cost: 0 },
        ]
      : [
          { type: 'pickup', id: 'pickup', label: 'Store Pickup', cost: 0 },
          { type: 'local_delivery', id: 'local_delivery', label: 'Local Delivery', cost: localCost },
          { type: 'standard_shipping', id: 'standard_shipping', label: 'Standard Shipping', cost: standardCost },
        ];

    return NextResponse.json({
      success: true,
      shippingTierSubtotal,
      oversized,
      oversizedDetected: oversized,
      methods,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Shipping methods error" },
      { status: 500 }
    );
  }
}