import { NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { getAdminFromRequest } from "@/app/lib/adminAuth";

export async function DELETE(request, { params }) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { zipCode } = await params;
    
    if (!/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({ error: "Invalid ZIP code format" }, { status: 400 });
    }

    await query("DELETE FROM shipping_zone_zips WHERE zip_code = ?", [zipCode]);

    const { invalidateZoneCache } = await import("@/app/lib/shipping/zipZoneService");
    invalidateZoneCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing ZIP:", error);
    return NextResponse.json({ error: "Failed to remove ZIP code" }, { status: 500 });
  }
}