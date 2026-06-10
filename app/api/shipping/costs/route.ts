import { NextResponse } from "next/server";
import { calculateShippingCostByQuantity, detectOversizedItems, getTotalQuantity, ShippingMethod } from "@/app/lib/shippingEngine";

const VALID_METHODS: ShippingMethod[] = [
  "pickup",
  "local_delivery",
  "standard_shipping",
  "review_required",
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const method = searchParams.get("method");
    const totalQuantityParam = searchParams.get("totalQuantity");

    if (!method || !VALID_METHODS.includes(method as ShippingMethod)) {
      return NextResponse.json(
        { error: "Invalid or missing 'method'. Must be one of: pickup, local_delivery, standard_shipping, review_required" },
        { status: 400 }
      );
    }

    const totalQuantity = totalQuantityParam
      ? Number.parseInt(totalQuantityParam, 10)
      : 0;

    if (!Number.isFinite(totalQuantity) || totalQuantity < 0) {
      return NextResponse.json(
        { error: "Invalid 'totalQuantity'. Must be a non-negative number." },
        { status: 400 }
      );
    }

    const result = calculateShippingCostByQuantity(method as ShippingMethod, totalQuantity);

    return NextResponse.json({
      method,
      cost: result.cost,
      currency: "USD",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Shipping cost calculation failed" },
      { status: 500 }
    );
  }
}
