import { NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import {
  detectOversizedItems,
  calculateShippingCostByQuantity,
  CartItem,
  ShippingMethod,
} from "@/app/lib/shippingEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items = [], shippingAddress = {} } = body;

    const oversized = detectOversizedItems(items);
    const totalQuantity = items.reduce(
      (sum: number, item: CartItem) => sum + Math.max(1, item.quantity || 1),
      0
    );

    const configRows = await query(`SELECT * FROM shipping_config LIMIT 1`) as any[];
    const config = configRows.length > 0 ? configRows[0] : null;

    const methodTypes: ShippingMethod[] = oversized
      ? ["pickup", "local_delivery", "review_required"]
      : ["pickup", "local_delivery", "standard_shipping"];

    const methods = methodTypes.map((type) => {
      if (type === "pickup") {
        return { type, id: type, label: "Store Pickup", cost: 0 };
      }

      if (type === "review_required") {
        return { type, id: type, label: "Shipping Review Required", cost: 0 };
      }

      if (type === "local_delivery") {
        const engineResult = calculateShippingCostByQuantity("local_delivery", totalQuantity);
        const cost =
          config?.between_100_199_rate !== undefined
            ? config.between_100_199_rate
            : engineResult.cost;
        return { type, id: type, label: "Local Delivery", cost };
      }

      const engineResult = calculateShippingCostByQuantity("standard_shipping", totalQuantity);
      const cost =
        config?.under_100_rate !== undefined ? config.under_100_rate : engineResult.cost;
      return { type, id: type, label: "Standard Shipping", cost };
    });

    return NextResponse.json({
      success: true,
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
