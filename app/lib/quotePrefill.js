/** Session storage for restoring quote customizations (cart edit / reorder). */
export const QUOTE_PREFILL_STORAGE_KEY = 'iprintrush_quote_prefill_v1';

export function saveQuotePrefill({ productId, payload, summary, customizationsDisplay, cartOptions }) {
  if (typeof window === 'undefined' || !productId || !payload) return;
  try {
    sessionStorage.setItem(
      QUOTE_PREFILL_STORAGE_KEY,
      JSON.stringify({
        productId: String(productId),
        payload,
        summary: summary || null,
        customizationsDisplay: customizationsDisplay || {},
        cartOptions: cartOptions || null,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // ignore
  }
}

export function readQuotePrefill(productId) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(QUOTE_PREFILL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || String(parsed.productId) !== String(productId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearQuotePrefill() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(QUOTE_PREFILL_STORAGE_KEY);
  } catch {
    // ignore
  }
}
