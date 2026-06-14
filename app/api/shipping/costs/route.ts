import { NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { getShippingCost, ShippingConfig, ShippingMethod } from "@/app/lib/shippingEngine";

const VALID_METHODS: ShippingMethod[] = [
  "pickup",
  "local_delivery",
  "standard_shipping",
  "review_required",
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shippingTierSubtotalParam = searchParams.get("shippingTierSubtotal");
    const legacyMerchandiseSubtotalParam = searchParams.get("merchandiseSubtotal");
    const method = searchParams.get("method");

    if (!method || !VALID_METHODS.includes(method as ShippingMethod)) {
      return NextResponse.json(
        { error: "Invalid or missing 'method'. Must be one of: pickup, local_delivery, standard_shipping, review_required" },
        { status: 400 }
      );
    }

    const shippingTierSubtotal = shippingTierSubtotalParam
      ? Math.max(0, Number.parseFloat(shippingTierSubtotalParam) || 0)
      : legacyMerchandiseSubtotalParam
        ? Math.max(0, Number.parseFloat(legacyMerchandiseSubtotalParam) || 0)
        : 0;

    if (!Number.isFinite(shippingTierSubtotal)) {
      return NextResponse.json(
        { error: "Invalid 'shippingTierSubtotal'. Must be a non-negative number." },
        { status: 400 }
      );
    }

    const configRows = (await query(`SELECT * FROM shipping_config LIMIT 1`)) as any[];
    const row = configRows[0] || {};
    const config: ShippingConfig = {
      enabled: Boolean(row.enabled ?? true),
      defaultFlatRate: parseFloat(row.default_flat_rate || 0),
      oversizedWidthThresholdIn: parseFloat(row.oversized_width_threshold_in || 0),
      under100Rate: parseFloat(row.under_100_rate || 0),
      between100And199Rate: parseFloat(row.between_100_199_rate || 0),
      over200Rate: parseFloat(row.over_200_rate || 0),
      localUnder100Rate: parseFloat(row.local_under_100_rate || 0),
      localBetween100And199Rate: parseFloat(row.local_between_100_199_rate || 0),
      localOver200Rate: parseFloat(row.local_over_200_rate || 0),
      rules: [],
    };

    if (method === "pickup") {
      return NextResponse.json({
        method,
        cost: 0,
        currency: "USD",
      });
    }

    if (method === "review_required") {
      return NextResponse.json({
        method,
        cost: 0,
        currency: "USD",
      });
    }

    const cost = getShippingCost(shippingTierSubtotal, method as 'standard_shipping' | 'local_delivery', config);

    return NextResponse.json({
      method,
      cost,
      currency: "USD",
      shippingTierSubtotal,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Shipping cost calculation failed" },
      { status: 500 }
    );
  }
}
