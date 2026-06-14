import { NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import {
  detectOversizedItems,
  getAvailableShippingMethods,
  ShippingConfig,
} from "@/app/lib/shippingEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, shippingAddress } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid input: 'items' must be an array." },
        { status: 400 }
      );
    }

    const configRows = (await query("SELECT * FROM shipping_config LIMIT 1")) as any[];
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

    const oversized = detectOversizedItems(items, config.oversizedWidthThresholdIn);
    const methodsOptions = getAvailableShippingMethods(items, config);
    const availableMethods = methodsOptions
      .filter((m) => m.available)
      .map((m) => m.id);

    const reviewRequired = availableMethods.includes("review_required");

    return NextResponse.json({
      oversized,
      availableMethods,
      reviewRequired,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Shipping validation failed" },
      { status: 500 }
    );
  }
}
