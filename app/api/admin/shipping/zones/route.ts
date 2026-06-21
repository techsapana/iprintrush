import { NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { getAdminFromRequest } from "@/app/lib/adminAuth";

export async function GET(request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await query(`
      SELECT z.id, z.zone_name, z.delivery_fee, z.free_delivery_minimum, 
             z.delivery_window, z.cutoff_time, z.same_day_delivery, 
             z.enabled, z.display_order,
             (SELECT COUNT(*) FROM shipping_zone_zips sz WHERE sz.zone_id = z.id) as zipCount
      FROM shipping_zones z
      ORDER BY z.display_order ASC, z.id ASC
    `);

    return NextResponse.json({ zones: rows });
  } catch (error) {
    console.error("Error fetching shipping zones:", error);
    return NextResponse.json({ error: "Failed to fetch shipping zones" }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      zone_name, 
      delivery_fee = 0, 
      free_delivery_minimum = 0, 
      delivery_window, 
      cutoff_time, 
      same_day_delivery = false, 
      enabled = true, 
      display_order = 0 
    } = body;

    if (!zone_name || typeof zone_name !== "string") {
      return NextResponse.json({ error: "Zone name is required" }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO shipping_zones 
       (zone_name, delivery_fee, free_delivery_minimum, delivery_window, cutoff_time, same_day_delivery, enabled, display_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [zone_name, delivery_fee, free_delivery_minimum, delivery_window, cutoff_time, same_day_delivery ? 1 : 0, enabled ? 1 : 0, display_order]
    );

    const { invalidateZoneCache } = await import("@/app/lib/shipping/zipZoneService");
    invalidateZoneCache();

    return NextResponse.json({ 
      success: true, 
      zone: { 
        id: result.insertId, 
        zone_name, 
        delivery_fee, 
        free_delivery_minimum, 
        delivery_window, 
        cutoff_time, 
        same_day_delivery, 
        enabled, 
        display_order,
        zipCount: 0
      } 
    });
  } catch (error) {
    console.error("Error creating shipping zone:", error);
    return NextResponse.json({ error: "Failed to create shipping zone" }, { status: 500 });
  }
}