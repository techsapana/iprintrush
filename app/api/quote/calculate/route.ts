// Quote Calculation API - MySQL-backed with unified shipping
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';
import { calculateUnifiedQuote, normalizeDeliveryMethod, resolveShippingDecisionForQuote } from '@/app/lib/quoteEngine';
import { normalizeQuoteRequest } from '@/app/lib/quote/QuoteNormalizer';
import { buildShippingConfig } from '@/app/lib/shippingEngine';
import { lookupZoneByZip } from '@/app/lib/shipping/zipZoneService';
import {
  getProductQuantityBounds,
  assertTotalQuantityWithinProductBounds,
  getProductOrderValueBounds,
  assertTotalValueWithinProductBounds,
  getConfigWithCustomPrices,
} from '@/app/lib/quoteHelpers';
import type {
  QuoteRequestPayload,
  QuoteConfigStore,
  DynamicQuoteRequestPayload,
  SimpleQuoteRequestPayload,
} from '@/app/lib/quoteConfigTypes';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Handle mailbox mode separately (no unification needed - different domain)
    if (payload.mode === 'mailbox') {
      return await handleMailboxQuote(payload);
    }

    // Simple product mode
    if (payload.mode === 'simple') {
      return await handleSimpleQuote(payload);
    }

    // Apparel mode
    if (!payload.mode || payload.mode === 'apparel') {
      return await handleApparelQuote(payload);
    }

    // Print product mode
    if (payload.mode === 'print_product' && payload.selections) {
      return await handlePrintProductQuote(payload);
    }

    return NextResponse.json({ error: 'Invalid quote mode specified' }, { status: 400 });
  } catch (err: any) {
    console.error('[Q] catch', 'msg=' + err?.message, 'code=' + err?.code);
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

  const shippingConfigRows = await query('SELECT * FROM shipping_config LIMIT 1');
  const shippingConfig = buildShippingConfig(Array.isArray(shippingConfigRows) ? shippingConfigRows[0] : {});

  const shippingDecision = resolveShippingDecisionForQuote({
    productId,
    totalQuantity: months,
    productWeightLb: null,
    productPackageWidthIn: null,
    selections: undefined,
    deliveryMethod: 'pickup',
    shippingConfig,
    mode: 'mailbox',
  });

  return NextResponse.json({
    productId,
    totalQuantity: months,
    unitPrice: months > 0 ? subtotal / months : 0,
    sizeBreakdown: [{ sizeLabel: `${months} month${months === 1 ? '' : 's'}`, quantity: months }],
    lineItems,
    subtotal,
    shipping: 0,
    grandTotal: subtotal,
    shippingTierSubtotal: subtotal,
    shippingDecision,
  });
}

