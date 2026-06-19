import { NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import {
  detectOversizedItems,
  getOversizedDetails,
  getAvailableShippingMethods,
  buildShippingConfig,
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
    const config = buildShippingConfig(configRows[0] || {});

    const oversized = detectOversizedItems(items, config);
    const oversizedDetails = getOversizedDetails(items, config);
    const methodsOptions = getAvailableShippingMethods(items, config);
    const availableMethods = methodsOptions
      .filter((m) => m.available)
      .map((m) => m.id);

    const reviewRequired = availableMethods.includes("review_required");

    return NextResponse.json({
      oversized,
      availableMethods,
      reviewRequired,
      oversizedDetails,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Shipping validation failed" },
      { status: 500 }
    );
  }
}
