/** Session storage for “buy now” checkout (single product from PDP, not full cart). */
export const BUY_NOW_STORAGE_KEY = 'iprintrush_buy_now_checkout_v1';

export function computeLineTotal(item) {
  if (!item) return 0;
  if (item.options?.customLineTotal != null) {
    return Number(item.options.customLineTotal) || 0;
  }
  if (item.options?.quoteSummary?.grandTotal != null) {
    return Number(item.options.quoteSummary.grandTotal) || 0;
  }
  const qty = Number(item.quantity || 1);
  const base = Number(item.price || 0);
  const extra = Number(item.options?.extraPrice || 0);
  return (base + extra) * qty;
}

export function computeItemShippingTierSubtotal(item) {
  if (!item) return 0;
  if (item.shippingTierSubtotal != null) {
    return Number(item.shippingTierSubtotal) || 0;
  }
  if (item.options?.shippingTierSubtotal != null) {
    return Number(item.options.shippingTierSubtotal) || 0;
  }
  if (item.options?.quoteSummary?.shippingTierSubtotal != null) {
    return Number(item.options.quoteSummary.shippingTierSubtotal) || 0;
  }
  if (item.options?.quoteSummary?.subtotal != null) {
    return Number(item.options.quoteSummary.subtotal) || 0;
  }
  if (item.merchandiseSubtotal != null) {
    return Number(item.merchandiseSubtotal) || 0;
  }
  if (item.options?.merchandiseSubtotal != null) {
    return Number(item.options.merchandiseSubtotal) || 0;
  }
  if (item.options?.quoteSummary?.merchandiseSubtotal != null) {
    return Number(item.options.quoteSummary.merchandiseSubtotal) || 0;
  }
  const qty = Number(item.quantity || 1);
  const base = Number(item.price || 0);
  const extra = Number(item.options?.extraPrice || 0);
  return Math.max(0, (base + extra) * qty);
}

export function computeItemsShippingTierSubtotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + computeItemShippingTierSubtotal(item), 0);
}

export function computeItemMerchandiseSubtotal(item) {
  return computeItemShippingTierSubtotal(item);
}

export function computeItemsMerchandiseSubtotal(items) {
  return computeItemsShippingTierSubtotal(items);
}

export function computeItemsSubtotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + computeLineTotal(item), 0);
}

export function saveBuyNowItems(items) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // private mode / quota
  }
}

export function readBuyNowItems() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(BUY_NOW_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearBuyNowItems() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Only allow same-origin relative paths (prevents open redirects). */
export function safeCheckoutReturnPath(path) {
  if (!path || typeof path !== 'string') return '/checkout';
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/checkout';
  return trimmed;
}

export function requireLoginForCheckout(router, returnPath) {
  const path = safeCheckoutReturnPath(returnPath);
  const returnUrl = encodeURIComponent(path);
  if (typeof window !== 'undefined') {
    window.alert('Please log in to proceed to payment.');
  }
  router.push(`/login?returnUrl=${returnUrl}`);
}
