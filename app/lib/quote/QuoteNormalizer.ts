import {
  QuoteRequestPayload,
  DynamicQuoteRequestPayload,
  SimpleQuoteRequestPayload,
  CustomizationPool,
} from '../quoteConfigTypes';

/**
 * Extended apparel payload with optional fields from frontend
 */
type FrontendApparelPayload = QuoteRequestPayload & {
  artworkReady?: boolean;
  tempArtworkFiles?: string[];
  artworkFiles?: string[];
  customSizeNote?: string;
};

/**
 * Extended print product payload with optional fields from frontend
 */
type FrontendPrintProductPayload = DynamicQuoteRequestPayload & {
  artworkFiles?: string[];
  customSizeNote?: string;
};

/**
 * Simple quote payload with quantity only.
 */
type FrontendSimplePayload = SimpleQuoteRequestPayload;

/**
 * Unified quote request format that both apparel and print product flows use.
 * All pricing logic operates on this normalized structure only.
 */
export type UnifiedQuoteRequest = {
  productId: string;
  mode: 'apparel' | 'print_product' | 'simple';

  /**
    * Normalized quantity breakdown.
    * For apparel: [{ key: sizeId, label: 'S', quantity: 5 }, ...]
    * For print products: [{ key: quantityPoolKey, label: 'Total', quantity: 100 }]
    */
  quantityBreakdown: {
    key: string;
    label: string;
    quantity: number;
  }[];

  /**
    * All selections in a unified format.
    * - Single select: 'value'
    * - Multi select: ['value1', 'value2']
    * - Quantity: number
    */
  selections: Record<string, string | string[] | number>;

  deliveryMethod: 'pickup' | 'local_delivery' | 'standard_shipping' | 'review_required';
  artworkReady?: boolean;
  tempArtworkFiles?: string[];
  artworkFiles?: string[];
  customSizeNote?: string;
  /**
    * When true, customer is supplying their own garments ("use my cloth").
    * Garment cost and size surcharges should be zero.
    */
  useMyCloth?: boolean;
};

/**
 * Normalize apparel payload to unified format.
 * Converts quantities { sizeId: qty } to quantityBreakdown[]
 */
export function normalizeApparelPayload(
  payload: FrontendApparelPayload,
  sizeOptions: Array<{ id: string; label: string }>
): UnifiedQuoteRequest {
  const quantityBreakdown: UnifiedQuoteRequest['quantityBreakdown'] = [];

  const sizeMap = new Map(sizeOptions.map(s => [s.id, s.label]));

  for (const q of (payload.quantities || [])) {
    if (q.quantity > 0 && q.sizeId) {
      quantityBreakdown.push({
        key: q.sizeId,
        label: sizeMap.get(q.sizeId) || 'Unknown',
        quantity: q.quantity,
      });
    }
  }

  // For apparel, selections are the explicit option IDs
  const selections: Record<string, string | string[] | number> = {
    decorationOptionId: payload.decorationOptionId || '',
    colorOptionId: payload.colorOptionId || '',
    printLocationIds: payload.printLocationIds || [],
    turnaroundOptionId: payload.turnaroundOptionId || '',
    designerHelpOptionId: payload.designerHelpOptionId || '',
  };

  return {
    productId: payload.productId,
    mode: 'apparel',
    quantityBreakdown,
    selections,
    deliveryMethod: payload.deliveryMethod,
    artworkReady: payload.artworkReady,
    tempArtworkFiles: payload.tempArtworkFiles,
    artworkFiles: payload.artworkFiles,
    customSizeNote: payload.customSizeNote,
    useMyCloth: payload.useMyCloth,
  };
}

/**
 * Normalize print product payload to unified format.
 * Converts selections to quantityBreakdown based on quantity pool.
 */
export function normalizePrintProductPayload(
  payload: FrontendPrintProductPayload,
  pools: CustomizationPool[]
): UnifiedQuoteRequest {
  // Find the quantity pool key
  const quantityPoolKey = findQuantityPoolKey(pools);
  const totalQuantity = quantityPoolKey
    ? Number(payload.selections?.[quantityPoolKey] ?? 0)
    : 0;

  const quantityBreakdown: UnifiedQuoteRequest['quantityBreakdown'] = [];

  if (totalQuantity > 0) {
    // For print products, we have a single quantity entry
    quantityBreakdown.push({
      key: quantityPoolKey || 'quantity',
      label: 'Total',
      quantity: totalQuantity,
    });
  }

  // For dimension-based products, include width/height in selections
  const selections: Record<string, string | string[] | number> = { ...(payload.selections || {}) };

  return {
    productId: payload.productId,
    mode: 'print_product',
    quantityBreakdown,
    selections,
    deliveryMethod: payload.deliveryMethod,
    artworkReady: payload.artworkReady,
    tempArtworkFiles: payload.tempArtworkFiles,
    artworkFiles: payload.artworkFiles,
    customSizeNote: payload.customSizeNote,
  };
}

/**
 * Find the pool key that represents quantity for a print product.
 */
function findQuantityPoolKey(pools: CustomizationPool[]): string | null {
  if (!pools || pools.length === 0) return null;

  for (const pool of pools) {
    const key = String(pool.key || '').toLowerCase();
    const name = String(pool.name || '').toLowerCase();
    const type = String(pool.selectionType || '').toLowerCase();

    if (
      type === 'quantity' ||
      key === 'quantity' ||
      key === 'qty' ||
      key.includes('quantity') ||
      name.includes('quantity')
    ) {
      return pool.key;
    }
  }

  return null;
}

/**
 * Normalize simple product payload to unified format.
 * Simple products have just productId, quantity, and deliveryMethod.
 */
export function normalizeSimplePayload(
  payload: FrontendSimplePayload,
): UnifiedQuoteRequest {
  const quantity = Number(payload.quantity) || 0;

  const quantityBreakdown: UnifiedQuoteRequest['quantityBreakdown'] = [];
  if (quantity > 0) {
    quantityBreakdown.push({
      key: 'quantity',
      label: 'Total',
      quantity,
    });
  }

  return {
    productId: payload.productId,
    mode: 'simple',
    quantityBreakdown,
    selections: {
      quantity,
    },
    deliveryMethod: payload.deliveryMethod,
  };
}

/**
 * Main normalization function that handles both modes.
 */
export function normalizeQuoteRequest(
  payload: QuoteRequestPayload | DynamicQuoteRequestPayload | SimpleQuoteRequestPayload,
  poolsOrSizes?: CustomizationPool[] | Array<{ id: string; label: string }>
): UnifiedQuoteRequest {
  // Detect mode - DynamicQuoteRequestPayload has mode='print_product'
  const isPrintProduct = (payload as DynamicQuoteRequestPayload).mode === 'print_product';
  const isSimple = (payload as SimpleQuoteRequestPayload).mode === 'simple';

  if (isSimple) {
    return normalizeSimplePayload(payload as FrontendSimplePayload);
  }

  if (isPrintProduct && poolsOrSizes && Array.isArray(poolsOrSizes) && poolsOrSizes.length > 0 && 'selectionType' in poolsOrSizes[0]) {
    return normalizePrintProductPayload(payload as FrontendPrintProductPayload, poolsOrSizes as CustomizationPool[]);
  }

  // Apparel mode
  return normalizeApparelPayload(payload as FrontendApparelPayload, poolsOrSizes as Array<{ id: string; label: string }>);
}