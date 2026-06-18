import {
  QuoteConfigStore,
  QuoteRequestPayload,
  QuoteSummary,
  SizeOption,
  QuantityTier,
  ShippingConfig,
  DynamicQuoteRequestPayload,
  CustomizationPool,
} from './quoteConfigTypes';
import { getShippingCost, detectOversizedItems } from './shippingEngine';
import { UnifiedQuoteRequest } from './quote/QuoteNormalizer';

/**
 * Unified pricing configuration that works for both apparel and print products.
 */
type UnifiedPricingConfig = {
  // Shared between both flows
  tiers: QuantityTier[];
  addonsPerUnit: number;
  addonBreakdown: { label: string; perUnit: number }[];
  flatFees: { label: string; amount: number }[];
  productionTimeTotal: number;
  productionTimeLabel: string;
  baseUnitPrice: number | null;
  useMyCloth: boolean;
  sizeAddonPerUnit: number;
};

function findApplicableTier(
  tiers: QuantityTier[],
  totalQty: number,
): QuantityTier | null {
  const enabled = tiers.filter((t) => t.enabled).sort((a, b) => a.minQty - b.minQty);
  for (const tier of enabled) {
    const withinMin = totalQty >= tier.minQty;
    const withinMax = tier.maxQty == null || totalQty <= tier.maxQty;
    if (withinMin && withinMax) return tier;
  }
  return enabled[enabled.length - 1] ?? null;
}

type TierWithDiscount = {
  minQty?: number;
  maxQty?: number | null;
  discountType?: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue?: number;
};

type QuoteLineItem = { label: string; amount: number };

/**
 * Quantity tier merchandise calculation (NEW MODEL):
 * - printingCost = product.price × quantity (if product.price exists)
 * - NO unitPrice from tier - tier only controls discount
 * - Return printingCost with no discount applied (discount applied later on subtotal)
 */
function resolveQuantityTierMerchandise(
  matchedTier: TierWithDiscount,
  totalQuantity: number,
  catalogBaseUnitPrice?: number | null,
): { lineItems: QuoteLineItem[]; merchandiseSubtotal: number; merchandisePerUnit: number; discountApplied: number; discountType: 'NONE' | 'PERCENT' | 'FIXED'; discountValue: number } {
  // printingCost = product.price × qty (if product has price)
  const perUnit = Math.max(0, Number(catalogBaseUnitPrice || 0));
  const printingCost = perUnit * totalQuantity;
  
  const lineItems: QuoteLineItem[] = [];
  
  // Show printing cost only if product has a price
  if (printingCost > 0) {
    lineItems.push({
      label: `Printing (${totalQuantity} pcs × $${perUnit.toFixed(2)} / pc)`,
      amount: printingCost,
    });
  }
  
  // Discount is applied later on FULL subtotal, not here
  return {
    lineItems,
    merchandiseSubtotal: printingCost,
    merchandisePerUnit: perUnit,
    discountApplied: 0, // No discount applied in merchandise - applied on full subtotal later
    discountType: matchedTier.discountType || 'NONE',
    discountValue: matchedTier.discountValue || 0,
  };
}

function formatTierQtyLabel(tier: { minQty?: number; maxQty?: number | null }): string {
  return tier.maxQty != null ? `${tier.minQty}–${tier.maxQty}` : `${tier.minQty}+`;
}

/**
 * Standard pricing flow (apparel + dynamic):
 * merchandise from quantity tier → add add-ons (× qty) → + production time → + flat fees
 */
function buildStandardProductPrice(params: {
  merchandiseLineItems: QuoteLineItem[];
  merchandiseSubtotal: number;
  merchandisePerUnit: number;
  addonsPerUnit: number;
  addonBreakdown?: { label: string; perUnit: number }[];
  totalQuantity: number;
  productionTimeTotal: number;
  productionTimeLabel?: string;
  flatFees?: { label: string; amount: number }[];
}): {
  lineItems: QuoteLineItem[];
  productSubtotal: number;
  itemPrice: number;
  quantitySubtotal: number;
  discountedSubtotal: number;
} {
  const {
    merchandiseLineItems,
    merchandiseSubtotal,
    merchandisePerUnit,
    addonsPerUnit,
    addonBreakdown = [],
    totalQuantity,
    productionTimeTotal,
    productionTimeLabel = 'Production time',
    flatFees = [],
  } = params;

  const lineItems: QuoteLineItem[] = [...merchandiseLineItems];
  const addonsTotal = addonsPerUnit * totalQuantity;

  for (const addon of addonBreakdown) {
    if (addon.perUnit === 0) continue;
    lineItems.push({
      label: `${addon.label} ($${addon.perUnit.toFixed(2)} / pc)`,
      amount: addon.perUnit * totalQuantity,
    });
  }

  if (addonsPerUnit !== 0 && addonBreakdown.length === 0) {
    lineItems.push({
      label: `Add-ons ($${addonsPerUnit.toFixed(2)} / pc)`,
      amount: addonsTotal,
    });
  }

  const itemPrice = merchandisePerUnit + addonsPerUnit;
  const quantitySubtotal = merchandiseSubtotal + addonsTotal;
  const discountedSubtotal = quantitySubtotal;

  if (addonsTotal !== 0 || merchandiseSubtotal !== 0) {
    lineItems.push({
      label: `Subtotal (${totalQuantity} pcs, merchandise + add-ons)`,
      amount: quantitySubtotal,
    });
  }

  let productSubtotal = discountedSubtotal;

  if (productionTimeTotal !== 0) {
    lineItems.push({
      label: productionTimeLabel,
      amount: productionTimeTotal,
    });
    productSubtotal += productionTimeTotal;
  }

  for (const fee of flatFees) {
    if (fee.amount === 0) continue;
    lineItems.push({ label: fee.label, amount: fee.amount });
    productSubtotal += fee.amount;
  }

  return {
    lineItems,
    productSubtotal,
    itemPrice,
    quantitySubtotal,
    discountedSubtotal,
  };
}

