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
import { lookupZoneByZip } from "@/app/lib/shipping/zipZoneService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body.items)
      ? body.items
      : body.items
        ? [body.items]
        : [];
    const { shippingAddress = {} } = body;

    const configRows = (await query(`SELECT * FROM shipping_config LIMIT 1`)) as any[];
    const config = buildShippingConfig(configRows[0] || {});

    const oversized = detectOversizedItems(items, config);
    const oversizedDetails = getOversizedDetails(items, config);
    const shippingTierSubtotal = Number.isFinite(Number(body.shippingTierSubtotal))
      ? Math.max(0, Number(body.shippingTierSubtotal))
      : getShippingTierSubtotalFromCartItems(items);

    const decision = getShippingDecision(items, config);
    const standardCost = getShippingCost(shippingTierSubtotal, 'standard_shipping', config);

    const methods: any[] = [];

    // Pickup - always available
    methods.push({
      type: 'pickup',
      id: 'pickup',
      label: 'Store Pickup',
      cost: 0,
    });

    // Zone lookup for local delivery
    const zip = String(shippingAddress?.zip || '').trim();
    const zone = await lookupZoneByZip(zip);

    // Standard shipping - always (unless oversized)
    if (!oversized) {
      methods.push({
        type: 'standard_shipping',
        id: 'standard_shipping',
        label: 'Standard Shipping',
        cost: standardCost,
      });
    }

    // Review required - oversized only
    if (oversized) {
      methods.push({
        type: 'review_required',
        id: 'review_required',
        label: 'Shipping Under Review',
        cost: 0,
      });
    }

    // Local delivery - check eligibility but always show if not oversized
    // Without ZIP: show as available but with zipRequired=true
    // With ZIP: check zone and show cost/delivery window
    if (!oversized) {
      const allEligible = items.every((item: any) => {
        if (item.product?.localDeliveryEligible === false) return false;
        return true;
      });

      if (allEligible) {
        if (zone) {
          // ZIP provided and zone found - show with pricing
          let localCost = 0;
          let deliveryWindow: string | null = null;

          if (shippingTierSubtotal >= zone.free_delivery_minimum) {
            localCost = 0;
          } else {
            localCost = zone.delivery_fee;
          }
          deliveryWindow = zone.delivery_window;

          methods.push({
            type: 'local_delivery',
            id: 'local_delivery',
            label: 'Local Delivery',
            cost: localCost,
            deliveryWindow,
            available: true,
          });
        } else if (zip) {
          // ZIP provided but not in zone - show as unavailable
          methods.push({
            type: 'local_delivery',
            id: 'local_delivery',
            label: 'Local Delivery',
            cost: 0,
            available: false,
          });
        } else {
          // No ZIP provided - show with zipRequired flag for pre-fetch
          methods.push({
            type: 'local_delivery',
            id: 'local_delivery',
            label: 'Local Delivery',
            cost: 0,
            zipRequired: true,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      shippingTierSubtotal,
      oversized: decision.isOversized,
      oversizedDetected: decision.isOversized,
      oversizedDetails: decision.details,
      methods,
      decision,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Shipping methods error" },
      { status: 500 }
    );
  }
}
