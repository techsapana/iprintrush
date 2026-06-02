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
  unitPrice?: number;
  discountPercent?: number;
};

type QuoteLineItem = { label: string; amount: number };

/** Reference unit price for % tier discounts (product base, else lowest qty tier value). */
function getReferenceBaseUnitPrice(
  tiers: { minQty: number; unitPrice: number; enabled?: boolean }[],
  catalogBaseUnitPrice?: number | null,
): number {
  if (catalogBaseUnitPrice != null && Number.isFinite(Number(catalogBaseUnitPrice))) {
    const catalog = Number(catalogBaseUnitPrice);
    if (catalog > 0) return catalog;
  }
  const enabled = tiers
    .filter((t) => t.enabled !== false)
    .sort((a, b) => a.minQty - b.minQty);
  if (enabled.length === 0) return 0;
  return Math.max(0, Number(enabled[0].unitPrice || 0));
}

function formatTierQtyLabel(tier: { minQty?: number; maxQty?: number | null }): string {
  return tier.maxQty != null ? `${tier.minQty}–${tier.maxQty}` : `${tier.minQty}+`;
}

/**
 * Quantity tier merchandise:
 * - discountPercent > 0: qty × reference base, then reduce by % (ignore tier unitPrice value)
 * - else: qty × matched tier unitPrice (value field)
 */
