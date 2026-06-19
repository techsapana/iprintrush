import { NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import {
  detectOversizedItems,
  getOversizedDetails,
  getShippingTierSubtotalFromCartItems,
  getShippingCost,
  buildShippingConfig,
  getShippingDecision,
} from "@/app/lib/shippingEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items = [], shippingAddress = {} } = body;

    // Get shipping config from database
    const configRows = (await query(`SELECT * FROM shipping_config LIMIT 1`)) as any[];
    const config = buildShippingConfig(configRows[0] || {});

    const oversized = detectOversizedItems(items, config);
    const oversizedDetails = getOversizedDetails(items, config);
    const shippingTierSubtotal = Number.isFinite(Number(body.shippingTierSubtotal))
      ? Math.max(0, Number(body.shippingTierSubtotal))
      : getShippingTierSubtotalFromCartItems(items);

    // Use SDL to get unified decision
    const decision = getShippingDecision(items, config);

    // Calculate shipping costs using unified function
    const standardCost = getShippingCost(shippingTierSubtotal, 'standard_shipping', config);
    const localCost = getShippingCost(shippingTierSubtotal, 'local_delivery', config);

    // Build methods array for backward compatibility
    const methods = decision.allowedMethods.map((type) => {
      if (type === 'pickup') {
        return { type: 'pickup', id: 'pickup', label: 'Store Pickup', cost: 0 };
      }
      if (type === 'local_delivery') {
        return { type: 'local_delivery', id: 'local_delivery', label: 'Local Delivery', cost: localCost };
      }
      if (type === 'standard_shipping') {
        return { type: 'standard_shipping', id: 'standard_shipping', label: 'Standard Shipping', cost: standardCost };
      }
      if (type === 'review_required') {
        return { type: 'review_required', id: 'review_required', label: 'Shipping Under Review', cost: 0 };
      }
      return { type, id: type, label: type, cost: 0 };
    });

    return NextResponse.json({
      success: true,
      shippingTierSubtotal,
      oversized: decision.isOversized,
      oversizedDetected: decision.isOversized,
      oversizedDetails: decision.details,
      methods, // kept for backward compatibility
      decision, // NEW: SDL decision object
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Shipping methods error" },
      { status: 500 }
    );
  }
}