// Quote Calculation API - MySQL-backed with custom pricing support
// Supports both apparel and dynamic print_product modes
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';
import { calculateQuote, calculateDynamicQuote } from '@/app/lib/quoteEngine';
import type {
  QuoteRequestPayload,
  QuoteConfigStore,
  DynamicQuoteRequestPayload,
} from '@/app/lib/quoteConfigTypes';
import { fetchFedexRatesForCheckout } from '@/app/lib/fedexCheckout';

const useRuleBasedShipping = process.env.NEXT_PUBLIC_USE_RULE_BASED_SHIPPING === 'true';

async function getProductQuantityBounds(productId: string): Promise<{ min: number | null; max: number | null }> {
  const row: any = await queryOne(
    'SELECT min_quantity, max_quantity FROM products WHERE id = ? LIMIT 1',
    [productId],
  );
  if (!row) return { min: null, max: null };
  const min = row.min_quantity != null ? Number(row.min_quantity) : null;
  const max = row.max_quantity != null ? Number(row.max_quantity) : null;
  return {
    // Treat 0 / negative as "not set" to avoid blocking orders with "Quantity may not exceed 0."
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

function extractDynamicTotalQuantity(
  selections: Record<string, any> | undefined,
  pools: Array<{ key?: string; selectionType?: string }> = [],
): number | null {
  if (!selections || typeof selections !== 'object') return null;

  const parseFinitePositive = (value: any): number | null => {
    const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  // 1) Exact known keys first (legacy + common custom key)
  for (const key of ['quantity_tiers', 'quantity', 'qty']) {
    const parsed = parseFinitePositive((selections as any)[key]);
    if (parsed != null) return parsed;
  }

  // 2) Use configured quantity pool(s) when available
  for (const pool of pools || []) {
    const type = String(pool?.selectionType || '').toLowerCase();
    const isQuantityType = type === 'quantity' || type === 'qty';
    if (!isQuantityType) continue;
    const parsed = parseFinitePositive((selections as any)[String(pool.key || '')]);
    if (parsed != null) return parsed;
  }

  // 3) Heuristic fallback by key name
  for (const [key, value] of Object.entries(selections)) {
    const keyLower = String(key || '').toLowerCase();
    if (!keyLower.includes('quantity') && keyLower !== 'qty') continue;
    const parsed = parseFinitePositive(value);
    if (parsed != null) return parsed;
  }

  return null;
}

async function getConfigWithCustomPrices(productId: string): Promise<QuoteConfigStore> {
  // Fetch global options
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

  // Fetch product-specific settings and custom prices
  const [
    productSettings,
    productDecorations,
    productSizes,
    productPrintLocations,
    productTurnarounds,
    productDesignerHelp,
    productQuantityTiers,
  ] = await Promise.all([
    queryOne('SELECT * FROM product_quote_settings WHERE product_id = ?', [productId]),
    query(
      'SELECT decoration_option_id as id, custom_price FROM product_decoration_options WHERE product_id = ?',
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
      'SELECT turnaround_option_id as id, custom_price FROM product_turnaround_options WHERE product_id = ?',
      [productId]
    ),
    query(
      'SELECT designer_help_option_id as id, custom_price FROM product_designer_help_options WHERE product_id = ?',
      [productId]
    ),
    query(
      'SELECT * FROM product_quantity_tiers WHERE product_id = ? AND enabled = TRUE ORDER BY display_order, min_qty',
      [productId]
    ),
  ]);

  // Build custom price maps
  const customPrices = {
    decorations: Object.fromEntries(
      productDecorations
        .filter((d: any) => d.custom_price !== null)
        .map((d: any) => [d.id, parseFloat(d.custom_price)])
    ),
    sizes: Object.fromEntries(
      productSizes
        .filter((s: any) => s.custom_price !== null)
        .map((s: any) => [s.id, parseFloat(s.custom_price)])
    ),
    printLocations: Object.fromEntries(
      productPrintLocations
        .filter((p: any) => p.custom_price !== null)
        .map((p: any) => [p.id, parseFloat(p.custom_price)])
    ),
    turnarounds: Object.fromEntries(
      productTurnarounds
        .filter((t: any) => t.custom_price !== null)
        .map((t: any) => [t.id, parseFloat(t.custom_price)])
    ),
    designerHelp: Object.fromEntries(
      productDesignerHelp
        .filter((d: any) => d.custom_price !== null)
        .map((d: any) => [d.id, parseFloat(d.custom_price)])
    ),
  };

  // Determine which quantity tiers to use
  const tiersToUse = productQuantityTiers.length > 0 ? productQuantityTiers : globalTiers;

  const shippingConfig = shippingConfigRows[0] || { enabled: true, default_flat_rate: 0 };

  return {
    decorations: decorations.map((d: any) => ({
      id: d.id,
      name: d.name,
      // Use custom price if set, otherwise use global
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
      // Use custom price if set, otherwise use global
      priceAddon: customPrices.sizes[s.id] ?? parseFloat(s.price_addon),
      baseEnabled: true,
    })),
    quantityTiers: tiersToUse.map((t: any) => ({
      id: t.id.toString(),
      minQty: t.min_qty,
      maxQty: t.max_qty,
      unitPrice: parseFloat(t.unit_price),
      discountPercent: t.discount_percent != null ? parseFloat(t.discount_percent) : 0,
      enabled: true,
    })),
    printLocations: printLocations.map((p: any) => ({
      id: p.id,
      name: p.name,
      // Use custom price if set, otherwise use global
      priceModifier: customPrices.printLocations[p.id] ?? parseFloat(p.price_modifier),
      enabled: true,
    })),
    turnarounds: turnarounds.map((t: any) => ({
      id: t.id,
      name: t.name,
      // Use custom price if set, otherwise use global
      priceModifier: customPrices.turnarounds[t.id] ?? parseFloat(t.price_modifier),
      enabled: true,
    })),
    designerHelp: designerHelp.map((d: any) => ({
      id: d.id,
      name: d.name,
      // Use custom price if set, otherwise use global
      priceModifier: customPrices.designerHelp[d.id] ?? parseFloat(d.price_modifier),
      enabled: true,
    })),
    shipping: {
      enabled: Boolean(shippingConfig.enabled),
      defaultFlatRate: parseFloat(shippingConfig.default_flat_rate || 0),
      under100Rate: parseFloat(shippingConfig.under_100_rate || 0),
      between100And199Rate: parseFloat(shippingConfig.between_100_199_rate || 0),
      over200Rate: parseFloat(shippingConfig.over_200_rate || 0),
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
  };
}

/** FedEx shipping for quote summary (product dims + optional custom width/height from selections). */
async function calculateFedexShippingAmount(
  productId: string,
  deliveryMethod: 'pickup' | 'shipping',
  shippingState: string | undefined,
  shippingZip: string | undefined,
  shippingCity: string | undefined,
  shippingStreet: string | undefined,
  totalQuantity: number,
  fallbackShipping: number,
  quotePayload?: { mode?: string; selections?: Record<string, unknown> } | null,
): Promise<number> {
  if (deliveryMethod !== 'shipping') {
    return 0;
  }

  if (!shippingZip) {
    return fallbackShipping;
  }

  try {
    const result = await fetchFedexRatesForCheckout(
      [
        {
          id: productId,
          quantity: Math.max(1, totalQuantity || 1),
          quotePayload: quotePayload || null,
        },
      ],
      {
        address: shippingStreet || 'Customer Address',
        city: shippingCity || 'Customer City',
        state: shippingState || 'CA',
        zip: shippingZip,
      },
    );

    if (!result.available || result.rates.length === 0) {
      return fallbackShipping;
    }

    return Number(result.rates[0].cost || fallbackShipping);
  } catch (error) {
    console.error('FedEx shipping calculation failed, falling back to configured shipping:', error);
    return fallbackShipping;
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Dynamic print_product mode
    if (payload.mode === 'print_product' && payload.selections) {
      const dynamicPayload = payload as DynamicQuoteRequestPayload;
      const qtyBounds = await getProductQuantityBounds(String(dynamicPayload.productId));

      const productWithCat = await queryOne(
        'SELECT p.id, p.price, p.min_width_in, p.max_width_in, p.min_height_in, p.max_height_in, p.price_per_sq_inch, c.customization_schema FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
        [dynamicPayload.productId],
      );
      let schema: any = { mode: 'print_product', groups: [] };
      if (productWithCat?.customization_schema) {
        try {
          schema =
            typeof productWithCat.customization_schema === 'string'
              ? JSON.parse(productWithCat.customization_schema)
              : productWithCat.customization_schema;
        } catch {}
      }
      const { getDynamicConfig } = await import('@/app/lib/dynamicQuoteConfig');
      const { pools, shipping } = await getDynamicConfig(dynamicPayload.productId, schema);
      const totalQty = extractDynamicTotalQuantity(
        dynamicPayload.selections as Record<string, any>,
        pools as any[],
      );
      if (!Number.isFinite(totalQty) || (totalQty as number) <= 0) {
        throw new Error('Please enter a valid quantity.');
      }
      assertTotalQuantityWithinProductBounds(totalQty as number, qtyBounds);

      const dimensionPricing = productWithCat
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
        : undefined;

      const baseUnitPrice = productWithCat?.price != null ? Number(productWithCat.price) : null;
      let summary = calculateDynamicQuote(pools, shipping, dynamicPayload, baseUnitPrice, dimensionPricing);

      if (dynamicPayload.deliveryMethod === 'shipping' && !useRuleBasedShipping) {
        const fedexShipping = await calculateFedexShippingAmount(
          dynamicPayload.productId,
          dynamicPayload.deliveryMethod,
          dynamicPayload.shippingState,
          dynamicPayload.shippingZip,
          dynamicPayload.shippingCity,
          dynamicPayload.shippingStreet,
          summary.totalQuantity,
          summary.shipping ?? 0,
          {
            mode: 'print_product',
            selections: dynamicPayload.selections as Record<string, unknown>,
          },
        );
        const grandTotal = summary.subtotal + fedexShipping;
        const unitPrice = summary.totalQuantity > 0 ? grandTotal / summary.totalQuantity : 0;
        summary = {
          ...summary,
          shipping: fedexShipping,
          grandTotal,
          unitPrice,
        };
      }

      return NextResponse.json(summary);
    }

    // Mailbox rental mode (Mailbox & Notary category)
    if (payload.mode === 'mailbox') {
      const productId = String(payload.productId || '');
      const monthsRaw = payload.months;
      const months = Number(monthsRaw);

      if (!productId) {
        throw new Error('Product ID is required for mailbox quote.');
      }
      if (!Number.isFinite(months) || months <= 0) {
        throw new Error('Months must be a positive number.');
      }

      const product = await queryOne(
        `SELECT p.id, p.price, p.mailbox_price_per_month, c.slug as category_slug
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`,
        [productId],
      );

      if (!product) {
        throw new Error('Product not found for mailbox quote.');
      }

      if (product.category_slug && product.category_slug !== 'mailbox-notary') {
        throw new Error('Mailbox quotes are only supported for the Mailbox & Notary category.');
      }

      const pricePerMonthRaw =
        product.mailbox_price_per_month != null
          ? Number(product.mailbox_price_per_month)
          : Number(product.price || 0);

      if (!Number.isFinite(pricePerMonthRaw) || pricePerMonthRaw <= 0) {
        throw new Error('Price per month is not configured for this mailbox product.');
      }

      const pricePerMonth = pricePerMonthRaw;

      // Load discount tiers from database and apply the best matching tier
      const tiers = await query(
        'SELECT min_months, max_months, discount_percent FROM mailbox_discount_rules ORDER BY min_months ASC',
      );

      let discountPercent = 0;
      if (Array.isArray(tiers) && tiers.length > 0) {
        for (const tier of tiers as any[]) {
          const min = Number(tier.min_months);
          const max = tier.max_months != null ? Number(tier.max_months) : null;
          const withinMin = months >= min;
          const withinMax = max == null || months <= max;
          if (withinMin && withinMax) {
            const pct = Number(tier.discount_percent || 0);
            discountPercent = pct;
            break;
          }
        }
      } else {
        // Fallback to hard-coded tiers if table is empty
        if (months >= 21) discountPercent = 25;
        else if (months >= 11) discountPercent = 15;
        else if (months >= 6) discountPercent = 10;
        else discountPercent = 0;
      }

      // Enforce maximum discount cap of 25%
      discountPercent = Math.min(discountPercent, 25);
      if (discountPercent < 0) discountPercent = 0;

      const baseTotal = pricePerMonth * months;
      const discountAmount = (baseTotal * discountPercent) / 100;
      const subtotal = baseTotal - discountAmount;

      const lineItems: { label: string; amount: number }[] = [
        {
          label: `Base (${months} month${months === 1 ? '' : 's'} @ $${pricePerMonth.toFixed(
            2,
          )}/month)`,
          amount: baseTotal,
        },
      ];

      if (discountPercent > 0 && discountAmount > 0) {
        lineItems.push({
          label: `Discount (${discountPercent.toFixed(2)}% for ${months} month${
            months === 1 ? '' : 's'
          })`,
          amount: -discountAmount,
        });
      }

      const shipping = 0; // Mailbox rental is an in-store service
      const grandTotal = subtotal + shipping;
      const unitPrice = months > 0 ? grandTotal / months : 0;

      return NextResponse.json({
        productId,
        totalQuantity: months,
        unitPrice,
        sizeBreakdown: [
          {
            sizeLabel: `${months} month${months === 1 ? '' : 's'}`,
            quantity: months,
          },
        ],
        lineItems,
        subtotal,
        shipping,
        grandTotal,
      });
    }

    // Apparel mode: use existing flow
    const apparelPayload = payload as QuoteRequestPayload;
    const apparelQtyBounds = await getProductQuantityBounds(String(apparelPayload.productId));
    const apparelTotal = (apparelPayload.quantities || []).reduce((s, q: any) => {
      const n = Number(q?.quantity ?? 0);
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);
    assertTotalQuantityWithinProductBounds(apparelTotal, apparelQtyBounds);

    const config = await getConfigWithCustomPrices(apparelPayload.productId);

    let summary = calculateQuote(config, apparelPayload);

    if (apparelPayload.deliveryMethod === 'shipping' && !useRuleBasedShipping) {
      const fedexShipping = await calculateFedexShippingAmount(
        apparelPayload.productId,
        apparelPayload.deliveryMethod,
        apparelPayload.shippingState,
        apparelPayload.shippingZip,
        apparelPayload.shippingCity,
        apparelPayload.shippingStreet,
        summary.totalQuantity,
        summary.shipping ?? 0,
        { mode: 'apparel', selections: {} },
      );
      const grandTotal = summary.subtotal + fedexShipping;
      const unitPrice = summary.totalQuantity > 0 ? grandTotal / summary.totalQuantity : 0;
      summary = {
        ...summary,
        shipping: fedexShipping,
        grandTotal,
        unitPrice,
      };
    }

    return NextResponse.json(summary);
  } catch (err: any) {
    console.error('Quote calculation error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Failed to calculate quote' },
      { status: 400 },
    );
  }
}