async function handleSimpleQuote(payload: SimpleQuoteRequestPayload) {
  const productId = String(payload.productId || '');
  const quantity = Number(payload.quantity) || 1;

  if (!productId) throw new Error('Product ID is required for simple quote.');
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be a positive number.');

  const qtyBounds = await getProductQuantityBounds(productId);
  assertTotalQuantityWithinProductBounds(quantity, qtyBounds);

  const config = await getConfigWithCustomPrices(productId);

  const productEligibility = await queryOne(
    'SELECT local_delivery_eligible, weight_lb, package_width_in FROM products WHERE id = ? LIMIT 1',
    [productId],
  );

  const zoneResult = await resolveLocalDeliveryZone(
    payload.shippingZip,
    productEligibility?.local_delivery_eligible ?? null,
  );

  // Normalize the simple payload
  const unifiedRequest = normalizeQuoteRequest({
    ...payload,
    deliveryMethod: normalizeDeliveryMethod(payload.deliveryMethod),
  });

  // Use the unified engine

  const summary = calculateUnifiedQuote(
    config,
    [],
    unifiedRequest,
    undefined,
    payload.shippingState,
    payload.shippingZip,
  );

  // Apply zone-based local delivery if applicable
  if (zoneResult.available && normalizeDeliveryMethod(payload.deliveryMethod) === 'local_delivery') {
    const shippingAmount = summary.subtotal >= zoneResult.freeMinimum ? 0 : zoneResult.fee;
    summary.shipping = shippingAmount;
    summary.grandTotal = summary.subtotal + shippingAmount;
    summary.localDeliveryZone = {
      available: true,
      fee: zoneResult.fee,
      freeMinimum: zoneResult.freeMinimum,
      deliveryWindow: zoneResult.deliveryWindow,
    };
  } else if (normalizeDeliveryMethod(payload.deliveryMethod) === 'local_delivery') {
    summary.shipping = 0;
    summary.grandTotal = summary.subtotal;
   summary.localDeliveryZone = zoneResult;
  }

  const valueBounds = await getProductOrderValueBounds(productId);
  assertTotalValueWithinProductBounds(summary.subtotal, valueBounds);

  const shippingDecision = resolveShippingDecisionForQuote({
    productId,
    totalQuantity: quantity,
    productWeightLb: productEligibility?.weight_lb ?? null,
    productPackageWidthIn: productEligibility?.package_width_in ?? null,
    selections: undefined,
    deliveryMethod: payload.deliveryMethod,
    shippingConfig: config.shipping,
    mode: 'simple',
  });

  return NextResponse.json({ ...summary, shippingDecision });
}

/**
 * Build shipping config with zone overrides injected.
 * ZEROES OUT all global local tier rates when a zone is active.
 */
function buildShippingConfigWithZone(
  base: QuoteConfigStore['shipping'],
  zone: { delivery_fee: number; free_delivery_minimum: number } | null,
): QuoteConfigStore['shipping'] {
  if (!zone) {
    return base;
  }

  return {
    ...base,
    localUnder100Rate: 0,
    localBetween100And199Rate: 0,
    localOver200Rate: 0,
  };
}

/**
 * Resolve local delivery availability and zone parameters.
 * AND-gates: ZIP match → zone enabled → product eligible.
 */
async function resolveLocalDeliveryZone(
  shippingZip: string | null | undefined,
  productLocalDeliveryEligible: boolean | null | undefined,
): Promise<{
  available: boolean;
  fee: number;
  freeMinimum: number;
  deliveryWindow: string | null;
}> {
  const zip = String(shippingZip || '').trim();
  if (!/^\d{5}$/.test(zip)) {
    return { available: false, fee: 0, freeMinimum: 0, deliveryWindow: null };
  }

  const zone = await lookupZoneByZip(zip);
  if (!zone) {
    return { available: false, fee: 0, freeMinimum: 0, deliveryWindow: null };
  }

  if (!zone.enabled) {
    return { available: false, fee: 0, freeMinimum: 0, deliveryWindow: null };
  }

  if (productLocalDeliveryEligible === false) {
    return { available: false, fee: 0, freeMinimum: 0, deliveryWindow: null };
  }

  return {
    available: true,
    fee: zone.delivery_fee,
    freeMinimum: zone.free_delivery_minimum,
    deliveryWindow: zone.delivery_window,
  };
}

