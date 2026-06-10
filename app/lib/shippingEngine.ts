/**
 * Shipping Engine - Rule-based shipping calculation system
 *
 * PHASE 1: Parallel system that does NOT modify existing FedEx flow.
 * This engine provides alternative shipping methods for future integration.
 *
 * NOTE: This file contains ONLY pure logic - NO database imports.
 * DB-dependent functions are in shippingEngine.server.ts
 */

// ============================================================
// TYPES
// ============================================================

export type CartItem = {
  id: string;
  quantity: number;
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

export type ShippingCostResult = {
  cost: number;
  flagReviewRequired?: boolean;
  oversizedDetected?: boolean;
};

// ============================================================
// CONSTANTS - Pricing rules (can be moved to DB later)
// ============================================================

const LOCAL_DELIVERY_RATES = {
  under100: 14.99,
  between100And199: 9.99,
  over200: 0,
} as const;

const STANDARD_SHIPPING_RATES = {
  under100: 12.99,
  between100And199: 9.99,
  over200: 0,
} as const;

const OVERSIZED_WIDTH_THRESHOLD = 44; // inches

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
 * Calculate local delivery shipping cost based on quantity tiers
 */
function calculateLocalDeliveryCost(totalQuantity: number): number {
  if (totalQuantity >= 200) return LOCAL_DELIVERY_RATES.over200;
  if (totalQuantity >= 100) return LOCAL_DELIVERY_RATES.between100And199;
  return LOCAL_DELIVERY_RATES.under100;
}

/**
 * Calculate standard shipping cost based on quantity tiers
 */
function calculateStandardShippingCost(totalQuantity: number): number {
  if (totalQuantity >= 200) return STANDARD_SHIPPING_RATES.over200;
  if (totalQuantity >= 100) return STANDARD_SHIPPING_RATES.between100And199;
  return STANDARD_SHIPPING_RATES.under100;
}

// ============================================================
// PHASE 2 API HELPERS
// ============================================================

export function calculateShippingCostByQuantity(method: ShippingMethod, totalQuantity: number): ShippingCostResult {
  switch (method) {
    case 'pickup':
      return { cost: 0, oversizedDetected: false };

    case 'local_delivery':
      return { cost: calculateLocalDeliveryCost(totalQuantity), oversizedDetected: false };

    case 'standard_shipping':
      return { cost: calculateStandardShippingCost(totalQuantity), oversizedDetected: false };

    case 'review_required':
      return { cost: 0, flagReviewRequired: true, oversizedDetected: false };

    default:
      return { cost: 0, oversizedDetected: false };
  }
}

// ============================================================
// CORE FUNCTIONS (Phase 1 - Pure logic, no API calls)
// ============================================================

/**
 * Detect if any cart items are oversized (width > 44 inches)
 *
 * Checks width_in from quotePayload selections for each item.
 * Used to determine shipping method availability.
 */
export function detectOversizedItems(cartItems: CartItem[]): boolean {
  for (const item of cartItems) {
    const selections = item.quotePayload?.selections;
    const width = parseWidthInches(selections);
    if (width !== null && width > OVERSIZED_WIDTH_THRESHOLD) {
      return true;
    }
  }
  return false;
}

/**
 * Get total quantity across all cart items
 */
export function getTotalQuantity(cartItems: CartItem[]): number {
  return calculateTotalQuantity(cartItems);
}

/**
 * Get available shipping methods for a cart
 *
 * Normal mode: pickup, local_delivery, standard_shipping
 * Oversized mode: pickup, local_delivery, review_required (standard_shipping hidden)
 */
export function getAvailableShippingMethods(
  cartItems: CartItem[],
  _zip?: string, // Reserved for future ZIP-based rules
): ShippingMethodOption[] {
  const oversizedDetected = detectOversizedItems(cartItems);
  const totalQuantity = calculateTotalQuantity(cartItems);

  const methods: ShippingMethodOption[] = [];

  // Pickup - always available
  methods.push({
    id: 'pickup',
    label: 'Store Pickup',
    cost: 0,
    description: 'Pick up your order at our location',
    available: true,
  });

  // Local delivery - always available (UI only phase)
  const localDeliveryCost = calculateLocalDeliveryCost(totalQuantity);
  methods.push({
    id: 'local_delivery',
    label: 'Local Delivery',
    cost: localDeliveryCost,
    description: localDeliveryCost === 0
      ? 'Free local delivery for 200+ items'
      : `$${localDeliveryCost.toFixed(2)} delivery fee`,
    available: true,
  });

  if (oversizedDetected) {
    // Oversized mode - hide standard_shipping, show review_required
    methods.push({
      id: 'review_required',
      label: 'Shipping Review Required',
      cost: 0,
      description: 'Oversized items require manual shipping review',
      available: true,
    });
  } else {
    // Normal mode - standard shipping available
    const standardCost = calculateStandardShippingCost(totalQuantity);
    methods.push({
      id: 'standard_shipping',
      label: 'Standard Shipping',
      cost: standardCost,
      description: standardCost === 0
        ? 'Free shipping for 200+ items'
        : `$${standardCost.toFixed(2)} shipping fee`,
      available: true,
    });
  }

  return methods;
}

/**
 * Calculate shipping cost for a specific method
 *
 * @param method - Shipping method to calculate
 * @param cartItems - Cart items to check for oversized
 * @param orderTotal - Order subtotal (reserved for percentage-based rules)
 * @returns Shipping cost result with optional review flag
 */
export function calculateShippingCost(
  method: ShippingMethod,
  cartItems: CartItem[],
  _orderTotal?: number,
): ShippingCostResult {
  const oversizedDetected = detectOversizedItems(cartItems);
  const totalQuantity = calculateTotalQuantity(cartItems);

  switch (method) {
    case 'pickup':
      return { cost: 0, oversizedDetected: false };

    case 'local_delivery':
      return {
        cost: calculateLocalDeliveryCost(totalQuantity),
        oversizedDetected,
      };

    case 'standard_shipping':
      if (oversizedDetected) {
        // Standard shipping not available for oversized
        return {
          cost: 0,
          flagReviewRequired: true,
          oversizedDetected,
        };
      }
      return {
        cost: calculateStandardShippingCost(totalQuantity),
        oversizedDetected: false,
      };

    case 'review_required':
      // Used only for oversized orders
      return {
        cost: 0,
        flagReviewRequired: true,
        oversizedDetected,
      };

    default:
      return { cost: 0, oversizedDetected };
  }
}

/**
 * Get complete shipping summary for a cart
 *
 * Includes all available methods, total quantity, oversized detection
 */
export function getShippingSummary(cartItems: CartItem[]): ShippingSummary {
  const oversizedDetected = detectOversizedItems(cartItems);
  const totalQuantity = calculateTotalQuantity(cartItems);
  const methods = getAvailableShippingMethods(cartItems);

  // Determine default method
  // Pickup is default, or local_delivery if available and preferred
  let defaultMethod: ShippingMethod | undefined;
  if (oversizedDetected) {
    defaultMethod = 'pickup';
  } else {
    defaultMethod = 'pickup';
  }

  return {
    totalQuantity,
    oversizedDetected,
    methods,
    defaultMethod,
  };
}

/**
 * Check if local delivery is available for a specific product
 *
 * @param item - Cart item to check
 * @returns true if the product has localDeliveryEligible flag
 */
export function isLocalDeliveryEligible(item: CartItem): boolean {
  // Phase 1: Always return true (UI only)
  // Phase 2: Check item.product?.localDeliveryEligible
  return item.product?.localDeliveryEligible === true || true;
}

/**
 * Get shipping method display info
 */
export function getMethodDisplayInfo(method: ShippingMethod | null | undefined): {
  label: string;
  description: string;
} {
  if (!method) {
    return { label: 'Unknown', description: '' };
  }
  switch (method) {
    case 'pickup':
      return { label: 'Store Pickup', description: 'Pick up your order at our location' };
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

/**
 * Get shipping method label (primary display field)
 * This is the source of truth for shipping method labels throughout the application.
 */
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

export default {
  detectOversizedItems,
  getTotalQuantity,
  getAvailableShippingMethods,
  calculateShippingCost,
  calculateShippingCostByQuantity,
  getShippingSummary,
  isLocalDeliveryEligible,
  getMethodDisplayInfo,
  getShippingMethodLabel,
};