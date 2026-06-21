import { NextResponse } from "next/server";
import { query, queryOne } from "@/app/lib/db";
import { getAdminFromRequest } from "@/app/lib/adminAuth";

export async function GET(request, { params }) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const zoneId = parseInt(id, 10);
    
    if (!zoneId || isNaN(zoneId)) {
      return NextResponse.json({ error: "Invalid zone ID" }, { status: 400 });
    }

    const zone = await queryOne("SELECT * FROM shipping_zones WHERE id = ?", [zoneId]);
    
    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    const zips = await query("SELECT zip_code FROM shipping_zone_zips WHERE zone_id = ? ORDER BY zip_code", [zoneId]);

    return NextResponse.json({ 
      zone: {
        ...zone,
        same_day_delivery: Boolean(zone.same_day_delivery),
        enabled: Boolean(zone.enabled),
      },
      zips: zips.map(z => z.zip_code)
    });
  } catch (error) {
    console.error("Error fetching zone:", error);
    return NextResponse.json({ error: "Failed to fetch zone" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const zoneId = parseInt(id, 10);
    
    if (!zoneId || isNaN(zoneId)) {
      return NextResponse.json({ error: "Invalid zone ID" }, { status: 400 });
    }

    const body = await request.json();
    const { 
      zone_name, 
      delivery_fee, 
      free_delivery_minimum, 
      delivery_window, 
      cutoff_time, 
      same_day_delivery, 
      enabled, 
      display_order 
    } = body;

    const zone = await queryOne("SELECT id FROM shipping_zones WHERE id = ?", [zoneId]);
    
    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    await query(
      `UPDATE shipping_zones 
       SET zone_name = ?, delivery_fee = ?, free_delivery_minimum = ?, 
           delivery_window = ?, cutoff_time = ?, same_day_delivery = ?, 
           enabled = ?, display_order = ?
       WHERE id = ?`,
      [
        zone_name, 
        delivery_fee !== undefined ? delivery_fee : 0, 
        free_delivery_minimum !== undefined ? free_delivery_minimum : 0, 
        delivery_window, 
        cutoff_time, 
        same_day_delivery ? 1 : 0, 
        enabled ? 1 : 0, 
        display_order !== undefined ? display_order : 0,
        zoneId
      ]
    );

    const { invalidateZoneCache } = await import("@/app/lib/shipping/zipZoneService");
    invalidateZoneCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating zone:", error);
    return NextResponse.json({ error: "Failed to update zone" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const zoneId = parseInt(id, 10);
    
    if (!zoneId || isNaN(zoneId)) {
      return NextResponse.json({ error: "Invalid zone ID" }, { status: 400 });
    }

    const zone = await queryOne("SELECT id FROM shipping_zones WHERE id = ?", [zoneId]);
    
    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    await query("DELETE FROM shipping_zones WHERE id = ?", [zoneId]);

    const { invalidateZoneCache } = await import("@/app/lib/shipping/zipZoneService");
    invalidateZoneCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting zone:", error);
    return NextResponse.json({ error: "Failed to delete zone" }, { status: 500 });
  }
}