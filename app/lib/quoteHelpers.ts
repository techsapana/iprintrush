import { query, queryOne } from '@/app/lib/db';
import type {
  QuoteRequestPayload,
  QuoteConfigStore,
  DynamicQuoteRequestPayload,
  SimpleQuoteRequestPayload,
} from '@/app/lib/quoteConfigTypes';

export async function getProductQuantityBounds(productId: string): Promise<{ min: number | null; max: number | null }> {
  const row: any = await queryOne(
    'SELECT min_quantity, max_quantity FROM products WHERE id = ? LIMIT 1',
    [productId],
  );
  if (!row) return { min: null, max: null };
  const min = row.min_quantity != null ? Number(row.min_quantity) : null;
  const max = row.max_quantity != null ? Number(row.max_quantity) : null;
  return {
    min: Number.isFinite(min) && (min as number) > 0 ? min : null,
    max: Number.isFinite(max) && (max as number) > 0 ? max : null,
  };
}

export function assertTotalQuantityWithinProductBounds(
  total: number,
  bounds: { min: number | null; max: number | null },
): void {
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('Total quantity must be greater than zero');
  }
  if (bounds.min != null && total < bounds.min) {
    throw new Error(`Quantity must be at least ${bounds.min}.`);
  }
  if (bounds.max != null && total > bounds.max) {
    throw new Error(`Quantity may not exceed ${bounds.max}.`);
  }
}

export async function getProductOrderValueBounds(productId: string): Promise<{ min: number | null; max: number | null }> {
  const row: any = await queryOne(
    'SELECT min_order_value, max_order_value FROM products WHERE id = ? LIMIT 1',
    [productId],
  );
  if (!row) return { min: null, max: null };
  const min = row.min_order_value != null ? Number(row.min_order_value) : null;
  const max = row.max_order_value != null ? Number(row.max_order_value) : null;
  return {
    min: min != null && Number.isFinite(min) && (min as number) > 0 ? min : null,
    max: max != null && Number.isFinite(max) && (max as number) > 0 ? max : null,
  };
}

export function assertTotalValueWithinProductBounds(
  subtotal: number,
  bounds: { min: number | null; max: number | null },
): void {
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return;
  }
  if (bounds.min != null && subtotal < bounds.min) {
    throw new Error(
      `Minimum order value must be $${bounds.min.toFixed(2)}. Your current order value is $${subtotal.toFixed(2)}.`,
    );
  }
  if (bounds.max != null && subtotal > bounds.max) {
    throw new Error(
      `Maximum order value exceeded. Your current order value is $${subtotal.toFixed(2)}.`,
    );
  }
}