function resolveQuantityTierMerchandise(
  allTiers: { minQty: number; maxQty: number | null; unitPrice: number; discountPercent?: number; enabled?: boolean }[],
  matchedTier: TierWithDiscount & { unitPrice?: number },
  totalQuantity: number,
  catalogBaseUnitPrice?: number | null,
): { lineItems: QuoteLineItem[]; merchandiseSubtotal: number; merchandisePerUnit: number } {
  const pct = Math.max(0, Number(matchedTier.discountPercent || 0));
  const tierLabel = formatTierQtyLabel(matchedTier);

  if (pct > 0) {
    const basePerUnit = getReferenceBaseUnitPrice(allTiers, catalogBaseUnitPrice);
    const beforeDiscount = basePerUnit * totalQuantity;
    const discountAmount = beforeDiscount * (pct / 100);
    const afterDiscount = beforeDiscount - discountAmount;
    const lineItems: QuoteLineItem[] = [];
    if (basePerUnit !== 0 || beforeDiscount !== 0) {
      lineItems.push({
        label: `Base price ($${basePerUnit.toFixed(2)} / pc × ${totalQuantity})`,
        amount: beforeDiscount,
      });
      lineItems.push({
        label: `Quantity tier discount (${pct}% off, qty ${tierLabel})`,
        amount: -discountAmount,
      });
    }
    return {
      lineItems,
      merchandiseSubtotal: afterDiscount,
      merchandisePerUnit: totalQuantity > 0 ? afterDiscount / totalQuantity : basePerUnit,
    };
  }

  let perUnit = Math.max(0, Number(matchedTier.unitPrice || 0));
  if (perUnit === 0 && catalogBaseUnitPrice != null && Number(catalogBaseUnitPrice) > 0) {
    perUnit = Number(catalogBaseUnitPrice);
  }
  const merchandiseSubtotal = perUnit * totalQuantity;
  const lineItems: QuoteLineItem[] = [];
  if (perUnit !== 0) {
    lineItems.push({
      label: `Base price ($${perUnit.toFixed(2)} / pc × ${totalQuantity}, qty ${tierLabel})`,
      amount: merchandiseSubtotal,
    });
  }
  return {
    lineItems,
    merchandiseSubtotal,
    merchandisePerUnit: perUnit,
  };
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

function computeShipping(
  shipping: ShippingConfig,
  deliveryMethod: QuoteRequestPayload['deliveryMethod'],
  state?: string,
  zip?: string,
): number {
  if (deliveryMethod === 'pickup') return 0;
  if (!shipping.enabled) return 0;

  if (!state && !zip) return shipping.defaultFlatRate;

  const enabledRules = shipping.rules.filter((r) => r.enabled);

  if (zip) {
    const byZip = enabledRules.find(
      (r) => r.mode === 'zip' && r.zipPrefix && zip.startsWith(r.zipPrefix),
    );
    if (byZip) return byZip.flatRate;
  }

  if (state) {
    const byState = enabledRules.find(
      (r) => r.mode === 'state' && r.state && r.state.toLowerCase() === state.toLowerCase(),
    );
    if (byState) return byState.flatRate;
  }

  const flat = enabledRules.find((r) => r.mode === 'flat');
  if (flat) return flat.flatRate;

  return shipping.defaultFlatRate;
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
    ? { lineItems: [] as QuoteLineItem[], merchandiseSubtotal: 0, merchandisePerUnit: 0 }
    : resolveQuantityTierMerchandise(config.quantityTiers, tier, totalQuantity, null);

  if (selectedTurnaround) {
    const pricingType = selectedTurnaround.pricingType || 'flat';
    if (pricingType === 'percentage' && selectedTurnaround.percentageValue != null) {
      const addonsTotal = addonsPerUnit * totalQuantity;
      const baseForPct = tierMerchandise.merchandiseSubtotal + addonsTotal;
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

  const lineItems = priced.lineItems;
  if (useMyCloth) {
    lineItems.unshift({
      label: 'Base garment (customer supplied fabric)',
      amount: 0,
    });
  }

  const subtotal = priced.productSubtotal;
  const shipping = computeShipping(config.shipping, deliveryMethod, shippingState, shippingZip);
  const grandTotal = subtotal + shipping;
  const unitPrice = totalQuantity > 0 ? subtotal / totalQuantity : 0;

  return {
    productId,
    totalQuantity,
    unitPrice,
    sizeBreakdown,
    lineItems,
    subtotal,
    shipping,
    grandTotal,
  };
}

/** Find applicable quantity tier for dynamic print products */
function findDynamicTier(
  tiers: {
    minQty: number;
    maxQty: number | null;
    unitPrice: number;
    discountPercent?: number;
  }[],
  totalQty: number,
): {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  discountPercent?: number;
} | null {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (const tier of sorted) {
    const withinMin = totalQty >= tier.minQty;
    const withinMax = tier.maxQty == null || totalQty <= tier.maxQty;
    if (withinMin && withinMax) return tier;
  }
  return sorted[sorted.length - 1] ?? null;
}

/** Compute shipping for dynamic payload */
function computeShippingDynamic(
  shipping: ShippingConfig,
  deliveryMethod: 'pickup' | 'shipping',
  state?: string,
  zip?: string
): number {
  if (deliveryMethod === 'pickup') return 0;
  if (!shipping.enabled) return 0;
  if (!state && !zip) return shipping.defaultFlatRate;
  const enabledRules = shipping.rules.filter((r: any) => r.enabled);
  if (zip) {
    const byZip = enabledRules.find(
      (r: any) => r.mode === 'zip' && r.zipPrefix && zip.startsWith(r.zipPrefix)
    );
    if (byZip) return byZip.flatRate;
  }
  if (state) {
    const byState = enabledRules.find(
      (r: any) => r.mode === 'state' && r.state && r.state.toLowerCase() === state.toLowerCase()
    );
    if (byState) return byState.flatRate;
  }
  const flat = enabledRules.find((r: any) => r.mode === 'flat');
  if (flat) return flat.flatRate;
  return shipping.defaultFlatRate;
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
      : { minQty: 1, maxQty: null, unitPrice: 0 };
  // Quantity tiers are optional for dynamic products. If no tiers exist, base unit price defaults to $0.

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
    qtyTiers,
    tier,
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
            const baseForPct = tierMerchandise.merchandiseSubtotal + addonsTotal;
            productionTimeTotal = baseForPct * (opt.percentageValue / 100);
          } else if (opt.priceModifier !== 0) {
            productionTimeTotal = opt.priceModifier * totalQuantity;
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

  const lineItems = priced.lineItems;
  const subtotal = priced.productSubtotal;
  const shippingCost = computeShippingDynamic(shipping, deliveryMethod, shippingState, shippingZip);
  const grandTotal = subtotal + shippingCost;
  const unitPrice = totalQuantity > 0 ? subtotal / totalQuantity : 0;

  return {
    productId,
    totalQuantity,
    unitPrice,
    sizeBreakdown: [{ sizeLabel: 'Total', quantity: totalQuantity }],
    lineItems,
    subtotal,
    shipping: shippingCost,
    grandTotal,
  };
}
