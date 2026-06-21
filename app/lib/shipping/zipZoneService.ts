/**
 * ZIP Zone Service — lookup only, no pricing logic.
 * All local-delivery zone resolution happens here.
 * Engine and Stripe layers never import this module.
 */

import { query } from '@/app/lib/db';

export type ShippingZoneRow = {
  id: number;
  zone_name: string;
  delivery_fee: number;
  free_delivery_minimum: number;
  enabled: boolean;
  same_day_delivery: boolean;
  cutoff_time: string | null;
  delivery_window: string | null;
  display_order: number;
};

const CACHE_TTL_MS = 60_000; // 1 minute

type CacheEntry = {
  byZip: Map<string, ShippingZoneRow>;
  expiresAt: number;
};

let cache: CacheEntry | null = null;

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() < entry.expiresAt;
}

async function loadZonesFromDb(): Promise<Map<string, ShippingZoneRow>> {
  const rows: any[] = await query(`
    SELECT z.id, z.zone_name, z.delivery_fee, z.free_delivery_minimum,
           z.enabled, z.same_day_delivery, z.cutoff_time, z.delivery_window, z.display_order,
           sz.zip_code
    FROM shipping_zones z
    JOIN shipping_zone_zips sz ON sz.zone_id = z.id
    WHERE z.enabled = TRUE
    ORDER BY z.display_order ASC, z.id ASC
  `);

  const byZip = new Map<string, ShippingZoneRow>();

  for (const r of rows) {
    const zip = String(r.zip_code || '').trim();
    if (!zip || !/^\d{5}$/.test(zip)) continue;
    if (byZip.has(zip)) continue; // first-seen wins (lowest display_order)
    byZip.set(zip, {
      id: Number(r.id),
      zone_name: String(r.zone_name),
      delivery_fee: Number(r.delivery_fee),
      free_delivery_minimum: Number(r.free_delivery_minimum),
      enabled: Boolean(r.enabled),
      same_day_delivery: Boolean(r.same_day_delivery),
      cutoff_time: r.cutoff_time ? String(r.cutoff_time) : null,
      delivery_window: r.delivery_window ? String(r.delivery_window) : null,
      display_order: Number(r.display_order),
    });
  }

  return byZip;
}

async function getCache(): Promise<Map<string, ShippingZoneRow>> {
  if (!cache || !isCacheValid(cache)) {
    cache = {
      byZip: await loadZonesFromDb(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
  }
  return cache.byZip;
}

/**
 * Lookup zone by exact 5-digit ZIP.
 * Returns null if no zone found or zone is disabled.
 */
export async function lookupZoneByZip(zip: string | null | undefined): Promise<ShippingZoneRow | null> {
  const normalized = String(zip || '').trim();
  if (!/^\d{5}$/.test(normalized)) return null;

  const byZip = await getCache();
  const zone = byZip.get(normalized) || null;
  if (zone && !zone.enabled) return null;
  return zone;
}

/**
 * All enabled zones (for admin UI). Bypasses stale cache.
 */
export async function getEnabledZones(): Promise<ShippingZoneRow[]> {
  const byZip = await getCache();
  const seen = new Set<number>();
  const zones: ShippingZoneRow[] = [];
  for (const zone of byZip.values()) {
    if (!seen.has(zone.id)) {
      seen.add(zone.id);
      zones.push(zone);
    }
  }
  return zones;
}

/**
 * Shorthand: does this ZIP have an enabled zone?
 */
export async function isZipInZone(zip: string | null | undefined): Promise<boolean> {
  return (await lookupZoneByZip(zip)) !== null;
}

/**
 * Force cache refresh. Call after any admin CRUD mutation.
 */
export function invalidateZoneCache(): void {
  cache = null;
}
