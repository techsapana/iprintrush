import { NextResponse } from "next/server";
import { query, queryOne } from "@/app/lib/db";
import { getAdminFromRequest } from "@/app/lib/adminAuth";

export async function POST(request, { params }) {
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

    const body = await request.json();
    const { zipCodes } = body;

    if (!Array.isArray(zipCodes) || zipCodes.length === 0) {
      return NextResponse.json({ error: "No ZIP codes provided" }, { status: 400 });
    }

    // Validate all ZIP codes
    for (const zip of zipCodes) {
      if (!/^\d{5}$/.test(zip)) {
        return NextResponse.json({ error: `Invalid ZIP code format: ${zip}. Must be 5 digits.` }, { status: 400 });
      }
    }

    let added = 0;
    let duplicates = 0;

    for (const zipCode of zipCodes) {
      try {
        await query(
          "INSERT INTO shipping_zone_zips (zone_id, zip_code) VALUES (?, ?)",
          [zoneId, zipCode]
        );
        added++;
      } catch (err: any) {
        if (err.code === "ER_DUP_ENTRY") {
          duplicates++;
        }
      }
    }

    const { invalidateZoneCache } = await import("@/app/lib/shipping/zipZoneService");
    invalidateZoneCache();

    return NextResponse.json({ success: true, added, duplicates });
  } catch (error) {
    console.error("Error bulk adding ZIPs:", error);
    return NextResponse.json({ error: "Failed to add ZIP codes" }, { status: 500 });
  }
}