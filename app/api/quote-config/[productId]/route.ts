// Product Quote Settings API - MySQL-backed with custom pricing support
// Supports both apparel (legacy) and dynamic print_product customization
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

async function getProductWithCategory(productId: string) {
   const product = await queryOne(
     `SELECT p.*, c.id as cat_id, c.customization_schema, p.allow_custom_dimensions
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?`,
     [productId]
   );
   return product;
 }

async function getFullConfig() {
  // Fetch all quote configuration from database
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
  ] = (await Promise.all([
    query('SELECT * FROM decoration_options ORDER BY display_order'),
    query('SELECT * FROM color_options ORDER BY display_order'),
    query('SELECT * FROM size_options ORDER BY display_order'),
    query('SELECT * FROM quantity_tiers ORDER BY display_order'),
    query('SELECT * FROM print_location_options ORDER BY display_order'),
    query('SELECT * FROM turnaround_options ORDER BY display_order'),
    query('SELECT * FROM designer_help_options ORDER BY display_order'),
    queryOne('SELECT * FROM shipping_config LIMIT 1'),
    query('SELECT * FROM shipping_rules ORDER BY display_order'),
  ])) as any[];

  return {
    decorations: (decorations as any[]).map((d: any) => ({
      id: d.id,
      name: d.name,
      priceModifier: parseFloat(d.price_modifier),
      enabled: Boolean(d.enabled),
    })),
    colors: (colors as any[]).map((c: any) => ({
      id: c.id,
      name: c.name,
      hex: c.hex,
      enabled: Boolean(c.enabled),
    })),
    sizes: (sizes as any[]).map((s: any) => ({
      id: s.id,
      label: s.label,
      priceAddon: parseFloat(s.price_addon),
      baseEnabled: Boolean(s.base_enabled),
    })),
    quantityTiers: (tiers as any[]).map((t: any) => ({
      id: t.id.toString(),
      minQty: t.min_qty,
      maxQty: t.max_qty,
      unitPrice: parseFloat(t.unit_price),
      discountPercent: t.discount_percent != null ? parseFloat(t.discount_percent) : 0,
      enabled: Boolean(t.enabled),
    })),
    printLocations: (printLocations as any[]).map((p: any) => ({
      id: p.id,
      name: p.name,
      priceModifier: parseFloat(p.price_modifier),
      enabled: Boolean(p.enabled),
    })),
turnarounds: (turnarounds as any[]).map((t: any) => ({
       id: t.id,
       name: t.name,
       priceModifier: parseFloat(t.price_modifier),
       enabled: Boolean(t.enabled),
       pricingType: t.pricing_type || 'flat',
       percentageValue: t.percentage_value != null ? parseFloat(t.percentage_value) : null,
     })),
    designerHelp: (designerHelp as any[]).map((d: any) => ({
      id: d.id,
      name: d.name,
      priceModifier: parseFloat(d.price_modifier),
      enabled: Boolean(d.enabled),
    })),
    shipping: {
      enabled: Boolean(shippingConfig?.enabled),
      defaultFlatRate: parseFloat(shippingConfig?.default_flat_rate || 0),
      rules: (shippingRules as any[]).map((r: any) => ({
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;
    const forAdmin = request.nextUrl.searchParams.get('admin') === '1';

    let schema: { mode?: string; groups?: any[] } | null = null;
    let productWithCat: any = null;
    
    try {
      productWithCat = await getProductWithCategory(productId);
      if (productWithCat?.customization_schema) {
        schema = typeof productWithCat.customization_schema === 'string'
          ? JSON.parse(productWithCat.customization_schema)
          : productWithCat.customization_schema;
      }
    } catch {
      schema = null;
    }

    // Dynamic print_product mode: return schema + pools
    if (schema?.mode === 'print_product') {
      const { getDynamicConfig } = await import('@/app/lib/dynamicQuoteConfig');
      const { pools, shipping } = await getDynamicConfig(productId, {
        mode: schema.mode || 'print_product',
        groups: schema.groups || [],
      }, { includeDisabledPools: forAdmin });

      const rawGroups = schema.groups || [];
      const poolKeys = new Set((pools as any[]).map((p) => String(p.key)));
      const groupsForClient = forAdmin
        ? rawGroups
        : rawGroups.filter((g: any) => poolKeys.has(String(g.poolKey)));

      const productSettings = await queryOne(
        'SELECT disabled_pool_ids_json FROM product_quote_settings WHERE product_id = ? LIMIT 1',
        [productId],
      );
      let disabledPoolIds: string[] = [];
      if (productSettings?.disabled_pool_ids_json) {
        try {
          const parsed =
            typeof productSettings.disabled_pool_ids_json === 'string'
              ? JSON.parse(productSettings.disabled_pool_ids_json)
              : productSettings.disabled_pool_ids_json;
          if (Array.isArray(parsed)) {
            disabledPoolIds = parsed.map((x: any) => String(x));
          }
        } catch {}
      }

      const enabledRow = await queryOne(
        'SELECT enabled FROM product_quote_settings WHERE product_id = ? LIMIT 1',
        [productId],
      );
      const enabled = enabledRow ? Boolean(enabledRow.enabled) : true;

      const dimensionPricing =
        productWithCat && 'min_width_in' in productWithCat
          ? {
              minWidthIn:
                productWithCat.min_width_in != null ? Number(productWithCat.min_width_in) : null,
              maxWidthIn:
                productWithCat.max_width_in != null ? Number(productWithCat.max_width_in) : null,
              minHeightIn:
                productWithCat.min_height_in != null ? Number(productWithCat.min_height_in) : null,
              maxHeightIn:
                productWithCat.max_height_in != null ? Number(productWithCat.max_height_in) : null,
              pricePerSqInch:
                productWithCat.price_per_sq_inch != null
                  ? Number(productWithCat.price_per_sq_inch)
                  : null,
            }
          : null;

       return NextResponse.json({
         mode: 'print_product',
         schema: { mode: 'print_product', groups: groupsForClient },
         pools,
         shipping,
         dimensionPricing,
         enabled,
         disabledPoolIds,
         allowCustomDimensions: Boolean(productWithCat?.allow_custom_dimensions),
       });
    }

    // Apparel mode: existing flow
    const config = await getFullConfig();

    // Get product-specific settings
    const productSettings = await queryOne(
      'SELECT * FROM product_quote_settings WHERE product_id = ?',
      [productId]
    );

    // Get all option IDs and custom prices for this product
    const [
      decorationOptions,
      colorIds,
      sizeOptions,
      printLocationOptions,
      turnaroundOptions,
      designerHelpOptions,
      customQuantityTiers,
    ] = (await Promise.all([
      query(
        'SELECT decoration_option_id as id, custom_price FROM product_decoration_options WHERE product_id = ?',
        [productId]
      ),
      query(
        'SELECT color_option_id as id FROM product_color_options WHERE product_id = ?',
        [productId]
      ),
      query(
        'SELECT size_option_id as id, custom_price FROM product_size_options WHERE product_id = ?',
        [productId]
      ),
      query(
        'SELECT print_location_option_id as id, custom_price FROM product_print_location_options WHERE product_id = ?',
        [productId]
      ),
query(
         'SELECT turnaround_option_id as id, custom_price, pricing_type, percentage_value FROM product_turnaround_options WHERE product_id = ?',
         [productId]
       ),
      query(
        'SELECT designer_help_option_id as id, custom_price FROM product_designer_help_options WHERE product_id = ?',
        [productId]
      ),
      query(
        'SELECT * FROM product_quantity_tiers WHERE product_id = ? ORDER BY display_order, min_qty',
        [productId]
      ),
    ])) as any[];

// Build custom prices maps
     const customPrices = {
       decorations: Object.fromEntries(
         decorationOptions.map((d: any) => [d.id, d.custom_price !== null ? parseFloat(d.custom_price) : null])
       ),
       sizes: Object.fromEntries(
         sizeOptions.map((s: any) => [s.id, s.custom_price !== null ? parseFloat(s.custom_price) : null])
       ),
       printLocations: Object.fromEntries(
         printLocationOptions.map((p: any) => [p.id, p.custom_price !== null ? parseFloat(p.custom_price) : null])
       ),
       turnarounds: Object.fromEntries(
         turnaroundOptions.map((t: any) => [t.id, t.custom_price !== null ? parseFloat(t.custom_price) : null])
       ),
       designerHelp: Object.fromEntries(
         designerHelpOptions.map((d: any) => [d.id, d.custom_price !== null ? parseFloat(d.custom_price) : null])
       ),
     };

     // Build custom turnaround pricing info
     const customTurnaroundPricing = Object.fromEntries(
       turnaroundOptions.map((t: any) => [t.id, {
         pricingType: t.pricing_type || 'flat',
         percentageValue: t.percentage_value != null ? parseFloat(t.percentage_value) : null,
       }])
     );

    // If no settings exist, create default with all enabled options
    if (!productSettings) {
      const defaultSettings = {
        productId,
        enabled: true,
        useCustomQuantityTiers: true,
        decorationOptionIds: config.decorations
          .filter((d) => d.enabled)
          .map((d) => d.id),
        colorOptionIds: config.colors.filter((c) => c.enabled).map((c) => c.id),
        sizeOptionIds: config.sizes.filter((s) => s.baseEnabled).map((s) => s.id),
        printLocationOptionIds: config.printLocations
          .filter((p) => p.enabled)
          .map((p) => p.id),
        turnaroundOptionIds: config.turnarounds
          .filter((t) => t.enabled)
          .map((t) => t.id),
        designerHelpOptionIds: config.designerHelp
          .filter((d) => d.enabled)
          .map((d) => d.id),
        quantityTierIds: config.quantityTiers
          .filter((t) => t.enabled)
          .map((t) => t.id),
        customPrices: {},
        customQuantityTiers: config.quantityTiers
          .filter((t) => t.enabled)
          .map((t) => ({
            id: t.id.toString(),
            minQty: t.minQty,
            maxQty: t.maxQty,
            unitPrice: t.unitPrice,
            discountPercent: t.discountPercent != null ? Number(t.discountPercent) : 0,
            enabled: true,
          })),
      };

      return NextResponse.json({
        config,
        productSettings: defaultSettings,
      });
    }

     const settings = {
        productId,
        enabled: Boolean(productSettings.enabled),
        useCustomQuantityTiers: Boolean(productSettings.use_custom_quantity_tiers),
        decorationOptionIds: (decorationOptions as any[]).map((r: any) => r.id),
        colorOptionIds: (colorIds as any[]).map((r: any) => r.id),
        sizeOptionIds: (sizeOptions as any[]).map((r: any) => r.id),
        printLocationOptionIds: (printLocationOptions as any[]).map((r: any) => r.id),
        turnaroundOptionIds: (turnaroundOptions as any[]).map((r: any) => r.id),
        designerHelpOptionIds: (designerHelpOptions as any[]).map((r: any) => r.id),
        quantityTierIds: config.quantityTiers
          .filter((t) => t.enabled)
          .map((t) => t.id.toString()),
        customPrices,
        customQuantityTiers: (customQuantityTiers as any[]).map((t: any) => ({
          id: t.id.toString(),
          minQty: t.min_qty,
          maxQty: t.max_qty,
          unitPrice: parseFloat(t.unit_price),
          discountPercent:
            t.discount_percent != null ? parseFloat(t.discount_percent) : 0,
          enabled: Boolean(t.enabled),
        })),
        customTurnaroundPricing,
        allowCustomDimensions: Boolean(productWithCat?.allow_custom_dimensions),
      };

     return NextResponse.json({
       config,
       productSettings: settings,
     });
  } catch (error: any) {
    console.error('Error fetching product quote config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quote configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;
    const body = await req.json();
    const customPrices = body.customPrices || {};

    if (body.customQuantityTiers && Array.isArray(body.customQuantityTiers)) {
      const bad = (body.customQuantityTiers as any[]).find(
        (t) => Number(t.unitPrice || 0) > 0 && Number(t.discountPercent || 0) > 0,
      );
      if (bad) {
        return NextResponse.json(
          { error: 'Each quantity tier must use either Unit Price OR Discount %, not both.' },
          { status: 400 },
        );
      }
    }

    if (body.poolQuantityTiers && typeof body.poolQuantityTiers === 'object') {
      for (const tiers of Object.values(body.poolQuantityTiers as Record<string, any[]>)) {
        if (!Array.isArray(tiers)) continue;
        const bad = tiers.find(
          (t) => Number(t.unitPrice || 0) > 0 && Number(t.discountPercent || 0) > 0,
        );
        if (bad) {
          return NextResponse.json(
            { error: 'Each pool quantity tier must use either Unit Price OR Discount %, not both.' },
            { status: 400 },
          );
        }
      }
    }

    // Ensure product_quote_settings exists
    await query(
      `INSERT INTO product_quote_settings (product_id, enabled, use_custom_quantity_tiers, disabled_pool_ids_json)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         enabled = VALUES(enabled),
         use_custom_quantity_tiers = VALUES(use_custom_quantity_tiers),
         disabled_pool_ids_json = VALUES(disabled_pool_ids_json)`,
      [
        productId, 
        body.enabled !== false ? 1 : 0,
        body.useCustomQuantityTiers ? 1 : 0,
        JSON.stringify(Array.isArray(body.disabledPoolIds) ? body.disabledPoolIds : []),
      ]
    );

    // Update decoration options with custom prices
    if (body.decorationOptionIds) {
      await query(
        'DELETE FROM product_decoration_options WHERE product_id = ?',
        [productId]
      );
      if (body.decorationOptionIds.length > 0) {
        const values = body.decorationOptionIds.map((id: string) => [
          productId,
          id,
          customPrices.decorations?.[id] ?? null,
        ]);
        await query(
          'INSERT INTO product_decoration_options (product_id, decoration_option_id, custom_price) VALUES ?',
          [values]
        );
      }
    }

    // Update color options (no custom prices for colors)
    if (body.colorOptionIds) {
      await query('DELETE FROM product_color_options WHERE product_id = ?', [
        productId,
      ]);
      if (body.colorOptionIds.length > 0) {
        const values = body.colorOptionIds.map((id: string) => [productId, id]);
        await query(
          'INSERT INTO product_color_options (product_id, color_option_id) VALUES ?',
          [values]
        );
      }
    }

    // Update size options with custom prices
    if (body.sizeOptionIds) {
      await query('DELETE FROM product_size_options WHERE product_id = ?', [
        productId,
      ]);
      if (body.sizeOptionIds.length > 0) {
        const values = body.sizeOptionIds.map((id: string) => [
          productId, 
          id,
          customPrices.sizes?.[id] ?? null,
        ]);
        await query(
          'INSERT INTO product_size_options (product_id, size_option_id, custom_price) VALUES ?',
          [values]
        );
      }
    }

    // Update print location options with custom prices
    if (body.printLocationOptionIds) {
      await query(
        'DELETE FROM product_print_location_options WHERE product_id = ?',
        [productId]
      );
      if (body.printLocationOptionIds.length > 0) {
        const values = body.printLocationOptionIds.map((id: string) => [
          productId,
          id,
          customPrices.printLocations?.[id] ?? null,
        ]);
        await query(
          'INSERT INTO product_print_location_options (product_id, print_location_option_id, custom_price) VALUES ?',
          [values]
        );
      }
    }

     // Update turnaround options with custom prices
     if (body.turnaroundOptionIds) {
       await query(
         'DELETE FROM product_turnaround_options WHERE product_id = ?',
         [productId]
       );
       if (body.turnaroundOptionIds.length > 0) {
         const values = body.turnaroundOptionIds.map((id: string) => {
           const customPrice = customPrices.turnarounds?.[id] ?? null;
           const turnaroundPricing = body.customTurnaroundPricing?.[id] || {};
           return [
             productId,
             id,
             customPrice,
             turnaroundPricing.pricingType ?? 'flat',
             turnaroundPricing.percentageValue ?? null,
           ];
         });
         await query(
           'INSERT INTO product_turnaround_options (product_id, turnaround_option_id, custom_price, pricing_type, percentage_value) VALUES ?',
           [values]
         );
       }
     }

    // Update designer help options with custom prices
    if (body.designerHelpOptionIds) {
      await query(
        'DELETE FROM product_designer_help_options WHERE product_id = ?',
        [productId]
      );
      if (body.designerHelpOptionIds.length > 0) {
        const values = body.designerHelpOptionIds.map((id: string) => [
          productId,
          id,
          customPrices.designerHelp?.[id] ?? null,
        ]);
        await query(
          'INSERT INTO product_designer_help_options (product_id, designer_help_option_id, custom_price) VALUES ?',
          [values]
        );
      }
    }

    // Update custom quantity tiers
    if (body.customQuantityTiers !== undefined) {
      await query('DELETE FROM product_quantity_tiers WHERE product_id = ?', [productId]);
      if (body.customQuantityTiers && body.customQuantityTiers.length > 0) {
        const values = body.customQuantityTiers.map((tier: any, idx: number) => {
          const discount = Number(tier.discountPercent);
          return [
            productId,
            tier.minQty,
            tier.maxQty || null,
            tier.unitPrice,
            Number.isFinite(discount) ? discount : 0,
            tier.enabled !== false ? 1 : 0,
            idx,
          ];
        });
        await query(
          'INSERT INTO product_quantity_tiers (product_id, min_qty, max_qty, unit_price, discount_percent, enabled, display_order) VALUES ?',
          [values]
        );
      }
    }

    // Update product pool options (for print_product categories)
    if (body.poolOptions !== undefined) {
      await query('DELETE FROM product_pool_options WHERE product_id = ?', [productId]);
      const poolOptions = body.poolOptions as Record<string, Array<{ id: string; customPrice?: number | null; pricingType?: string; percentageValue?: number | null }>>;
      if (poolOptions && typeof poolOptions === 'object') {
        for (const [poolId, opts] of Object.entries(poolOptions)) {
          if (!Array.isArray(opts) || opts.length === 0) continue;
          const values = opts.map((opt: any, idx: number) => {
            const optionId = typeof opt === 'object' && opt?.id ? opt.id : opt;
            const customPrice =
              typeof opt === 'object' && opt?.customPrice != null ? opt.customPrice : null;
            const pricingType = typeof opt === 'object' && opt?.pricingType ? opt.pricingType : 'flat';
            const percentageValue =
              typeof opt === 'object' && opt?.percentageValue != null ? opt.percentageValue : null;
            return [productId, poolId, optionId, customPrice, pricingType, percentageValue, 1, idx];
          });
          if (values.length > 0) {
            await query(
              'INSERT INTO product_pool_options (product_id, pool_id, option_id, custom_price, pricing_type, percentage_value, enabled, display_order) VALUES ?',
              [values]
            );
          }
        }
      }
    }

    // Update product pool quantity tiers (for print_product quantity pools)
    if (body.poolQuantityTiers !== undefined && body.poolQuantityTiers && typeof body.poolQuantityTiers === 'object') {
      await query('DELETE FROM product_pool_quantity_tiers WHERE product_id = ?', [productId]);
      for (const [poolId, tiers] of Object.entries(body.poolQuantityTiers as Record<string, any[]>)) {
        if (!Array.isArray(tiers) || tiers.length === 0) continue;
        const values = tiers
          .map((tier: any, idx: number) => {
            const discount = Number(tier.discountPercent);
            return [
              productId,
              poolId,
              tier.minQty,
              tier.maxQty || null,
              tier.unitPrice,
              Number.isFinite(discount) ? discount : 0,
              tier.enabled !== false ? 1 : 0,
              idx,
            ];
          })
          .filter(
            (row: any[]) =>
              Number.isFinite(Number(row[2])) && Number.isFinite(Number(row[4])),
          );
        if (values.length > 0) {
          await query(
            'INSERT INTO product_pool_quantity_tiers (product_id, pool_id, min_qty, max_qty, unit_price, discount_percent, enabled, display_order) VALUES ?',
            [values]
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error updating product quote settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