function normalizeDynamicSelectionType(value: unknown): 'quantity' | 'single' | 'multi' | 'dimension' | 'unknown' {
  const raw = String(value || '').toLowerCase();
  if (raw === 'quantity' || raw === 'qty') return 'quantity';
  if (raw === 'single' || raw === 'one' || raw === 'radio' || raw === 'single_select') return 'single';
  if (raw === 'multi' || raw === 'multiple' || raw === 'checkbox' || raw === 'multi_select') return 'multi';
  if (raw === 'dimension' || raw === 'dimensions' || raw === 'size') return 'dimension';
  return 'unknown';
}

function parsePositiveNumber(value: unknown): number | null {
  const parsed =
    typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resolveDynamicQuantity(
  pools: CustomizationPool[],
  selections: Record<string, unknown>,
): { key: string | null; totalQuantity: number } {
  const candidatePool = (pools || []).find((pool) => {
    const key = String(pool?.key || '').toLowerCase();
    const name = String(pool?.name || '').toLowerCase();
    const type = normalizeDynamicSelectionType((pool as any)?.selectionType);
    return (
      type === 'quantity' ||
      key === 'quantity' ||
      key === 'qty' ||
      key.includes('quantity') ||
      name === 'quantity' ||
      name.includes('quantity')
    );
  });

  const candidateKeys = [
    candidatePool?.key ? String(candidatePool.key) : null,
    'quantity_tiers',
    'quantity',
    'qty',
    ...Object.keys(selections || {}).filter((key) => {
      const lower = String(key || '').toLowerCase();
      return lower === 'quantity' || lower === 'qty' || lower.includes('quantity');
    }),
  ].filter(Boolean) as string[];

  for (const key of candidateKeys) {
    const qty = parsePositiveNumber(selections?.[key]);
    if (qty != null) {
      return { key, totalQuantity: qty };
    }
  }

  return { key: candidatePool?.key ? String(candidatePool.key) : null, totalQuantity: 0 };
}

/**
 * Compute shipping cost for apparel quotes.
 * Maps deliveryMethod to shipping type and calculates from config.
 */
function computeShipping(
  shipping: ShippingConfig,
  deliveryMethod: QuoteRequestPayload['deliveryMethod'],
  shippingTierSubtotal: number,
  state?: string,
  zip?: string,
): number {
  if (deliveryMethod === 'pickup') return 0;
  if (!shipping.enabled) return 0;

  // Map delivery method to shipping type
  const shippingType = (deliveryMethod === 'local_delivery' || deliveryMethod === 'standard_shipping')
    ? deliveryMethod
    : 'standard_shipping';

  return getShippingCost(Number(shippingTierSubtotal) || 0, shippingType, shipping);
}

/**
 * Compute shipping for dynamic print products.
 * Maps deliveryMethod to shipping type and calculates from config.
 */
function computeShippingDynamic(
  shipping: ShippingConfig,
  deliveryMethod: 'pickup' | 'local_delivery' | 'standard_shipping',
  shippingTierSubtotal: number,
  state?: string,
  zip?: string,
): number {
  if (deliveryMethod === 'pickup') return 0;
  if (!shipping.enabled) return 0;

  // Map delivery method to shipping type
  const shippingType = (deliveryMethod === 'local_delivery' || deliveryMethod === 'standard_shipping')
    ? deliveryMethod
    : 'standard_shipping';

  return getShippingCost(Number(shippingTierSubtotal) || 0, shippingType, shipping);
}

export function calculateQuote(
  config: QuoteConfigStore,
  payload: QuoteRequestPayload,
): QuoteSummary {
  const {
    productId,
    decorationOptionId,
    colorOptionId,
    quantities,
    printLocationIds,
    turnaroundOptionId,
    designerHelpOptionId,
    deliveryMethod,
    shippingState,
    shippingZip,
    useMyCloth,
  } = payload;

  const normalizedQuantities = quantities
    .map((q) => ({
      ...q,
      quantity: Number.isFinite(Number(q?.quantity)) ? Number(q.quantity) : 0,
    }))
    .filter((q) => q.quantity > 0);

  const totalQuantity = normalizedQuantities.reduce((sum, q) => sum + q.quantity, 0);
  if (totalQuantity <= 0) {
    throw new Error('Total quantity must be greater than zero');
  }

  const tier = findApplicableTier(config.quantityTiers, totalQuantity);
  if (!tier) {
    throw new Error('No quantity pricing tier configured for this quantity');
  }

  const sizeMap = new Map<string, SizeOption>();
  config.sizes.forEach((s) => {
    sizeMap.set(s.id, s);
  });

  const sizeBreakdown = normalizedQuantities
    .map((q) => {
      const size = sizeMap.get(q.sizeId);
      return {
        sizeLabel: size?.label ?? 'Unknown',
        quantity: q.quantity,
      };
    });

  const addonBreakdown: { label: string; perUnit: number }[] = [];

  if (useMyCloth) {
    // Base is $0; customer supplies fabric — add-ons still apply per unit.
  }

  let sizeAddonPerUnit = 0;
  if (totalQuantity > 0) {
    let sizeAddonTotal = 0;
    for (const q of normalizedQuantities) {
      const size = sizeMap.get(q.sizeId);
      if (!size || size.priceAddon === 0) continue;
      sizeAddonTotal += size.priceAddon * q.quantity;
    }
    sizeAddonPerUnit = sizeAddonTotal / totalQuantity;
    if (sizeAddonPerUnit !== 0) {
      addonBreakdown.push({ label: 'Size surcharge', perUnit: sizeAddonPerUnit });
    }
  }

  if (decorationOptionId) {
    const decoration = config.decorations.find((d) => d.id === decorationOptionId && d.enabled);
    if (decoration && decoration.priceModifier !== 0) {
      addonBreakdown.push({
        label: `Decoration (${decoration.name})`,
        perUnit: decoration.priceModifier,
      });
    }
  }

  if (printLocationIds.length > 0) {
    let locationsPerUnit = 0;
    for (const locId of printLocationIds) {
      const loc = config.printLocations.find((p) => p.id === locId && p.enabled);
      if (!loc || loc.priceModifier === 0) continue;
      locationsPerUnit += loc.priceModifier;
    }
    if (locationsPerUnit !== 0) {
      addonBreakdown.push({ label: 'Print locations', perUnit: locationsPerUnit });
    }
  }

  const addonsPerUnit = addonBreakdown.reduce((sum, a) => sum + a.perUnit, 0);

  let productionTimeTotal = 0;
  let productionTimeLabel = 'Turnaround';
  let selectedTurnaround: { id: string; name: string; priceModifier: number; pricingType?: string; percentageValue?: number | null } | null = null;
  if (turnaroundOptionId) {
    selectedTurnaround = config.turnarounds.find((t) => t.id === turnaroundOptionId && t.enabled) || null;
  }

  const flatFees: { label: string; amount: number }[] = [];
  if (designerHelpOptionId) {
    const help = config.designerHelp.find((d) => d.id === designerHelpOptionId && d.enabled);
    if (help && help.priceModifier !== 0) {
      flatFees.push({
        label: `Designer help (${help.name})`,
        amount: help.priceModifier,
      });
    }
  }

  const tierMerchandise = useMyCloth
    ? { lineItems: [] as QuoteLineItem[], merchandiseSubtotal: 0, merchandisePerUnit: 0, discountApplied: 0, discountType: 'NONE' as const, discountValue: 0 }
    : resolveQuantityTierMerchandise(tier, totalQuantity, null);

  if (selectedTurnaround) {
    const pricingType = selectedTurnaround.pricingType || 'flat';
    if (pricingType === 'percentage' && selectedTurnaround.percentageValue != null) {
      const addonsTotal = addonsPerUnit * totalQuantity;
      const designerHelpTotal = flatFees.reduce((sum, f) => sum + f.amount, 0);
      const baseForPct = tierMerchandise.merchandiseSubtotal + addonsTotal + designerHelpTotal;
      productionTimeTotal = baseForPct * (selectedTurnaround.percentageValue / 100);
    } else if (selectedTurnaround.priceModifier !== 0) {
      productionTimeTotal = selectedTurnaround.priceModifier;
    }
    if (productionTimeTotal !== 0) {
      productionTimeLabel = `Turnaround (${selectedTurnaround.name})`;
    }
  }

  const priced = buildStandardProductPrice({
    merchandiseLineItems: tierMerchandise.lineItems,
    merchandiseSubtotal: tierMerchandise.merchandiseSubtotal,
    merchandisePerUnit: tierMerchandise.merchandisePerUnit,
    addonsPerUnit,
    addonBreakdown,
    totalQuantity,
    productionTimeTotal,
    productionTimeLabel,
    flatFees,
  });

  const lineItems = [...priced.lineItems];
  if (useMyCloth) {
    lineItems.unshift({
      label: 'Base garment (customer supplied fabric)',
      amount: 0,
    });
  }

  let subtotal = priced.productSubtotal;

  // Apply discount on FULL subtotal (NEW MODEL - after all charges)
  const discountType = tier?.discountType || 'NONE';
  const discountValue = tier?.discountValue ?? 0;
  let discountApplied = 0;
  const tierLabel = tier ? formatTierQtyLabel(tier) : '';

  if (discountType === 'PERCENT' && discountValue > 0) {
    discountApplied = Math.min(subtotal, (subtotal * Math.min(100, discountValue)) / 100);
  } else if (discountType === 'FIXED' && discountValue > 0) {
    discountApplied = Math.min(subtotal, discountValue);
  }

  if (discountApplied > 0) {
    lineItems.push({
      label: `Quantity discount (${discountType === 'PERCENT' ? discountValue + '%' : '$' + discountValue.toFixed(2)} for ${tierLabel})`,
      amount: -discountApplied,
    });
    subtotal -= discountApplied;
  }

  const shippingTierSubtotal = subtotal;
  const shipping = computeShipping(config.shipping, deliveryMethod, shippingTierSubtotal, shippingState, shippingZip);
  const grandTotal = subtotal + shipping;
  const unitPrice = totalQuantity > 0 ? subtotal / totalQuantity : 0;

  return {
    productId,
    totalQuantity,
    unitPrice,
    sizeBreakdown,
    lineItems,
    subtotal,
    merchandiseSubtotal: tierMerchandise.merchandiseSubtotal,
    shipping,
    grandTotal,
  };
}

/** Find applicable quantity tier for dynamic print products */
function findDynamicTier(
  tiers: {
    minQty: number;
    maxQty: number | null;
    discountType?: 'NONE' | 'PERCENT' | 'FIXED';
    discountValue?: number;
  }[],
  totalQty: number,
): {
  minQty: number;
  maxQty: number | null;
  discountType?: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue?: number;
} | null {
  const normalizedTiers = tiers.map(t => ({
    ...t,
    discountType: t.discountType ?? 'NONE',
    discountValue: Number(t.discountValue ?? 0),
  }));
  const sorted = [...normalizedTiers].sort((a, b) => a.minQty - b.minQty);
  for (const tier of sorted) {
    const withinMin = totalQty >= tier.minQty;
    const withinMax = tier.maxQty == null || totalQty <= tier.maxQty;
    if (withinMin && withinMax) return tier;
  }
  return sorted[sorted.length - 1] ?? null;
}

/** Calculate quote for dynamic print products (flyers, brochures, etc.) */
export function calculateDynamicQuote(
  pools: CustomizationPool[],
  shipping: ShippingConfig,
  payload: DynamicQuoteRequestPayload,
  baseUnitPrice?: number | null,
  dimensionPricing?: {
    minWidthIn?: number | null;
    maxWidthIn?: number | null;
    minHeightIn?: number | null;
    maxHeightIn?: number | null;
    pricePerSqInch?: number | null;
  }
): QuoteSummary {
  const { productId, selections, deliveryMethod, shippingState, shippingZip } = payload;

  const poolMap = new Map(pools.map((p) => [p.key, p]));

  const { key: quantityPoolKey, totalQuantity } = resolveDynamicQuantity(
    pools,
    (selections || {}) as Record<string, unknown>,
  );
  const qtyPool = quantityPoolKey ? poolMap.get(quantityPoolKey) : null;

  if (totalQuantity <= 0) {
    throw new Error('Total quantity must be greater than zero');
  }

  const qtyTiers = qtyPool?.quantityTiers || [];
  const tier =
    qtyTiers.length > 0
      ? findDynamicTier(qtyTiers, totalQuantity)
      : { minQty: 1, maxQty: null };
  // Quantity tiers are optional for dynamic products. If no tiers exist, no discount applied.

  const catalogBaseUnitPrice =
    baseUnitPrice != null && Number.isFinite(Number(baseUnitPrice)) && Number(baseUnitPrice) > 0
      ? Number(baseUnitPrice)
      : null;

  const addonBreakdown: { label: string; perUnit: number }[] = [];

  if (dimensionPricing && dimensionPricing.pricePerSqInch) {
    const widthRaw = (selections as any).width_in;
    const heightRaw = (selections as any).height_in;
    const width = typeof widthRaw === 'number' ? widthRaw : NaN;
    const height = typeof heightRaw === 'number' ? heightRaw : NaN;
    const hasCustomDimensions = Number.isFinite(width) && Number.isFinite(height);

    if (hasCustomDimensions) {
      if (dimensionPricing.minWidthIn != null && width < dimensionPricing.minWidthIn) {
        throw new Error(`Width must be at least ${dimensionPricing.minWidthIn}"`);
      }
      if (dimensionPricing.maxWidthIn != null && width > dimensionPricing.maxWidthIn) {
        throw new Error(`Width must be at most ${dimensionPricing.maxWidthIn}"`);
      }
      if (dimensionPricing.minHeightIn != null && height < dimensionPricing.minHeightIn) {
        throw new Error(`Height must be at least ${dimensionPricing.minHeightIn}"`);
      }
      if (dimensionPricing.maxHeightIn != null && height > dimensionPricing.maxHeightIn) {
        throw new Error(`Height must be at most ${dimensionPricing.maxHeightIn}"`);
      }

      const area = width * height;
      const rate = dimensionPricing.pricePerSqInch;
      const areaPerUnit = area * rate;
      addonBreakdown.push({
        label: `Area (${width}" × ${height}" @ $${rate.toFixed(4)}/sq in)`,
        perUnit: areaPerUnit,
      });
    }
  }

  for (const [poolKey, sel] of Object.entries(selections)) {
    if (quantityPoolKey && poolKey === quantityPoolKey) continue;
    if (poolKey === 'production_time') continue;
    if (poolKey === 'designer_help') continue;
    const pool = poolMap.get(poolKey);
    if (!pool || !pool.options) continue;

    const ids = Array.isArray(sel) ? sel : sel ? [sel] : [];
    for (const id of ids) {
      if (typeof id !== 'string') continue;
      const opt = pool.options.find((o) => o.id === id);
      if (!opt || opt.priceModifier === 0) continue;
      addonBreakdown.push({
        label: `${pool.name} (${opt.label})`,
        perUnit: opt.priceModifier,
      });
    }
  }

  const addonsPerUnit = addonBreakdown.reduce((sum, a) => sum + a.perUnit, 0);

  const flatFees: { label: string; amount: number }[] = [];
  const designerSel = selections.designer_help;
  if (designerSel) {
    const pool = poolMap.get('designer_help');
    if (pool && pool.options) {
      const id = Array.isArray(designerSel) ? designerSel[0] : designerSel;
      if (typeof id === 'string') {
        const opt = pool.options.find((o) => o.id === id);
        if (opt && opt.priceModifier !== 0) {
          flatFees.push({
            label: `${pool.name} (${opt.label})`,
            amount: opt.priceModifier,
          });
        }
      }
    }
  }

const tierMerchandise = resolveQuantityTierMerchandise(
    tier || { minQty: 1, maxQty: null },
    totalQuantity,
    catalogBaseUnitPrice,
  );

  let productionTimeTotal = 0;
  let productionTimeLabel = 'Production time';
  const productionSel = selections.production_time;
  if (productionSel) {
    const productionPool = poolMap.get('production_time');
    if (productionPool && productionPool.options) {
      const id = Array.isArray(productionSel) ? productionSel[0] : productionSel;
      if (typeof id === 'string') {
        const opt = productionPool.options.find((o) => o.id === id);
        if (opt) {
          const pricingType = opt.pricingType || 'flat';
          if (pricingType === 'percentage' && opt.percentageValue != null) {
            const addonsTotal = addonsPerUnit * totalQuantity;
            const designerHelpTotal = flatFees.reduce((sum, f) => sum + f.amount, 0);
            const baseForPct = tierMerchandise.merchandiseSubtotal + addonsTotal + designerHelpTotal;
            productionTimeTotal = baseForPct * (opt.percentageValue / 100);
          } else if (opt.priceModifier !== 0) {
            productionTimeTotal = opt.priceModifier;
          }
          if (productionTimeTotal !== 0) {
            productionTimeLabel = `${productionPool.name} (${opt.label})`;
          }
        }
      }
    }
  }

  const priced = buildStandardProductPrice({
    merchandiseLineItems: tierMerchandise.lineItems,
    merchandiseSubtotal: tierMerchandise.merchandiseSubtotal,
    merchandisePerUnit: tierMerchandise.merchandisePerUnit,
    addonsPerUnit,
    addonBreakdown,
    totalQuantity,
    productionTimeTotal,
    productionTimeLabel,
    flatFees,
  });

  let lineItems = priced.lineItems;
  let subtotal = priced.productSubtotal;

  // Apply discount on FULL subtotal (NEW MODEL - after all charges)
  const discountType = tier?.discountType || 'NONE';
  const discountValue = tier?.discountValue ?? 0;
  let discountApplied = 0;
  const tierLabel = tier ? formatTierQtyLabel(tier) : '';

  if (discountType === 'PERCENT' && discountValue > 0) {
    discountApplied = Math.min(subtotal, (subtotal * Math.min(100, discountValue)) / 100);
  } else if (discountType === 'FIXED' && discountValue > 0) {
    discountApplied = Math.min(subtotal, discountValue);
  }

  if (discountApplied > 0) {
    lineItems.push({
      label: `Quantity discount (${discountType === 'PERCENT' ? discountValue + '%' : '$' + discountValue.toFixed(2)} for ${tierLabel})`,
      amount: -discountApplied,
    });
    subtotal -= discountApplied;
  }

  const shippingTierSubtotal = subtotal;
  const shippingCost = computeShipping(shipping, deliveryMethod as any, shippingTierSubtotal, shippingState, shippingZip);
  const grandTotal = subtotal + shippingCost;
  const unitPrice = totalQuantity > 0 ? subtotal / totalQuantity : 0;

  return {
    productId,
    totalQuantity,
    unitPrice,
    sizeBreakdown: [{ sizeLabel: 'Total', quantity: totalQuantity }],
    lineItems,
    subtotal,
    merchandiseSubtotal: tierMerchandise.merchandiseSubtotal,
    shipping: shippingCost,
    grandTotal,
  };
}

// =============================================================================
// UNIFIED QUOTE ENGINE (Phase 2)
// =============================================================================

/**
 * Calculate unified quote from normalized request.
 * This is the single entry point for all pricing calculations.
 */
export function calculateUnifiedQuote(
  config: QuoteConfigStore,
  pools: CustomizationPool[],
  unifiedRequest: UnifiedQuoteRequest,
  dimensionPricing?: {
    minWidthIn?: number | null;
    maxWidthIn?: number | null;
    minHeightIn?: number | null;
    maxHeightIn?: number | null;
    pricePerSqInch?: number | null;
  },
  state?: string,
  zip?: string
): QuoteSummary {
  const { mode, quantityBreakdown, selections, deliveryMethod } = unifiedRequest;

  // Calculate total quantity from normalized breakdown
  const totalQuantity = quantityBreakdown.reduce((sum, q) => sum + q.quantity, 0);

  if (totalQuantity <= 0) {
    throw new Error('Total quantity must be greater than zero');
  }

  // Determine which tiers to use based on mode
  const tiers = config.quantityTiers;

  // Find applicable tier
  const tier = findApplicableTier(tiers, totalQuantity);
  if (!tier && !dimensionPricing?.pricePerSqInch) {
    throw new Error('No quantity pricing tier configured for this quantity');
  }

  // Build addon breakdown based on mode
  const { addonBreakdown, addonsPerUnit } = resolveAddonsForMode(
    config,
    pools,
    mode,
    selections,
    dimensionPricing
  );

  // Calculate flat fees
  const { flatFees } = resolveFlatFeesForMode(
    config,
    pools,
    mode,
    selections
  );

  // Calculate size addon per unit (only for apparel)
  const sizeAddonPerUnit = resolveSizeAddonPerUnit(
    mode,
    config.sizes,
    quantityBreakdown
  );

  // Calculate merchandise (printing cost)
  const tierMerchandise = resolveQuantityTierMerchandise(
    tier || { minQty: 1, maxQty: null, discountType: 'NONE', discountValue: 0 },
    totalQuantity,
    config.baseUnitPrice || null
  );

  // Calculate production time / turnaround
  const designerHelpTotal = flatFees.reduce((sum, f) => sum + f.amount, 0);
  const { productionTimeTotal, productionTimeLabel } = resolveProductionTimeForMode(
    config,
    pools,
    selections,
    totalQuantity,
    addonsPerUnit + sizeAddonPerUnit,
    tierMerchandise.merchandiseSubtotal,
    designerHelpTotal
  );

  // Build final pricing
  const priced = buildStandardProductPrice({
    merchandiseLineItems: tierMerchandise.lineItems,
    merchandiseSubtotal: tierMerchandise.merchandiseSubtotal,
    merchandisePerUnit: tierMerchandise.merchandisePerUnit,
    addonsPerUnit: addonsPerUnit + sizeAddonPerUnit,
    addonBreakdown: [...addonBreakdown],
    totalQuantity,
    productionTimeTotal,
    productionTimeLabel,
    flatFees,
  });

  let lineItems = [...priced.lineItems];
  let subtotal = priced.productSubtotal;

  // Apply discount on FULL subtotal (after all charges) - NEW MODEL
  const discountType = tier?.discountType || 'NONE';
  const discountValue = tier?.discountValue ?? 0;
  let discountApplied = 0;
  const tierLabel = tier ? formatTierQtyLabel(tier) : '';

  if (discountType === 'PERCENT' && discountValue > 0) {
    discountApplied = Math.min(subtotal, (subtotal * Math.min(100, discountValue)) / 100);
  } else if (discountType === 'FIXED' && discountValue > 0) {
    discountApplied = Math.min(subtotal, discountValue);
  }

  // Add discount line item to the breakdown
  if (discountApplied > 0) {
    lineItems.push({
      label: `Quantity discount (${discountType === 'PERCENT' ? discountValue + '%' : '$' + discountValue.toFixed(2)} for ${tierLabel})`,
      amount: -discountApplied,
    });
    subtotal -= discountApplied;
  }

  const shippingTierSubtotal = subtotal;
  const shipping = computeShipping(config.shipping, deliveryMethod, shippingTierSubtotal, state, zip);
  const grandTotal = subtotal + shipping;
  const unitPrice = totalQuantity > 0 ? subtotal / totalQuantity : 0;

  // Build size breakdown from normalized request
  const sizeBreakdown = quantityBreakdown.map(q => ({
    sizeLabel: q.label,
    quantity: q.quantity,
  }));

  return {
    productId: unifiedRequest.productId,
    totalQuantity,
    unitPrice,
    sizeBreakdown,
    lineItems,
    subtotal,
    merchandiseSubtotal: tierMerchandise.merchandiseSubtotal,
    shipping,
    grandTotal,
  };
}

/**
 * Resolve add-ons based on mode.
 */
function resolveAddonsForMode(
  config: QuoteConfigStore,
  pools: CustomizationPool[],
  mode: 'apparel' | 'print_product',
  selections: Record<string, any>,
  dimensionPricing?: {
    minWidthIn?: number | null;
    maxWidthIn?: number | null;
    minHeightIn?: number | null;
    maxHeightIn?: number | null;
    pricePerSqInch?: number | null;
  }
): { addonBreakdown: { label: string; perUnit: number }[]; addonsPerUnit: number } {
  const addonBreakdown: { label: string; perUnit: number }[] = [];
  const poolMap = new Map(pools.map(p => [p.key, p]));

  if (mode === 'apparel') {
    // Apparel: decoration and print locations come from config
    const decorationOptionId = selections.decorationOptionId;
    if (decorationOptionId && decorationOptionId !== '') {
      const decoration = config.decorations.find(d => d.id === decorationOptionId && d.enabled);
      if (decoration && decoration.priceModifier !== 0) {
        addonBreakdown.push({
          label: `Decoration (${decoration.name})`,
          perUnit: decoration.priceModifier,
        });
      }
    }

    const printLocationIds = selections.printLocationIds;
    if (Array.isArray(printLocationIds) && printLocationIds.length > 0) {
      let locationsPerUnit = 0;
      for (const locId of printLocationIds) {
        const loc = config.printLocations.find(p => p.id === locId && p.enabled);
        if (loc && loc.priceModifier !== 0) {
          locationsPerUnit += loc.priceModifier;
        }
      }
      if (locationsPerUnit !== 0) {
        addonBreakdown.push({ label: 'Print locations', perUnit: locationsPerUnit });
      }
    }
  } else {
    // Print product: addons come from pools, excluding special keys
    for (const [poolKey, sel] of Object.entries(selections)) {
      if (poolKey === 'width_in' || poolKey === 'height_in') continue;
      if (poolKey === 'production_time' || poolKey === 'designer_help' || poolKey.toLowerCase().includes('quantity')) continue;

      const pool = poolMap.get(poolKey);
      if (!pool?.options) continue;

      const ids = Array.isArray(sel) ? sel : (sel ? [sel] : []);
      for (const id of ids) {
        if (typeof id !== 'string') continue;
        const opt = pool.options.find(o => o.id === id);
        if (opt && opt.priceModifier !== 0) {
          addonBreakdown.push({
            label: `${pool.name} (${opt.label})`,
            perUnit: opt.priceModifier,
          });
        }
      }
    }

    // Handle dimension-based pricing
    if (dimensionPricing?.pricePerSqInch && dimensionPricing.pricePerSqInch > 0) {
      const width = Number(selections.width_in);
      const height = Number(selections.height_in);
      if (Number.isFinite(width) && Number.isFinite(height)) {
        const area = width * height;
        const rate = dimensionPricing.pricePerSqInch;
        const areaPerUnit = area * rate;
        if (areaPerUnit > 0) {
          addonBreakdown.unshift({
            label: `Area (${width}" × ${height}" @ $${rate.toFixed(4)}/sq in)`,
            perUnit: areaPerUnit,
          });
        }
      }
    }
  }

  const addonsPerUnit = addonBreakdown.reduce((sum, a) => sum + a.perUnit, 0);
  return { addonBreakdown, addonsPerUnit };
}

/**
 * Resolve flat fees (per-order charges) based on mode.
 */
function resolveFlatFeesForMode(
  config: QuoteConfigStore,
  pools: CustomizationPool[],
  mode: 'apparel' | 'print_product',
  selections: Record<string, any>
): { flatFees: { label: string; amount: number }[] } {
  const flatFees: { label: string; amount: number }[] = [];
  const poolMap = new Map(pools.map(p => [p.key, p]));

  if (mode === 'apparel') {
    const designerHelpOptionId = selections.designerHelpOptionId;
    if (designerHelpOptionId && designerHelpOptionId !== '') {
      const help = config.designerHelp.find(d => d.id === designerHelpOptionId && d.enabled);
      if (help && help.priceModifier !== 0) {
        flatFees.push({
          label: `Designer help (${help.name})`,
          amount: help.priceModifier,
        });
      }
    }
  } else {
    // Print product: designer help from pool
    const designerSel = selections.designer_help;
    if (designerSel) {
      const pool = poolMap.get('designer_help');
      if (pool?.options) {
        const id = Array.isArray(designerSel) ? designerSel[0] : designerSel;
        if (typeof id === 'string') {
          const opt = pool.options.find(o => o.id === id);
          if (opt && opt.priceModifier !== 0) {
            flatFees.push({
              label: `${pool.name} (${opt.label})`,
              amount: opt.priceModifier,
            });
          }
        }
      }
    }
  }

  return { flatFees };
}

/**
 * Resolve size addon per unit (only applicable for apparel).
 */
function resolveSizeAddonPerUnit(
  mode: 'apparel' | 'print_product',
  sizes: SizeOption[],
  quantityBreakdown: { key: string; label: string; quantity: number }[]
): number {
  if (mode !== 'apparel' || sizes.length === 0 || quantityBreakdown.length === 0) {
    return 0;
  }

  const sizeMap = new Map(sizes.map(s => [s.id, s.priceAddon]));
  const totalQuantity = quantityBreakdown.reduce((sum, q) => sum + q.quantity, 0);

  let sizeAddonTotal = 0;
  for (const q of quantityBreakdown) {
    const priceAddon = sizeMap.get(q.key) || 0;
    if (priceAddon !== 0) {
      sizeAddonTotal += priceAddon * q.quantity;
    }
  }

  return totalQuantity > 0 ? sizeAddonTotal / totalQuantity : 0;
}

/**
 * Resolve production time / turnaround based on mode.
 */
function resolveProductionTimeForMode(
  config: QuoteConfigStore,
  pools: CustomizationPool[],
  selections: Record<string, any>,
  totalQuantity: number,
  addonsPerUnit: number,
  merchandiseSubtotal: number,
  designerHelpTotal: number
): { productionTimeTotal: number; productionTimeLabel: string } {
  const poolMap = new Map(pools.map(p => [p.key, p]));

  // Check for production_time in pools (print mode)
  const productionSel = selections.production_time;
  if (productionSel) {
    const productionPool = poolMap.get('production_time');
    if (productionPool?.options) {
      const id = Array.isArray(productionSel) ? productionSel[0] : productionSel;
      if (typeof id === 'string') {
        const opt = productionPool.options.find(o => o.id === id);
        if (opt) {
            const pricingType = opt.pricingType || 'flat';
            if (pricingType === 'percentage' && opt.percentageValue != null) {
              const addonsTotal = addonsPerUnit * totalQuantity;
              const baseForPct = merchandiseSubtotal + addonsTotal + designerHelpTotal;
              return {
                productionTimeTotal: baseForPct * (opt.percentageValue / 100),
                productionTimeLabel: `${productionPool.name} (${opt.label})`,
              };
          } else if (opt.priceModifier !== 0) {
            return {
              productionTimeTotal: opt.priceModifier,
              productionTimeLabel: `${productionPool.name} (${opt.label})`,
            };
          }
        }
      }
    }
  }

  // Apparel mode: turnaround from config
  const turnaroundOptionId = selections.turnaroundOptionId;
  if (turnaroundOptionId && turnaroundOptionId !== '') {
    const selectedTurnaround = config.turnarounds.find(t => t.id === turnaroundOptionId && t.enabled);
    if (selectedTurnaround) {
      const pricingType = selectedTurnaround.pricingType || 'flat';
      if (pricingType === 'percentage' && selectedTurnaround.percentageValue != null) {
        const addonsTotal = addonsPerUnit * totalQuantity;
        const baseForPct = merchandiseSubtotal + addonsTotal + designerHelpTotal;
        return {
          productionTimeTotal: baseForPct * (selectedTurnaround.percentageValue / 100),
          productionTimeLabel: `Turnaround (${selectedTurnaround.name})`,
        };
      } else if (selectedTurnaround.priceModifier !== 0) {
        return {
          productionTimeTotal: selectedTurnaround.priceModifier,
          productionTimeLabel: `Turnaround (${selectedTurnaround.name})`,
        };
      }
    }
  }

  return { productionTimeTotal: 0, productionTimeLabel: 'Turnaround' };
}
