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

    const zone = await queryOne("SELECT id FROM shipping_zones WHERE id = ?", [zoneId]);
    
    if (!zone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    const zips = await query("SELECT zip_code FROM shipping_zone_zips WHERE zone_id = ? ORDER BY zip_code", [zoneId]);

    return NextResponse.json({ zips: zips.map(z => z.zip_code) });
  } catch (error) {
    console.error("Error fetching ZIPs:", error);
    return NextResponse.json({ error: "Failed to fetch ZIPs" }, { status: 500 });
  }
}

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
    const { zipCode } = body;

    if (!/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({ error: "Invalid ZIP code format. Must be 5 digits." }, { status: 400 });
    }

    try {
      await query(
        "INSERT INTO shipping_zone_zips (zone_id, zip_code) VALUES (?, ?)",
        [zoneId, zipCode]
      );

      const { invalidateZoneCache } = await import("@/app/lib/shipping/zipZoneService");
      invalidateZoneCache();

      return NextResponse.json({ success: true, added: 1, duplicates: 0 });
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return NextResponse.json({ success: true, added: 0, duplicates: 1, duplicate: true });
      }
      throw err;
    }
  } catch (error) {
    console.error("Error adding ZIP:", error);
    return NextResponse.json({ error: "Failed to add ZIP code" }, { status: 500 });
  }
}