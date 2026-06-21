/**
 * Shipping Engine - Unified subtotal-based shipping calculation
 *
 * Single source of truth for all shipping pricing.
 * All rates come from shipping_config table (admin configurable).
 * No hardcoded fallback values.
 */

// ============================================================
// TYPES
// ============================================================

export type CartItem = {
  id: string;
  quantity: number;
  price?: number;
  merchandiseSubtotal?: number;
  shippingTierSubtotal?: number;
  options?: {
    extraPrice?: number;
    merchandiseSubtotal?: number;
    shippingTierSubtotal?: number;
    quoteSummary?: {
      shippingTierSubtotal?: number;
      merchandiseSubtotal?: number;
      subtotal?: number;
    } | null;
  } | null;
  /** Selections from quote payload for dimension extraction */
  quotePayload?: {
    mode?: string;
    selections?: Record<string, unknown>;
  } | null;
  /** Product data for local delivery eligibility */
  product?: {
    id: string;
    localDeliveryEligible?: boolean | null;
    shippingCategory?: string | null;
    weight_lb?: number | string | null;
    package_length_in?: number | string | null;
    package_width_in?: number | string | null;
    package_height_in?: number | string | null;
  } | null;
};

export type ShippingMethod =
  | 'pickup'
  | 'local_delivery'
  | 'standard_shipping'
  | 'review_required';

export type ShippingMethodOption = {
  id: ShippingMethod;
  type: ShippingMethod;
  label: string;
  cost: number;
  description?: string;
  available: boolean;
};

export type ShippingSummary = {
  totalQuantity: number;
  oversizedDetected: boolean;
  methods: ShippingMethodOption[];
  defaultMethod?: ShippingMethod;
};

export type ShippingConfig = {
  enabled: boolean;
  defaultFlatRate: number;
  oversizedWidthThresholdIn: number;
  oversizedWeightThresholdLb: number;
  under100Rate: number;
  between100And199Rate: number;
  over200Rate: number;
  localUnder100Rate: number;
  localBetween100And199Rate: number;
  localOver200Rate: number;
  rules: ShippingRule[];
};

export type ShippingRule = {
  id: string;
  mode: 'flat' | 'state' | 'zip';
  state?: string;
  zipPrefix?: string;
  flatRate: number;
  enabled: boolean;
};

export function buildShippingConfig(row: Record<string, unknown> | null | undefined): ShippingConfig {
  const data = row || {};
  return {
    enabled: Boolean(data.enabled ?? true),
    defaultFlatRate: Number(data.default_flat_rate ?? 0),
    oversizedWidthThresholdIn: Number(data.oversized_width_threshold_in ?? 0),
    oversizedWeightThresholdLb: Number(data.oversized_weight_threshold_lb ?? 0),
    under100Rate: Number(data.under_100_rate ?? 0),
    between100And199Rate: Number(data.between_100_199_rate ?? 0),
    over200Rate: Number(data.over_200_rate ?? 0),
    localUnder100Rate: Number(data.local_under_100_rate ?? 0),
    localBetween100And199Rate: Number(data.local_between_100_199_rate ?? 0),
    localOver200Rate: Number(data.local_over_200_rate ?? 0),
    rules: [],
  };
}

export type ShippingCostResult = {
  cost: number;
  flagReviewRequired?: boolean;
  oversizedDetected?: boolean;
};

export type ShippingDecision = {
  status: 'OK' | 'REVIEW_REQUIRED';
  isOversized: boolean;
  allowedMethods: ShippingMethod[];
  blockedMethods: ShippingMethod[];
  shippingReviewRequired: boolean;
  message: string;
  details?: {
    widthExceeded?: { selectedWidth: number; maxAllowedWidth: number };
    weightExceeded?: { productWeight: number; maxAllowedWeight: number };
  };
};

// ============================================================
// UTILITIES
// ============================================================

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

/**
 * Parse width from dimension selections (inches)
 */
function parseWidthInches(selections: Record<string, unknown> | undefined): number | null {
  if (!selections) return null;
  return toPositiveNumber(selections.width_in);
}

