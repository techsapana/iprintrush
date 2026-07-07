/**
 * Product draft persistence (separate from the Edit-Product prefill flow).
 *
 * This module is intentionally independent of `quotePrefill.js`:
 * - Different storage key prefix (`iprintrush_quote_draft_v1_`).
 * - Keyed per productId (one draft per product, no global draft).
 * - NOT cleared on read (unlike quotePrefill, which is a one-shot bridge).
 *
 * It stores only the serializable quote payload + optional summary so a
 * builder can be restored after a browser refresh.
 */

export const QUOTE_DRAFT_STORAGE_PREFIX = 'iprintrush_quote_draft_v1_';

export function saveQuoteDraft(productId, draft) {
  if (typeof window === 'undefined' || !productId || !draft) return;
  try {
    sessionStorage.setItem(
      QUOTE_DRAFT_STORAGE_PREFIX + String(productId),
      JSON.stringify({
        payload: draft.payload || null,
        summary: draft.summary ?? null,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // ignore quota / serialization errors
  }
}

export function readQuoteDraft(productId) {
  if (typeof window === 'undefined' || !productId) return null;
  try {
    const raw = sessionStorage.getItem(QUOTE_DRAFT_STORAGE_PREFIX + String(productId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.payload) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearQuoteDraft(productId) {
  if (typeof window === 'undefined' || !productId) return;
  try {
    sessionStorage.removeItem(QUOTE_DRAFT_STORAGE_PREFIX + String(productId));
  } catch {
    // ignore
  }
}

export function clearAllQuoteDrafts() {
  if (typeof window === 'undefined') return;
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(QUOTE_DRAFT_STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
