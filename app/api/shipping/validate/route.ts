import { NextResponse } from "next/server";
import {
  detectOversizedItems,
  getAvailableShippingMethods,
  getTotalQuantity,
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

    const oversized = detectOversizedItems(items);
    const totalQuantity = getTotalQuantity(items);
    const methodsOptions = getAvailableShippingMethods(items, shippingAddress?.zip);
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