export function getEffectiveItemWidth(item: CartItem): number {
  const selectedWidth = parseWidthInches(item.quotePayload?.selections);
  const rawPackageWidth = item.product?.package_width_in;
  const packageWidth = typeof rawPackageWidth === 'number' 
    ? rawPackageWidth 
    : typeof rawPackageWidth === 'string' 
      ? Number.parseFloat(rawPackageWidth) 
      : 0;
  const safePackageWidth = Number.isFinite(packageWidth) ? packageWidth : 0;

  if (selectedWidth == null || !Number.isFinite(selectedWidth)) return safePackageWidth;
  return Math.max(selectedWidth, safePackageWidth);
}

/**
 * Get weight for an item (base weight * quantity)
 * Returns 0 if weight is not available - ensures safe oversized detection
 */
function getItemWeight(item: CartItem): number {
  const rawWeight = item.product?.weight_lb;
  const baseWeight = typeof rawWeight === 'number' 
    ? rawWeight 
    : typeof rawWeight === 'string' 
      ? Number.parseFloat(rawWeight) 
      : 0;
  const safeWeight = Number.isFinite(baseWeight) ? baseWeight : 0;
  const qty = Math.max(1, item.quantity || 1);
  return safeWeight * qty;
}

/**
 * Calculate total quantity from cart items
 */
function calculateTotalQuantity(cartItems: CartItem[]): number {
  return cartItems.reduce((sum, item) => sum + Math.max(1, item.quantity || 1), 0);
}

/**
 * Calculate shipping tier subtotal from cart items
 */
function calculateShippingTierSubtotalFromCartItems(cartItems: CartItem[]): number {
  return cartItems.reduce((sum, item) => {
    const explicitSubtotal =
      item.shippingTierSubtotal
      ?? item.options?.shippingTierSubtotal
      ?? item.options?.quoteSummary?.shippingTierSubtotal
      ?? item.options?.quoteSummary?.subtotal
      ?? item.merchandiseSubtotal
      ?? item.options?.merchandiseSubtotal
      ?? item.options?.quoteSummary?.merchandiseSubtotal;

    if (Number.isFinite(Number(explicitSubtotal))) {
      return sum + Math.max(0, Number(explicitSubtotal));
    }

    const quantity = Math.max(1, Number(item.quantity || 1));
    const unitPrice = Math.max(0, Number(item.price || 0) + Number(item.options?.extraPrice || 0));
    return sum + unitPrice * quantity;
  }, 0);
}

export function getShippingTierSubtotalFromCartItems(cartItems: CartItem[]): number {
  return calculateShippingTierSubtotalFromCartItems(cartItems);
}

// ============================================================
// CORE SHIPPING CALCULATION - Single Source of Truth
// ============================================================

/**
 * Unified shipping cost calculation
 * All rates come from shipping_config table.
 * If DB value missing, returns 0 safely.
 */
export type ShippingTierKey = 'under_100' | 'between_100_199' | 'over_200';

export function getShippingTierKey(shippingTierSubtotal: number): ShippingTierKey {
  const subtotal = Math.max(0, Number(shippingTierSubtotal) || 0);
  if (subtotal >= 200) return 'over_200';
  if (subtotal >= 100) return 'between_100_199';
  return 'under_100';
}

export function getShippingCost(
  shippingTierSubtotal: number,
  type: 'standard_shipping' | 'local_delivery',
  config: ShippingConfig,
): number {
  // If shipping disabled, return 0
  if (!config.enabled) return 0;

  const tierKey = getShippingTierKey(shippingTierSubtotal);

  // Standard shipping rates
  if (type === 'standard_shipping') {
    if (tierKey === 'over_200') return Number(config.over200Rate) || 0;
    if (tierKey === 'between_100_199') return Number(config.between100And199Rate) || 0;
    return Number(config.under100Rate) || 0;
  }

  // Local delivery rates
  if (type === 'local_delivery') {
    if (tierKey === 'over_200') return Number(config.localOver200Rate) || 0;
    if (tierKey === 'between_100_199') return Number(config.localBetween100And199Rate) || 0;
    return Number(config.localUnder100Rate) || 0;
  }

  return 0;
}

