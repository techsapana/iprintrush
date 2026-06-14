// Quote Calculation API - MySQL-backed with unified shipping
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';
import { calculateUnifiedQuote } from '@/app/lib/quoteEngine';
import { normalizeQuoteRequest } from '@/app/lib/quote/QuoteNormalizer';
import type {
  QuoteRequestPayload,
  QuoteConfigStore,
  DynamicQuoteRequestPayload,
} from '@/app/lib/quoteConfigTypes';

async function getProductQuantityBounds(productId: string): Promise<{ min: number | null; max: number | null }> {
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

function assertTotalQuantityWithinProductBounds(
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

async function getProductOrderValueBounds(productId: string): Promise<{ min: number | null; max: number | null }> {
  const row: any = await queryOne(
    'SELECT min_order_value, max_order_value FROM products WHERE id = ? LIMIT 1',
    [productId],
  );
  if (!row) return { min: null, max: null };
  const min = row.min_order_value != null ? Number(row.min_order_value) : null;
  const max = row.max_order_value != null ? Number(row.max_order_value) : null;
  return {
    min: Number.isFinite(min) && min > 0 ? min : null,
    max: Number.isFinite(max) && max > 0 ? max : null,
  };
}

function assertTotalValueWithinProductBounds(
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

async function getConfigWithCustomPrices(productId: string): Promise<QuoteConfigStore> {
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
    queryOne('SELECT price FROM products WHERE id = ? LIMIT 1', [productId]),
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
      id: s.id,
      label: s.label,
      priceAddon: customPrices.sizes[s.id] ?? parseFloat(s.price_addon),
      baseEnabled: true,
    })),
quantityTiers: tiersToUse.map((t: any) => ({
       id: t.id.toString(),
       minQty: t.min_qty,
       maxQty: t.max_qty,
       unitPrice: parseFloat(t.unit_price),
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
    turnarounds: turnarounds.map((t: any) => ({
      id: t.id,
      name: t.name,
      priceModifier: customPrices.turnarounds[t.id] ?? parseFloat(t.price_modifier),
      enabled: true,
    })),
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
    baseUnitPrice: productBasePrice?.price != null ? Number(productBasePrice.price) : null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Handle mailbox mode separately (no unification needed - different domain)
    if (payload.mode === 'mailbox') {
      return handleMailboxQuote(payload);
    }

    // Apparel mode
    if (!payload.mode || payload.mode === 'apparel') {
      return handleApparelQuote(payload);
    }

    // Print product mode
    if (payload.mode === 'print_product' && payload.selections) {
      return handlePrintProductQuote(payload);
    }

    return NextResponse.json({ error: 'Invalid quote mode specified' }, { status: 400 });
  } catch (err: any) {
    console.error('Quote calculation error:', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to calculate quote' }, { status: 400 });
  }
}

async function handleMailboxQuote(payload: any) {
  const productId = String(payload.productId || '');
  const months = Number(payload.months);

  if (!productId) throw new Error('Product ID is required for mailbox quote.');
  if (!Number.isFinite(months) || months <= 0) throw new Error('Months must be a positive number.');

  const product = await queryOne(
    `SELECT p.id, p.price, p.mailbox_price_per_month, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
    [productId],
  );

  if (!product) throw new Error('Product not found for mailbox quote.');
  if (product.category_slug && product.category_slug !== 'mailbox-notary') {
    throw new Error('Mailbox quotes are only supported for the Mailbox & Notary category.');
  }

  const pricePerMonth = product.mailbox_price_per_month != null
    ? Number(product.mailbox_price_per_month)
    : Number(product.price || 0);

  if (!Number.isFinite(pricePerMonth) || pricePerMonth <= 0) {
    throw new Error('Price per month is not configured for this mailbox product.');
  }

  const tiers = await query('SELECT min_months, max_months, discount_percent FROM mailbox_discount_rules ORDER BY min_months ASC');

  let discountPercent = 0;
  if (Array.isArray(tiers) && tiers.length > 0) {
    for (const tier of tiers as any[]) {
      const min = Number(tier.min_months);
      const max = tier.max_months != null ? Number(tier.max_months) : null;
      if (months >= min && (max == null || months <= max)) {
        discountPercent = Number(tier.discount_percent || 0);
        break;
      }
    }
  } else {
    if (months >= 21) discountPercent = 25;
    else if (months >= 11) discountPercent = 15;
    else if (months >= 6) discountPercent = 10;
  }

  discountPercent = Math.min(discountPercent, 25);
  if (discountPercent < 0) discountPercent = 0;

  const baseTotal = pricePerMonth * months;
  const discountAmount = (baseTotal * discountPercent) / 100;
  const subtotal = baseTotal - discountAmount;

  const lineItems: { label: string; amount: number }[] = [{
    label: `Base (${months} month${months === 1 ? '' : 's'} @ $${pricePerMonth.toFixed(2)}/month)`,
    amount: baseTotal,
  }];

  if (discountPercent > 0 && discountAmount > 0) {
    lineItems.push({
      label: `Discount (${discountPercent.toFixed(2)}% for ${months} month${months === 1 ? '' : 's'})`,
      amount: -discountAmount,
    });
  }

  return NextResponse.json({
    productId,
    totalQuantity: months,
    unitPrice: months > 0 ? subtotal / months : 0,
    sizeBreakdown: [{ sizeLabel: `${months} month${months === 1 ? '' : 's'}`, quantity: months }],
    lineItems,
    subtotal,
    shipping: 0,
    grandTotal: subtotal,
  });
}

async function handleApparelQuote(payload: QuoteRequestPayload) {
  const apparelTotal = (payload.quantities || []).reduce((s, q: any) => {
    const n = Number(q?.quantity ?? 0);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);

  const qtyBounds = await getProductQuantityBounds(String(payload.productId));
  assertTotalQuantityWithinProductBounds(apparelTotal, qtyBounds);

  const config = await getConfigWithCustomPrices(payload.productId);

  // Normalize the apparel payload
  const unifiedRequest = normalizeQuoteRequest(payload, config.sizes);

  // Use the unified engine - shipping is calculated from DB config
  const summary = calculateUnifiedQuote(
    config,
    [],
    unifiedRequest,
    undefined,
    payload.shippingState,
    payload.shippingZip,
  );

  const valueBounds = await getProductOrderValueBounds(String(payload.productId));
  assertTotalValueWithinProductBounds(summary.subtotal, valueBounds);

  return NextResponse.json(summary);
}

async function handlePrintProductQuote(payload: DynamicQuoteRequestPayload) {
  const qtyBounds = await getProductQuantityBounds(String(payload.productId));

  const productWithCat = await queryOne(
    'SELECT p.id, p.price, p.min_width_in, p.max_width_in, p.min_height_in, p.max_height_in, p.price_per_sq_inch, c.customization_schema FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
    [payload.productId],
  );

  let schema: any = { mode: 'print_product', groups: [] };
  if (productWithCat?.customization_schema) {
    try {
      schema = typeof productWithCat.customization_schema === 'string'
        ? JSON.parse(productWithCat.customization_schema)
        : productWithCat.customization_schema;
    } catch {}
  }

  const { getDynamicConfig } = await import('@/app/lib/dynamicQuoteConfig');
  const { pools } = await getDynamicConfig(payload.productId, schema);

  // Get config for apparel-style options
  const config = await getConfigWithCustomPrices(payload.productId);

  // Normalize the print product payload
  const unifiedRequest = normalizeQuoteRequest(payload, pools);

  // Validate quantity
  const totalQty = unifiedRequest.quantityBreakdown.reduce((sum, q) => sum + q.quantity, 0);
  if (!Number.isFinite(totalQty) || totalQty <= 0) {
    throw new Error('Please enter a valid quantity.');
  }
  assertTotalQuantityWithinProductBounds(totalQty, qtyBounds);

  // Build dimension pricing if applicable
  const dimensionPricing = productWithCat
    ? {
        minWidthIn: productWithCat.min_width_in != null ? Number(productWithCat.min_width_in) : null,
        maxWidthIn: productWithCat.max_width_in != null ? Number(productWithCat.max_width_in) : null,
        minHeightIn: productWithCat.min_height_in != null ? Number(productWithCat.min_height_in) : null,
        maxHeightIn: productWithCat.max_height_in != null ? Number(productWithCat.max_height_in) : null,
        pricePerSqInch: productWithCat.price_per_sq_inch != null ? Number(productWithCat.price_per_sq_inch) : null,
      }
    : undefined;

  // Use the unified engine - shipping is calculated from DB config
  const summary = calculateUnifiedQuote(config, pools, unifiedRequest, dimensionPricing, payload.shippingState, payload.shippingZip);

  const valueBounds = await getProductOrderValueBounds(String(payload.productId));
  assertTotalValueWithinProductBounds(summary.subtotal, valueBounds);

  return NextResponse.json(summary);
}