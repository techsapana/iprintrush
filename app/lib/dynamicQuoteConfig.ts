import { query, queryOne } from './db';

export async function getDynamicConfig(
  productId: string,
  schema: { mode: string; groups?: any[] },
  options: { includeDisabledPools?: boolean } = {},
) {
  const poolKeys = (schema.groups || [])
    .map((g: any) => g.poolKey)
    .filter(Boolean);

  if (poolKeys.length === 0) {
    return { pools: [], shipping: await getShippingConfig() };
  }

  const placeholders = poolKeys.map(() => '?').join(',');
  const pools = await query(
    `SELECT * FROM customization_option_pools WHERE \`key\` IN (${placeholders}) ORDER BY display_order`,
    poolKeys
  );

  const poolsWithOptions: any[] = [];
  let disabledPoolIds: string[] = [];
  try {
    const ps: any = await queryOne(
      'SELECT disabled_pool_ids_json FROM product_quote_settings WHERE product_id = ? LIMIT 1',
      [productId],
    );
    if (ps?.disabled_pool_ids_json) {
      const parsed =
        typeof ps.disabled_pool_ids_json === 'string'
          ? JSON.parse(ps.disabled_pool_ids_json)
          : ps.disabled_pool_ids_json;
      if (Array.isArray(parsed)) {
        disabledPoolIds = parsed.map((x: any) => String(x));
      }
    }
  } catch {
    disabledPoolIds = [];
  }

  for (const pool of pools as any[]) {
    const [options, productOverrides, qtyTiers, productQtyTiers] = await Promise.all([
      query(
        'SELECT * FROM customization_pool_options WHERE pool_id = ? AND enabled = TRUE ORDER BY display_order',
        [pool.id]
      ),
      query(
        'SELECT option_id, custom_price FROM product_pool_options WHERE product_id = ? AND pool_id = ? AND enabled = TRUE',
        [productId, pool.id]
      ),
      query(
        'SELECT * FROM customization_quantity_tiers WHERE pool_id = ? AND enabled = TRUE ORDER BY min_qty',
        [pool.id]
      ),
      query(
        'SELECT * FROM product_pool_quantity_tiers WHERE product_id = ? AND pool_id = ? AND enabled = TRUE ORDER BY min_qty',
        [productId, pool.id]
      ),
    ]);

    const overrideRows = productOverrides as any[];
    const selectedOptionIds = new Set(overrideRows.map((o: any) => String(o.option_id)));
    const overrideMap = Object.fromEntries(
      overrideRows
        .filter((o: any) => o.custom_price != null)
        .map((o: any) => [o.option_id, parseFloat(o.custom_price)])
    );

    // If product-specific rows exist for this pool, treat them as the allowed options list.
    // Otherwise, expose all enabled pool options (default behavior for new products).
    const shouldFilterByProductSelection = selectedOptionIds.size > 0;
    const opts = (options as any[])
      .filter((o: any) => !shouldFilterByProductSelection || selectedOptionIds.has(String(o.id)))
      .map((o: any) => ({
      id: o.id,
      label: o.label,
      value: o.value,
      priceModifier: overrideMap[o.id] ?? parseFloat(o.price_modifier || 0),
      enabled: true,
      }));

    const tiersToUse = (productQtyTiers as any[]).length > 0 ? productQtyTiers : qtyTiers;
    const quantityTiers = (tiersToUse as any[]).map((t: any) => ({
      minQty: t.min_qty,
      maxQty: t.max_qty,
      unitPrice: parseFloat(t.unit_price),
      discountPercent: t.discount_percent != null ? parseFloat(t.discount_percent) : 0,
      label: t.label,
    }));

    const mappedPool = {
      id: pool.id,
      key: pool.key,
      name: pool.name,
      selectionType: pool.selection_type,
      priceType: pool.price_type,
      options: opts,
      quantityTiers: pool.selection_type === 'quantity' ? quantityTiers : undefined,
    };

    if (options.includeDisabledPools || !disabledPoolIds.includes(String(pool.id))) {
      poolsWithOptions.push(mappedPool);
    }
  }

  const shipping = await getShippingConfig();
  return { pools: poolsWithOptions, shipping };
}

async function getShippingConfig() {
  const [cfg, shippingRules] = await Promise.all([
    queryOne('SELECT * FROM shipping_config LIMIT 1'),
    query('SELECT * FROM shipping_rules WHERE enabled = TRUE ORDER BY display_order'),
  ]);
  return {
    enabled: Boolean((cfg as any)?.enabled),
    defaultFlatRate: parseFloat((cfg as any)?.default_flat_rate || 0),
    rules: (shippingRules as any[]).map((r: any) => ({
      id: r.id.toString(),
      mode: r.rule_type || 'flat',
      state: r.state_code,
      zipPrefix: r.zip_prefix,
      flatRate: parseFloat(r.price || 0),
      enabled: true,
    })),
  };
}