// ============================================================
// BACKWARD COMPATIBILITY - Legacy function (uses getShippingCost)
// ============================================================

/**
 * Single source of truth for shipping eligibility decisions.
 * Returns unified decision object for all consumers.
 */
export function getShippingDecision(
  items: CartItem[],
  config: ShippingConfig
): ShippingDecision {
  const oversizedDetails = getOversizedDetails(items, config);
  const isOversized = oversizedDetails.anyOversized;

  if (isOversized) {
    return {
      status: 'REVIEW_REQUIRED',
      isOversized: true,
      allowedMethods: ['pickup', 'review_required'],
      blockedMethods: ['local_delivery', 'standard_shipping'],
      shippingReviewRequired: true,
      message: 'This item requires manual shipping review',
      details: oversizedDetails,
    };
  }

  return {
    status: 'OK',
    isOversized: false,
    allowedMethods: ['pickup', 'local_delivery', 'standard_shipping'],
    blockedMethods: [],
    shippingReviewRequired: false,
    message: 'Shipping available normally',
    details: undefined,
  };
}

export function calculateShippingCostByQuantity(method: ShippingMethod, totalQuantity: number): ShippingCostResult {
  // This function now requires config - for backward compatibility, return 0
  // Real usage should call getShippingCost() with config from DB
  switch (method) {
    case 'pickup':
      return { cost: 0, oversizedDetected: false };
    case 'local_delivery':
      return { cost: 0, oversizedDetected: false };
    case 'standard_shipping':
      return { cost: 0, oversizedDetected: false };
    case 'review_required':
      return { cost: 0, flagReviewRequired: true, oversizedDetected: false };
    default:
      return { cost: 0, oversizedDetected: false };
  }
}

// ============================================================
// OVERSIZED DETECTION
// ============================================================

/**
 * Get detailed oversized detection info for UI warnings
 */
export type OversizedReason = {
  widthExceeded?: {
    selectedWidth: number;
    maxAllowedWidth: number;
  };
  weightExceeded?: {
    productWeight: number;
    maxAllowedWeight: number;
  };
  anyOversized: boolean;
};

/**
 * Detect oversized items and return detailed reasons
 * Checks max(selections.width_in, product.package_width_in) for width.
 * Checks product.weight_lb (multiplied by quantity) for weight.
 */
export function getOversizedDetails(cartItems: CartItem[], config: ShippingConfig): OversizedReason {
  const widthThreshold = Number(config.oversizedWidthThresholdIn);
  const weightThreshold = Number(config.oversizedWeightThresholdLb);
  
  let widthExceeded: { selectedWidth: number; maxAllowedWidth: number } | undefined;
  let weightExceeded: { productWeight: number; maxAllowedWeight: number } | undefined;
  
  for (const item of cartItems) {
    const width = getEffectiveItemWidth(item);
    
    // Check width threshold
    if (Number.isFinite(widthThreshold) && width > widthThreshold) {
      widthExceeded = { selectedWidth: width, maxAllowedWidth: widthThreshold };
    }
    
    // Check weight threshold
    const weight = getItemWeight(item);
    if (Number.isFinite(weightThreshold) && weightThreshold > 0 && weight > weightThreshold) {
      weightExceeded = { productWeight: weight, maxAllowedWeight: weightThreshold };
    }

    if (widthExceeded || weightExceeded) {
      break;
    }
  }
  
  return {
    widthExceeded,
    weightExceeded,
    anyOversized: widthExceeded !== undefined || weightExceeded !== undefined,
  };
}

/**
 * Detect if any cart items are oversized (width OR weight > configured thresholds)
 * Checks max(selections.width_in, product.package_width_in) for width.
 * Checks product.weight_lb (multiplied by quantity) for weight.
 */
export function detectOversizedItems(cartItems: CartItem[], config: ShippingConfig): boolean {
  return getOversizedDetails(cartItems, config).anyOversized;
}

// ============================================================
// SHIPPING METHODS
// ============================================================

/**
 * Get available shipping methods for a cart
 * Returns: pickup, local_delivery, standard_shipping (or review_required for oversized)
 */
