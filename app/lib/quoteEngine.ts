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
  return null;
}

type TierWithDiscount = {
  minQty?: number;
  maxQty?: number | null;
  discountType?: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue?: number;
};

type QuoteLineItem = { label: string; amount: number };

/**
 * Printing cost calculation for apparel/digital products.
 * Printing cost is based on baseUnitPrice (from products.price) and quantity tiers.
 */
function resolvePrintingCost(
  matchedTier: TierWithDiscount,
  totalQuantity: number,
  catalogBaseUnitPrice?: number | null
): { lineItems: QuoteLineItem[]; printingSubtotal: number; printingPerUnit: number } {
  const perUnit = Math.max(0, Number(catalogBaseUnitPrice || 0));
  const printingCost = perUnit * totalQuantity;
  
  const lineItems: QuoteLineItem[] = [];
  
  if (printingCost > 0) {
    lineItems.push({
      label: `Printing (${totalQuantity} pcs × $${perUnit.toFixed(2)} / pc)`,
      amount: printingCost,
    });
  }
  
  return {
    lineItems,
    printingSubtotal: printingCost,
    printingPerUnit: perUnit,
  };
}

/**
 * Garment cost calculation for apparel products.
 * Garment cost is the price of the blank garment (t-shirt, hoodie, etc.).
 * - If useMyCloth = true → garmentCost = 0
 * - If useMyCloth = false → garmentCost = products.price × quantity
 */