export async function getConfigWithCustomPrices(productId: string): Promise<QuoteConfigStore> {
  const [
    decorations,
    colors,
    sizes,
    globalTiers,
    printLocations,
    turnarounds,
    designerHelp,
    shippingConfigRows,
    shippingRules,
  ] = await Promise.all([
    query('SELECT * FROM decoration_options WHERE enabled = TRUE ORDER BY display_order'),
    query('SELECT * FROM color_options WHERE enabled = TRUE ORDER BY display_order'),
    query('SELECT * FROM size_options WHERE base_enabled = TRUE ORDER BY display_order'),
    query('SELECT * FROM quantity_tiers WHERE enabled = TRUE ORDER BY display_order'),
    query('SELECT * FROM print_location_options WHERE enabled = TRUE ORDER BY display_order'),
    query('SELECT * FROM turnaround_options WHERE enabled = TRUE ORDER BY display_order'),
    query('SELECT * FROM designer_help_options WHERE enabled = TRUE ORDER BY display_order'),
    query('SELECT * FROM shipping_config LIMIT 1'),
    query('SELECT * FROM shipping_rules WHERE enabled = TRUE ORDER BY display_order'),
  ]);

  const [
    productSettings,
    productDecorations,
    productSizes,
    productPrintLocations,
    productTurnarounds,
    productDesignerHelp,
    productQuantityTiers,
    productBasePrice,
  ] = await Promise.all([
    queryOne('SELECT * FROM product_quote_settings WHERE product_id = ?', [productId]),
    query('SELECT decoration_option_id as id, custom_price FROM product_decoration_options WHERE product_id = ?', [productId]),
    query('SELECT size_option_id as id, custom_price FROM product_size_options WHERE product_id = ?', [productId]),
    query('SELECT print_location_option_id as id, custom_price FROM product_print_location_options WHERE product_id = ?', [productId]),
    query('SELECT turnaround_option_id as id, custom_price, pricing_type, percentage_value FROM product_turnaround_options WHERE product_id = ?', [productId]),
    query('SELECT designer_help_option_id as id, custom_price FROM product_designer_help_options WHERE product_id = ?', [productId]),
    query('SELECT * FROM product_quantity_tiers WHERE product_id = ? AND enabled = TRUE ORDER BY display_order, min_qty', [productId]),
    queryOne('SELECT price, allow_custom_dimensions FROM products WHERE id = ? LIMIT 1', [productId]),
  ]);

  const customPrices = {
    decorations: Object.fromEntries(
      productDecorations.filter((d: any) => d.custom_price !== null).map((d: any) => [d.id, parseFloat(d.custom_price)])
    ),
    sizes: Object.fromEntries(
      productSizes.filter((s: any) => s.custom_price !== null).map((s: any) => [s.id, parseFloat(s.custom_price)])
    ),
    printLocations: Object.fromEntries(
      productPrintLocations.filter((p: any) => p.custom_price !== null).map((p: any) => [p.id, parseFloat(p.custom_price)])
    ),
    turnarounds: Object.fromEntries(
      productTurnarounds.filter((t: any) => t.custom_price !== null).map((t: any) => [t.id, parseFloat(t.custom_price)])
    ),
    designerHelp: Object.fromEntries(
      productDesignerHelp.filter((d: any) => d.custom_price !== null).map((d: any) => [d.id, parseFloat(d.custom_price)])
    ),
  };

  const tiersToUse = productQuantityTiers.length > 0 ? productQuantityTiers : globalTiers;
  const shippingConfig = shippingConfigRows[0] || { enabled: true, default_flat_rate: 0 };

  return {
    decorations: decorations.map((d: any) => ({
      id: d.id,
      name: d.name,
      priceModifier: customPrices.decorations[d.id] ?? parseFloat(d.price_modifier),
      enabled: true,
    })),
    colors: colors.map((c: any) => ({
      id: c.id,
      name: c.name,
      hex: c.hex,
      enabled: true,
    })),
    sizes: sizes.map((s: any) => ({
      id: String(s.id),
      label: s.label,
      priceAddon: customPrices.sizes[s.id] ?? parseFloat(s.price_addon),
      baseEnabled: true,
    })),
    quantityTiers: tiersToUse.map((t: any) => ({
      id: t.id.toString(),
      minQty: t.min_qty,
      maxQty: t.max_qty,
      discountType: (t.discount_type === 'PERCENT' || t.discount_type === 'FIXED') ? t.discount_type : 'NONE',
      discountValue: Number.isFinite(parseFloat(t.discount_value)) ? parseFloat(t.discount_value) : 0,
      enabled: true,
    })),
    printLocations: printLocations.map((p: any) => ({
      id: p.id,
      name: p.name,
      priceModifier: customPrices.printLocations[p.id] ?? parseFloat(p.price_modifier),
      enabled: true,
    })),
    turnarounds: turnarounds.map((t: any) => {
      const productOverride = productTurnarounds?.find(
        (p: any) => p.turnaround_option_id === t.id
      );

      return {
        id: t.id,
        name: t.name,
        priceModifier: productOverride?.custom_price ?? parseFloat(t.price_modifier),
        pricingType: productOverride?.pricing_type ?? t.pricing_type,
        percentageValue: productOverride?.percentage_value ?? t.percentage_value,
        enabled: true,
      };
    }),
    designerHelp: designerHelp.map((d: any) => ({
      id: d.id,
      name: d.name,
      priceModifier: customPrices.designerHelp[d.id] ?? parseFloat(d.price_modifier),
      enabled: true,
    })),
    shipping: {
      enabled: Boolean(shippingConfig.enabled),
      defaultFlatRate: parseFloat(shippingConfig.default_flat_rate || 0),
      oversizedWidthThresholdIn: parseFloat(shippingConfig.oversized_width_threshold_in || 0),
      oversizedWeightThresholdLb: parseFloat(shippingConfig.oversized_weight_threshold_lb || 0),
      under100Rate: parseFloat(shippingConfig.under_100_rate || 0),
      between100And199Rate: parseFloat(shippingConfig.between_100_199_rate || 0),
      over200Rate: parseFloat(shippingConfig.over_200_rate || 0),
      localUnder100Rate: parseFloat(shippingConfig.local_under_100_rate || 0),
      localBetween100And199Rate: parseFloat(shippingConfig.local_between_100_199_rate || 0),
      localOver200Rate: parseFloat(shippingConfig.local_over_200_rate || 0),
      rules: shippingRules.map((r: any) => ({
        id: r.id.toString(),
        mode: r.rule_type === 'flat' ? 'flat' : r.rule_type === 'state' ? 'state' : 'zip',
        flatRate: parseFloat(r.price),
        state: r.state_code || undefined,
        zipPrefix: r.zip_prefix || undefined,
        enabled: true,
      })),
    },
    productSettings: [],
    allowCustomDimensions: Boolean(productBasePrice?.allow_custom_dimensions),
    baseUnitPrice: productBasePrice?.price != null ? Number(productBasePrice.price) : null,
  };
}
