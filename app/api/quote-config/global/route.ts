// Global Quote Config API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

async function getFullConfig() {
  const [
    decorations,
    colors,
    sizes,
    tiers,
    printLocations,
    turnarounds,
    designerHelp,
    shippingConfig,
    shippingRules,
  ] = await Promise.all([
    query('SELECT * FROM decoration_options ORDER BY display_order'),
    query('SELECT * FROM color_options ORDER BY display_order'),
    query('SELECT * FROM size_options ORDER BY display_order'),
    query('SELECT * FROM quantity_tiers ORDER BY display_order'),
    query('SELECT * FROM print_location_options ORDER BY display_order'),
    query('SELECT * FROM turnaround_options ORDER BY display_order'),
    query('SELECT * FROM designer_help_options ORDER BY display_order'),
    queryOne('SELECT * FROM shipping_config LIMIT 1'),
    query('SELECT * FROM shipping_rules ORDER BY display_order'),
  ]);

  return {
    decorations: decorations.map((d: any) => ({
      id: d.id,
      name: d.name,
      priceModifier: parseFloat(d.price_modifier),
      enabled: Boolean(d.enabled),
    })),
    colors: colors.map((c: any) => ({
      id: c.id,
      name: c.name,
      hex: c.hex,
      enabled: Boolean(c.enabled),
    })),
    sizes: sizes.map((s: any) => ({
      id: s.id,
      label: s.label,
      priceAddon: parseFloat(s.price_addon),
      baseEnabled: Boolean(s.base_enabled),
    })),
    quantityTiers: tiers.map((t: any) => ({
      id: t.id.toString(),
      minQty: t.min_qty,
      maxQty: t.max_qty,
      unitPrice: parseFloat(t.unit_price),
      discountPercent: t.discount_percent != null ? parseFloat(t.discount_percent) : 0,
      enabled: Boolean(t.enabled),
    })),
    printLocations: printLocations.map((p: any) => ({
      id: p.id,
      name: p.name,
      priceModifier: parseFloat(p.price_modifier),
      enabled: Boolean(p.enabled),
    })),
    turnarounds: turnarounds.map((t: any) => ({
      id: t.id,
      name: t.name,
      priceModifier: parseFloat(t.price_modifier),
      pricingType: t.pricing_type || 'flat',
      percentageValue: t.percentage_value != null ? parseFloat(t.percentage_value) : null,
      enabled: Boolean(t.enabled),
    })),
    designerHelp: designerHelp.map((d: any) => ({
      id: d.id,
      name: d.name,
      priceModifier: parseFloat(d.price_modifier),
      enabled: Boolean(d.enabled),
    })),
    shipping: {
      enabled: Boolean(shippingConfig?.enabled),
      defaultFlatRate: parseFloat(shippingConfig?.default_flat_rate || 0),
      rules: shippingRules.map((r: any) => ({
        id: r.id.toString(),
        ruleType: r.rule_type,
        stateCode: r.state_code,
        zipPrefix: r.zip_prefix,
        price: parseFloat(r.price),
        enabled: Boolean(r.enabled),
      })),
    },
  };
}

export async function GET() {
  try {
    const config = await getFullConfig();
    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Error fetching global quote config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // Update decorations if provided
    if (body.decorations) {
      for (const dec of body.decorations) {
        await query(
          `INSERT INTO decoration_options (id, name, price_modifier, enabled, display_order)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             price_modifier = VALUES(price_modifier),
             enabled = VALUES(enabled),
             display_order = VALUES(display_order)`,
          [
            dec.id,
            dec.name,
            dec.priceModifier || 0,
            dec.enabled !== false ? 1 : 0,
            dec.displayOrder || 0,
          ]
        );
      }
    }

    // Update colors if provided
    if (body.colors) {
      for (const col of body.colors) {
        await query(
          `INSERT INTO color_options (id, name, hex, enabled, display_order)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             hex = VALUES(hex),
             enabled = VALUES(enabled),
             display_order = VALUES(display_order)`,
          [
            col.id,
            col.name,
            col.hex,
            col.enabled !== false ? 1 : 0,
            col.displayOrder || 0,
          ]
        );
      }
    }

    // Update sizes if provided
    if (body.sizes) {
      for (const size of body.sizes) {
        await query(
          `INSERT INTO size_options (id, label, price_addon, base_enabled, display_order)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             label = VALUES(label),
             price_addon = VALUES(price_addon),
             base_enabled = VALUES(base_enabled),
             display_order = VALUES(display_order)`,
          [
            size.id,
            size.label,
            size.priceAddon || 0,
            size.baseEnabled !== false ? 1 : 0,
            size.displayOrder || 0,
          ]
        );
      }
    }

    // Update quantity tiers if provided
    if (body.quantityTiers) {
      for (const tier of body.quantityTiers) {
        const discount = Number(tier.discountPercent);
        await query(
          `INSERT INTO quantity_tiers (id, min_qty, max_qty, unit_price, discount_percent, enabled, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             min_qty = VALUES(min_qty),
             max_qty = VALUES(max_qty),
             unit_price = VALUES(unit_price),
             discount_percent = VALUES(discount_percent),
             enabled = VALUES(enabled),
             display_order = VALUES(display_order)`,
          [
            tier.id ? parseInt(tier.id) : null,
            tier.minQty,
            tier.maxQty || null,
            tier.unitPrice,
            Number.isFinite(discount) ? discount : 0,
            tier.enabled !== false ? 1 : 0,
            tier.displayOrder || 0,
          ]
        );
      }
    }

    // Update shipping config if provided
    if (body.shipping) {
      await query(
        `UPDATE shipping_config SET enabled = ?, default_flat_rate = ?`,
        [
          body.shipping.enabled !== false ? 1 : 0,
          body.shipping.defaultFlatRate || 0,
        ]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error updating global quote config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