function resolveGarmentCost(
  useMyCloth: boolean,
  garmentBasePrice: number | null | undefined,
  totalQuantity: number
): { lineItems: QuoteLineItem[]; garmentSubtotal: number; garmentPerUnit: number } {
  const garmentLineItems: QuoteLineItem[] = [];
  
  if (!useMyCloth && garmentBasePrice != null && garmentBasePrice > 0) {
    const garmentCost = garmentBasePrice * totalQuantity;
    garmentLineItems.push({
      label: `Garment (${totalQuantity} pcs × $${garmentBasePrice.toFixed(2)} / pc)`,
      amount: garmentCost,
    });
    return {
      lineItems: garmentLineItems,
      garmentSubtotal: garmentCost,
      garmentPerUnit: garmentBasePrice,
    };
  }
  
  return {
    lineItems: [],
    garmentSubtotal: 0,
    garmentPerUnit: 0,
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
  const itemPrice = merchandisePerUnit + addonsPerUnit;
  const quantitySubtotal = merchandiseSubtotal + addonsTotal;
  const discountedSubtotal = quantitySubtotal;

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
export const VALID_DELIVERY_METHODS = [
  'pickup',
  'local_delivery',
  'standard_shipping',
  'review_required',
] as const;

export type ValidDeliveryMethod = (typeof VALID_DELIVERY_METHODS)[number];

export function normalizeDeliveryMethod(value: unknown): ValidDeliveryMethod {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'pickup' || normalized === 'store_pickup' || normalized === 'store pickup') {
    return 'pickup';
  }
  if (normalized === 'local_delivery' || normalized === 'local-delivery' || normalized === 'local delivery') {
    return 'local_delivery';
  }
  if (
    normalized === 'standard_shipping' ||
    normalized === 'standard-shipping' ||
    normalized === 'standard shipping' ||
    normalized === 'shipping' ||
    normalized === 'ship'
  ) {
    return 'standard_shipping';
  }
  if (normalized === 'review_required' || normalized === 'review-required' || normalized === 'shipping review required') {
    return 'review_required';
  }

  throw new Error(`Invalid delivery method: ${String(value || '')}`);
}

function requireEnabledId<T extends { id: string | number; enabled?: boolean }>(
  selectedId: unknown,
  options: T[],
  label: string,
): T | null {
  if (selectedId == null || selectedId === '') return null;

  const selected = options.find((option) => String(option.id) === String(selectedId));
  if (!selected) {
    throw new Error(`Invalid ${label} selected: ${String(selectedId)}`);
  }
  if (selected.enabled === false) {
    throw new Error(`Disabled ${label} selected: ${String(selectedId)}`);
  }
  return selected;
}

function requireEnabledIds<T extends { id: string | number; enabled?: boolean }>(
  selectedIds: unknown,
  options: T[],
  label: string,
): T[] {
  if (selectedIds == null) return [];
  if (!Array.isArray(selectedIds)) {
    throw new Error(`Invalid ${label} selection. Expected an array.`);
  }

  return selectedIds.map((id) => requireEnabledId(id, options, label) as T).filter(Boolean);
}

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function computeShipping(
  shipping: ShippingConfig,
  deliveryMethod: ValidDeliveryMethod,
  shippingTierSubtotal: number,
  state?: string,
  zip?: string,
): number {
  if (deliveryMethod === 'pickup' || deliveryMethod === 'review_required') return 0;
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

  // Size surcharges are GARMENT DEPENDENT - NO size surcharge when customer supplies their own fabric
  let sizeAddonPerUnit = 0;
  if (!useMyCloth) {
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

  let productionTimeTotal = 0;
  let productionTimeLabel = 'Turnaround';
  if (turnaroundOptionId) {
    const turnaround = config.turnarounds.find((t) => t.id === turnaroundOptionId && t.enabled) || null;
    if (turnaround) {
      const pricingType = turnaround.pricingType || 'flat';
      if (pricingType === 'percentage' && turnaround.percentageValue != null) {
        const printingTotal = addonsPerUnit * totalQuantity;
        const designerHelpTotal = flatFees.reduce((sum, f) => sum + f.amount, 0);
        const baseForPct = printingTotal + designerHelpTotal;
        productionTimeTotal = baseForPct * (turnaround.percentageValue / 100);
      } else if (turnaround.priceModifier !== 0) {
        productionTimeTotal = turnaround.priceModifier;
      }
      if (productionTimeTotal !== 0) {
        productionTimeLabel = `Turnaround (${turnaround.name})`;
      }
    }
  }

  // Calculate garment cost (blank garment price - independent of printing)
  const garmentResult = resolveGarmentCost(!!useMyCloth, config.baseUnitPrice, totalQuantity);

  // Calculate printing cost (decoration + print locations)
  const printingSubtotal = addonsPerUnit * totalQuantity;
  const printingLineItems = addonBreakdown.map(a => ({
    label: `${a.label} (${totalQuantity} pcs × $${a.perUnit.toFixed(2)} / pc)`,
    amount: a.perUnit * totalQuantity,
  }));

  // Calculate size surcharge (garment dependent)
  const sizeSurchargeTotal = sizeAddonPerUnit * totalQuantity;
  const sizeSurchargeLineItems: QuoteLineItem[] = [];
  if (sizeSurchargeTotal !== 0) {
    sizeSurchargeLineItems.push({
      label: `Size surcharge (${totalQuantity} pcs)`,
      amount: sizeSurchargeTotal,
    });
  }

  // Build final pricing
  // Subtotal = garment cost + printing cost + size surcharge + turnaround + designer help
  const subtotalBeforeDiscount = garmentResult.garmentSubtotal + printingSubtotal + sizeSurchargeTotal + productionTimeTotal + flatFees.reduce((sum, f) => sum + f.amount, 0);
  
  const lineItems: QuoteLineItem[] = [
    ...garmentResult.lineItems,
    ...printingLineItems,
    ...sizeSurchargeLineItems,
    ...flatFees.map(f => ({ label: f.label, amount: f.amount })),
  ];

  // Add garment indicator when useMyCloth is true
  const finalLineItems = [...lineItems];
  if (useMyCloth) {
    finalLineItems.unshift({
      label: 'Garment (customer supplied fabric)',
      amount: 0,
    });
  }

  let subtotal = subtotalBeforeDiscount;

  // Apply discount on FULL subtotal (after all charges)
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
    finalLineItems.push({
      label: `Quantity discount (${discountType === 'PERCENT' ? discountValue + '%' : '$' + discountValue.toFixed(2)} for ${tierLabel})`,
      amount: -discountApplied,
    });
    subtotal -= discountApplied;
  }

  const shippingTierSubtotal = subtotal;
  const shipping = computeShipping(config.shipping, deliveryMethod, shippingTierSubtotal, shippingState, shippingZip);
  const grandTotal = subtotal + shipping;
  const unitPrice = totalQuantity > 0 ? subtotal / totalQuantity : 0;

  // merchandiseSubtotal = garment cost (for backwards compatibility with existing code)
  return {
    productId,
    totalQuantity,
    unitPrice,
    sizeBreakdown,
    lineItems: finalLineItems,
    subtotal,
    merchandiseSubtotal: garmentResult.garmentSubtotal,
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
  return null;
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
  if (qtyTiers.length > 0 && !tier) {
    throw new Error('No quantity pricing tier configured for this quantity');
  }

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

const tierPrinting = resolvePrintingCost(
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
             const baseForPct = tierPrinting.printingSubtotal + addonsTotal + designerHelpTotal;
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
     merchandiseLineItems: tierPrinting.lineItems,
     merchandiseSubtotal: tierPrinting.printingSubtotal,
     merchandisePerUnit: tierPrinting.printingPerUnit,
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
    merchandiseSubtotal: tierPrinting.printingSubtotal,
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
  zip?: string,
  options: { allowZeroQuote?: boolean } = {},
): QuoteSummary {
  const { mode, quantityBreakdown, selections, deliveryMethod, useMyCloth } = unifiedRequest;
  const normalizedDeliveryMethod = normalizeDeliveryMethod(deliveryMethod);

  // Calculate total quantity from normalized breakdown
  const totalQuantity = quantityBreakdown.reduce((sum, q) => sum + q.quantity, 0);

  if (totalQuantity <= 0) {
    throw new Error('Total quantity must be greater than zero');
  }
  if (config.baseUnitPrice != null && config.baseUnitPrice < 0) {
    throw new Error('Product base price cannot be negative');
  }

  // Determine which tiers to use based on mode
  const tiers = config.quantityTiers;

  // Find applicable tier
  const tier = findApplicableTier(tiers, totalQuantity);
  if (!tier && config.quantityTiers.length > 0 && !dimensionPricing?.pricePerSqInch) {
    throw new Error('No quantity pricing tier configured for this quantity');
  }

  // Build addon breakdown based on mode (PRINTING COST)
  const { addonBreakdown, addonsPerUnit } = resolveAddonsForMode(
    config,
    pools,
    mode,
    selections,
    dimensionPricing
  );

  // Calculate flat fees (turnaround + designer help)
  const { flatFees } = resolveFlatFeesForMode(
    config,
    pools,
    mode,
    selections
  );

  // Calculate size addon per unit (GARMENT DEPENDENT - size surcharge)
  const sizeAddonPerUnit = resolveSizeAddonPerUnit(
    mode,
    config.sizes,
    quantityBreakdown,
    useMyCloth || false
  );

  // Calculate garment cost only for apparel. Print products must never use apparel garment logic.
  const garmentLineItems: QuoteLineItem[] = [];
  let garmentSubtotal = 0;
  const garmentBaseUnitPrice = mode === 'apparel' ? (config.baseUnitPrice || null) : null;
  if (mode === 'apparel' && !useMyCloth && garmentBaseUnitPrice != null && garmentBaseUnitPrice > 0) {
    garmentSubtotal = garmentBaseUnitPrice * totalQuantity;
    garmentLineItems.push({
      label: `Garment (${totalQuantity} pcs × $${garmentBaseUnitPrice.toFixed(2)} / pc)`,
      amount: garmentSubtotal,
    });
  }

  const basePrintingSubtotal = mode === 'print_product' && config.baseUnitPrice != null && config.baseUnitPrice > 0
    ? config.baseUnitPrice * totalQuantity
    : 0;
  const basePrintingLineItems: QuoteLineItem[] = [];
  if (basePrintingSubtotal > 0) {
    basePrintingLineItems.push({
      label: `Base printing (${totalQuantity} pcs × $${Number(config.baseUnitPrice).toFixed(2)} / pc)`,
      amount: basePrintingSubtotal,
    });
  }

  // Calculate production time / turnaround
  const designerHelpTotal = flatFees.reduce((sum, f) => sum + f.amount, 0);
  const { productionTimeTotal, productionTimeLabel } = resolveProductionTimeForMode(
    config,
    pools,
    selections,
    totalQuantity,
    addonsPerUnit, // Printing costs for percentage-based turnaround
    garmentSubtotal + basePrintingSubtotal,
    designerHelpTotal
  );

  // Calculate size surcharge line item (garment dependent)
  const sizeSurchargeTotal = sizeAddonPerUnit * totalQuantity;
  const sizeSurchargeLineItems: QuoteLineItem[] = [];
  if (sizeSurchargeTotal !== 0) {
    sizeSurchargeLineItems.push({
      label: `Size surcharge (${totalQuantity} pcs)`,
      amount: sizeSurchargeTotal,
    });
  }

  // Build final pricing
  // Subtotal = garment/base printing + printing addons + size surcharge + turnaround
  const printingSubtotal = basePrintingSubtotal + addonsPerUnit * totalQuantity;
  const subtotalBeforeDiscount = garmentSubtotal + printingSubtotal + sizeSurchargeTotal + productionTimeTotal + designerHelpTotal;
  if (subtotalBeforeDiscount < 0) {
    throw new Error('Quote subtotal cannot be negative');
  }
  
  const lineItems: QuoteLineItem[] = [
    ...garmentLineItems,
    ...basePrintingLineItems,
    ...addonBreakdown.map(a => ({
      label: `${a.label} (${totalQuantity} pcs × $${a.perUnit.toFixed(2)} / pc)`,
      amount: a.perUnit * totalQuantity,
    })),
    ...sizeSurchargeLineItems,
    ...flatFees.map(f => ({ label: f.label, amount: f.amount })),
  ];

  // Apply discount on FULL subtotal (after all charges)
  const discountType = tier?.discountType || 'NONE';
  const discountValue = tier?.discountValue ?? 0;
  let discountApplied = 0;
  const tierLabel = tier ? formatTierQtyLabel(tier) : '';

  if (discountType === 'PERCENT' && discountValue > 0) {
    discountApplied = Math.min(subtotalBeforeDiscount, (subtotalBeforeDiscount * Math.min(100, discountValue)) / 100);
  } else if (discountType === 'FIXED' && discountValue > 0) {
    discountApplied = Math.min(subtotalBeforeDiscount, discountValue);
  }

  const finalLineItems = [...lineItems];
  let subtotal = subtotalBeforeDiscount;
  if (discountApplied > 0) {
    finalLineItems.push({
      label: `Quantity discount (${discountType === 'PERCENT' ? discountValue + '%' : '$' + discountValue.toFixed(2)} for ${tierLabel})`,
      amount: -discountApplied,
    });
    subtotal -= discountApplied;
  }

  const shippingTierSubtotal = subtotal;
  const shipping = computeShipping(config.shipping, normalizedDeliveryMethod, shippingTierSubtotal, state, zip);
  const grandTotal = subtotal + shipping;
  if (!options.allowZeroQuote && grandTotal <= 0) {
    throw new Error('Quote total must be greater than zero');
  }
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
    lineItems: finalLineItems,
    subtotal,
    merchandiseSubtotal: garmentSubtotal + printingSubtotal,
    shipping,
    grandTotal,
    shippingTierSubtotal: subtotal,
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
    const decoration = requireEnabledId(selections.decorationOptionId, config.decorations, 'decoration');
    if (decoration && decoration.priceModifier !== 0) {
      addonBreakdown.push({
        label: `Decoration (${decoration.name})`,
        perUnit: decoration.priceModifier,
      });
    }

    const printLocations = requireEnabledIds(selections.printLocationIds, config.printLocations, 'print location');
    if (printLocations.length > 0) {
      let locationsPerUnit = 0;
      for (const loc of printLocations) {
        locationsPerUnit += loc.priceModifier;
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
      if (!pool?.options) {
        throw new Error(`Invalid print product option pool selected: ${poolKey}`);
      }

      if (sel === undefined || sel === null || sel === '' || (Array.isArray(sel) && sel.length === 0)) {
        throw new Error(`Missing print product option for ${poolKey}`);
      }

      const ids = Array.isArray(sel) ? sel : [sel];
      for (const id of ids) {
        if (typeof id !== 'string') {
          throw new Error(`Invalid print product option ID for ${poolKey}`);
        }
        const opt = requireEnabledId(id, pool.options, `print product option ${poolKey}`);
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
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        throw new Error('Valid width and height are required for dimension pricing');
      }
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
    const help = requireEnabledId(selections.designerHelpOptionId, config.designerHelp, 'designer help');
    if (help && help.priceModifier !== 0) {
      flatFees.push({
        label: `Designer help (${help.name})`,
        amount: help.priceModifier,
      });
    }
  } else {
    // Print product: designer help from pool
    const designerSel = selections.designer_help;
    if (designerSel) {
      const pool = poolMap.get('designer_help');
      if (!pool?.options) {
        throw new Error('Invalid designer help pool selected');
      }
      const id = Array.isArray(designerSel) ? designerSel[0] : designerSel;
      if (typeof id !== 'string') {
        throw new Error('Invalid designer help option ID');
      }
      const opt = requireEnabledId(id, pool.options, 'designer help');
      if (opt && opt.priceModifier !== 0) {
        flatFees.push({
          label: `${pool.name} (${opt.label})`,
          amount: opt.priceModifier,
        });
      }
    }
  }

  return { flatFees };
}

/**
 * Resolve size addon per unit (only applicable for apparel).
 * Size surcharges are GARMENT DEPENDENT - they should be zero when customer supplies their own fabric.
 */
function resolveSizeAddonPerUnit(
  mode: 'apparel' | 'print_product',
  sizes: SizeOption[],
  quantityBreakdown: { key: string; label: string; quantity: number }[],
  useMyCloth: boolean
): number {
  // Size surcharges are garment-dependent - NO size surcharge when customer supplies fabric
  if (useMyCloth) {
    return 0;
  }
  if (mode !== 'apparel') {
    return 0;
  }
  if (sizes.length === 0 || quantityBreakdown.length === 0) {
    throw new Error('Apparel quote requires valid size selections');
  }

  const sizeMap = new Map(sizes.map(s => [s.id, s]));
  const totalQuantity = quantityBreakdown.reduce((sum, q) => sum + q.quantity, 0);

  let sizeAddonTotal = 0;
  for (const q of quantityBreakdown) {
    const size = sizeMap.get(q.key);
    if (!size) {
      throw new Error(`Invalid size selected: ${q.key}`);
    }
    if (size.priceAddon !== 0) {
      sizeAddonTotal += size.priceAddon * q.quantity;
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
    if (!productionPool?.options) {
      throw new Error('Invalid production time pool selected');
    }
    const id = Array.isArray(productionSel) ? productionSel[0] : productionSel;
    if (typeof id !== 'string') {
      throw new Error('Invalid production time option ID');
    }
    const opt = requireEnabledId(id, productionPool.options, 'production time');
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

  // Apparel mode: turnaround from config
  const selectedTurnaround = requireEnabledId(selections.turnaroundOptionId, config.turnarounds, 'turnaround');
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

  return { productionTimeTotal: 0, productionTimeLabel: 'Turnaround' };
}