async function handleApparelQuote(payload: QuoteRequestPayload) {
  const apparelTotal = (payload.quantities || []).reduce((s, q: any) => {
    const n = Number(q?.quantity ?? 0);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);

  const qtyBounds = await getProductQuantityBounds(String(payload.productId));
  assertTotalQuantityWithinProductBounds(apparelTotal, qtyBounds);

  const config = await getConfigWithCustomPrices(String(payload.productId));

  const productEligibility = await queryOne(
    'SELECT local_delivery_eligible, weight_lb, package_width_in FROM products WHERE id = ? LIMIT 1',
    [payload.productId],
  );

  const zoneResult = await resolveLocalDeliveryZone(
    payload.shippingZip,
    productEligibility?.local_delivery_eligible ?? null,
  );

  // Normalize the apparel payload
  const unifiedRequest = normalizeQuoteRequest({
    ...payload,
    deliveryMethod: normalizeDeliveryMethod(payload.deliveryMethod),
  }, config.sizes);

  // Use the unified engine - shipping is calculated from DB config
  const summary = calculateUnifiedQuote(
    config,
    [],
    unifiedRequest,
    undefined,
    payload.shippingState,
    payload.shippingZip,
  );

  if (zoneResult.available && normalizeDeliveryMethod(payload.deliveryMethod) === 'local_delivery') {
    const shippingAmount = summary.subtotal >= zoneResult.freeMinimum ? 0 : zoneResult.fee;
    summary.shipping = shippingAmount;
    summary.grandTotal = summary.subtotal + shippingAmount;
    summary.localDeliveryZone = {
      available: true,
      fee: zoneResult.fee,
      freeMinimum: zoneResult.freeMinimum,
      deliveryWindow: zoneResult.deliveryWindow,
    };
  } else if (normalizeDeliveryMethod(payload.deliveryMethod) === 'local_delivery') {
    summary.shipping = 0;
    summary.grandTotal = summary.subtotal;
    summary.localDeliveryZone = zoneResult;
  }

  const valueBounds = await getProductOrderValueBounds(String(payload.productId));
  assertTotalValueWithinProductBounds(summary.subtotal, valueBounds);

  const shippingDecision = resolveShippingDecisionForQuote({
    productId: payload.productId,
    totalQuantity: apparelTotal,
    productWeightLb: productEligibility?.weight_lb ?? null,
    productPackageWidthIn: productEligibility?.package_width_in ?? null,
    selections: undefined,
    deliveryMethod: payload.deliveryMethod,
    shippingConfig: config.shipping,
    mode: 'apparel',
  });

  return NextResponse.json({ ...summary, shippingDecision });
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

  // Normalize delivery method before shipping decisions and quote calculation.
  const normalizedDeliveryMethod = normalizeDeliveryMethod(payload.deliveryMethod);

  // Get config for apparel-style options
  const config = await getConfigWithCustomPrices(payload.productId);

  const productEligibility = await queryOne(
    'SELECT local_delivery_eligible, weight_lb, package_width_in FROM products WHERE id = ? LIMIT 1',
    [payload.productId],
  );

  const zoneResult = await resolveLocalDeliveryZone(
    payload.shippingZip,
    productEligibility?.local_delivery_eligible ?? null,
  );

  // Normalize the print product payload
  const unifiedRequest = normalizeQuoteRequest({
    ...payload,
    deliveryMethod: normalizedDeliveryMethod,
  }, pools);

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

  const shippingDecision = resolveShippingDecisionForQuote({
    productId: payload.productId,
    totalQuantity: totalQty,
    productWeightLb: productWithCat?.weight_lb ?? null,
    productPackageWidthIn: productWithCat?.package_width_in ?? null,
    selections: payload.selections,
    deliveryMethod: payload.deliveryMethod,
    shippingConfig: config.shipping,
    mode: 'print_product',
  });

  if (zoneResult.available && normalizedDeliveryMethod === 'local_delivery') {
    const shippingAmount = summary.subtotal >= zoneResult.freeMinimum ? 0 : zoneResult.fee;
    summary.shipping = shippingAmount;
    summary.grandTotal = summary.subtotal + shippingAmount;
    summary.localDeliveryZone = {
      available: true,
      fee: zoneResult.fee,
      freeMinimum: zoneResult.freeMinimum,
      deliveryWindow: zoneResult.deliveryWindow,
    };
  } else if (normalizedDeliveryMethod === 'local_delivery') {
    summary.shipping = 0;
    summary.grandTotal = summary.subtotal;
   summary.localDeliveryZone = zoneResult;
  }

  const valueBounds = await getProductOrderValueBounds(String(payload.productId));
  assertTotalValueWithinProductBounds(summary.subtotal, valueBounds);

    return NextResponse.json({ ...summary, shippingDecision });
}