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
    weight_lb?: number | null;
    package_length_in?: number | null;
    package_width_in?: number | null;
    package_height_in?: number | null;
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

export type ShippingCostResult = {
  cost: number;
  flagReviewRequired?: boolean;
  oversizedDetected?: boolean;
};

// ============================================================
// UTILITIES
// ============================================================

/**
 * Parse width from dimension selections (inches)
 */
function parseWidthInches(selections: Record<string, unknown> | undefined): number | null {
  if (!selections) return null;
  const widthRaw = selections.width_in;
  if (typeof widthRaw === 'number') {
    return Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : null;
  }
  if (typeof widthRaw === 'string') {
    const parsed = Number.parseFloat(widthRaw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
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
 * Detect if any cart items are oversized (width > configured threshold)
 * Checks width_in from quotePayload selections for each item.
 */
export function detectOversizedItems(cartItems: CartItem[], threshold: number): boolean {
  const oversizedThreshold = Number(threshold);
  if (!Number.isFinite(oversizedThreshold)) return false;

  for (const item of cartItems) {
    const selections = item.quotePayload?.selections;
    const width = parseWidthInches(selections);
    if (width !== null && width > oversizedThreshold) {
      return true;
    }
  }
  return false;
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
  const oversizedDetected = detectOversizedItems(cartItems, config.oversizedWidthThresholdIn);
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
  const oversizedDetected = detectOversizedItems(cartItems, config.oversizedWidthThresholdIn);
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