export function getAvailableShippingMethods(
  cartItems: CartItem[],
  config: ShippingConfig,
  shippingTierSubtotal?: number,
): ShippingMethodOption[] {
  const oversizedDetected = detectOversizedItems(cartItems, config);
  const subtotal = Number.isFinite(Number(shippingTierSubtotal))
    ? Number(shippingTierSubtotal)
    : calculateShippingTierSubtotalFromCartItems(cartItems);

  const methods: ShippingMethodOption[] = [];

  // Pickup - always available
  methods.push({
    id: 'pickup',
    type: 'pickup',
    label: 'Store Pickup',
    cost: 0,
    description: 'Pick up your order at our Fair Oaks location',
    available: true,
  });

  // Local delivery - always available
  const localDeliveryCost = getShippingCost(subtotal, 'local_delivery', config);
  methods.push({
    id: 'local_delivery',
    type: 'local_delivery',
    label: 'Local Delivery',
    cost: localDeliveryCost,
    description: localDeliveryCost === 0
      ? 'Free local delivery for $200+ merchandise'
      : `$${localDeliveryCost.toFixed(2)} delivery fee`,
    available: true,
  });

  if (oversizedDetected) {
    // Oversized mode - hide standard_shipping, show review_required
    methods.push({
      id: 'review_required',
      type: 'review_required',
      label: 'Shipping Review Required',
      cost: 0,
      description: 'Oversized items require manual shipping review',
      available: true,
    });
  } else {
    // Normal mode - standard shipping available
    const standardCost = getShippingCost(subtotal, 'standard_shipping', config);
    methods.push({
      id: 'standard_shipping',
      type: 'standard_shipping',
      label: 'Standard Shipping',
      cost: standardCost,
      description: standardCost === 0
        ? 'Free shipping for $200+ merchandise'
        : `$${standardCost.toFixed(2)} shipping fee`,
      available: true,
    });
  }

  return methods;
}

// ============================================================
// SHIPPING SUMMARY
// ============================================================

/**
 * Get complete shipping summary for a cart
 */
export function getShippingSummary(cartItems: CartItem[], config: ShippingConfig, shippingTierSubtotal?: number): ShippingSummary {
  const oversizedDetected = detectOversizedItems(cartItems, config);
  const totalQuantity = calculateTotalQuantity(cartItems);
  const methods = getAvailableShippingMethods(cartItems, config, shippingTierSubtotal);

  // Default to pickup
  const defaultMethod: ShippingMethod = 'pickup';

  return {
    totalQuantity,
    oversizedDetected,
    methods,
    defaultMethod,
  };
}

// ============================================================
// DISPLAY HELPERS
// ============================================================

export function getShippingMethodLabel(method: ShippingMethod | null | undefined): string {
  if (!method) return 'Unknown';
  switch (method) {
    case 'pickup':
      return 'Store Pickup';
    case 'local_delivery':
      return 'Local Delivery';
    case 'standard_shipping':
      return 'Standard Shipping';
    case 'review_required':
      return 'Shipping Review Required';
    default:
      return 'Unknown';
  }
}

export function getMethodDisplayInfo(method: ShippingMethod | null | undefined): {
  label: string;
  description: string;
} {
  if (!method) {
    return { label: 'Unknown', description: '' };
  }
  switch (method) {
    case 'pickup':
      return { label: 'Store Pickup', description: 'Pick up your order at our Fair Oaks location' };
    case 'local_delivery':
      return { label: 'Local Delivery', description: 'Delivered by our local driver' };
    case 'standard_shipping':
      return { label: 'Standard Shipping', description: 'Shipped via carrier' };
    case 'review_required':
      return { label: 'Shipping Review Required', description: 'Oversized items - manual review needed' };
    default:
      return { label: 'Unknown', description: '' };
  }
}

// ============================================================
// DEFAULT EXPORT - All public functions
// ============================================================

export default {
  detectOversizedItems,
  getTotalQuantity: calculateTotalQuantity,
  getShippingTierSubtotalFromCartItems,
  getShippingCost,
  getShippingTierKey,
  getAvailableShippingMethods,
  getShippingSummary,
  getShippingMethodLabel,
  getMethodDisplayInfo,
};