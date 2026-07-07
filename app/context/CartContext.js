'use client';

import { createContext, useState, useCallback, useEffect, useRef } from 'react';

export const CartContext = createContext(null);

const CART_STORAGE_KEY = 'iprintrush_cart_v1';

const SUPPORTED_QUOTE_MODES = ['simple', 'apparel', 'print_product', 'mailbox'];

// Distribute a new total quantity across an apparel size array, keeping
// the sum exactly equal to newTotal and every entry >= 0.
function adjustApparelQuantities(quantities, newTotal) {
  const list = Array.isArray(quantities) ? quantities : [];
  const oldTotal = list.reduce((s, q) => s + (Number(q?.quantity) || 0), 0);
  if (oldTotal <= 0 || newTotal < 0) return list;
  const factor = newTotal / oldTotal;
  const scaled = list.map((q) => ({
    sizeId: q.sizeId,
    quantity: Math.max(0, Math.round((Number(q.quantity) || 0) * factor)),
  }));
  let diff = newTotal - scaled.reduce((s, q) => s + q.quantity, 0);
  let i = 0;
  while (diff !== 0 && i < scaled.length) {
    const next = scaled[i].quantity + diff;
    if (next >= 0) {
      scaled[i].quantity = next;
      diff = 0;
    } else {
      diff += scaled[i].quantity;
      scaled[i].quantity = 0;
    }
    i += 1;
  }
  return scaled.filter((q) => q.quantity > 0);
}

// Resolve which selections key holds the quantity for a print product.
function findPrintQuantityKey(selections, oldTotal) {
  if (!selections || typeof selections !== 'object') return null;
  const explicit = Object.keys(selections).find((k) => {
    const lk = String(k).toLowerCase();
    return lk === 'quantity' || lk === 'qty' || lk.includes('quantity');
  });
  if (explicit) return explicit;
  const byValue = Object.keys(selections).find(
    (k) => Number(selections[k]) === Number(oldTotal),
  );
  return byValue || null;
}

// Return a new payload with ONLY the mode-specific quantity field changed.
function buildUpdatedQuotePayload(payload, newTotal, oldTotal) {
  const mode = payload?.mode;
  const p = { ...payload };
  if (mode === 'simple') {
    p.quantity = newTotal;
  } else if (mode === 'mailbox') {
    p.months = newTotal;
  } else if (mode === 'apparel') {
    p.quantities = adjustApparelQuantities(payload.quantities, newTotal);
  } else if (mode === 'print_product') {
    const key = findPrintQuantityKey(payload.selections, oldTotal);
    if (key != null) {
      p.selections = { ...payload.selections, [key]: newTotal };
    }
  }
  return p;
}

// Rebuild only the quantity-related parts of the display object.
function rebuildCustomizationsDisplay(
  mode,
  prevDisplay,
  summary,
  newTotal,
  oldTotal,
) {
  if (!prevDisplay || typeof prevDisplay !== 'object') return prevDisplay;
  const display = { ...prevDisplay };
  if (mode === 'apparel') {
    const breakdown = Array.isArray(summary?.sizeBreakdown)
      ? summary.sizeBreakdown
      : [];
    if (breakdown.length > 0) {
      display['Size Breakdown'] = breakdown
        .map((s) => `${s.sizeLabel || 'Selected size'}×${s.quantity}`)
        .join(', ');
    }
  } else if (mode === 'mailbox') {
    const label = summary?.sizeBreakdown?.[0]?.sizeLabel;
    if (label) display['Duration'] = label;
  } else {
    const oldStr = String(oldTotal);
    Object.keys(display).forEach((k) => {
      if (display[k] === oldStr) display[k] = String(newTotal);
    });
  }
  return display;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [cartHydrated, setCartHydrated] = useState(false);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Per-item token to ignore stale recalculation responses from rapid clicks.
  const recalcTokens = useRef({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      let parsed = [];
      if (raw) {
        parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          parsed = [];
        }
      }
      setItems(parsed);
    } catch {
      setItems([]);
    }
    setCartHydrated(true);
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // quota / private mode
    }
  }, [items, cartHydrated]);

  const addToCart = useCallback((product, options = {}) => {
    setItems((prevItems) => {
      const isQuoteBackedItem =
        options?.quotePayload ||
        options?.splitQuote === true ||
        options?.customLineTotal != null;
      const existingItem = isQuoteBackedItem
        ? null
        : prevItems.find(
            (item) =>
              item.id === product.id &&
              JSON.stringify(item.options) === JSON.stringify(options),
          );

      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id &&
          JSON.stringify(item.options) === JSON.stringify(options)
            ? { ...item, quantity: item.quantity + (options.quantity || 1) }
            : item,
        );
      }

      return [
        ...prevItems,
        { ...product, options, quantity: options.quantity || 1 },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId, options = {}) => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) =>
          !(
            item.id === productId &&
            JSON.stringify(item.options) === JSON.stringify(options)
          ),
      ),
    );
  }, []);

  const updateQuantity = useCallback(
    (productId, quantity, options = {}) => {
      const isQuoteItem =
        options?.quotePayload ||
        options?.splitQuote === true ||
        options?.customLineTotal != null;

      if (isQuoteItem) {
        return;
      }

      if (quantity <= 0) {
        removeFromCart(productId, options);
        return;
      }

      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === productId &&
          JSON.stringify(item.options) === JSON.stringify(options)
            ? { ...item, quantity }
            : item,
        ),
      );
    },
    [removeFromCart],
  );

  // Recalculate a quote-backed cart item's price when its quantity changes.
  // Mutates ONLY the mode-specific quantity field, re-runs the server quote
  // engine, and atomically updates item.quantity + quotePayload +
  // quoteSummary + customizationsDisplay. Split quotes and items without a
  // quotePayload are ignored (handled by the existing Edit Product flow).
  const updateQuoteQuantity = useCallback(
    async (productId, newTotal, options = {}) => {
      const requested = Math.max(1, Math.floor(Number(newTotal) || 1));

      const matched = itemsRef.current.find(
        (it) =>
          it.id === productId &&
          JSON.stringify(it.options) === JSON.stringify(options),
      );
      const currentOptions = matched?.options || {};
      const payload = currentOptions.quotePayload;
      const mode = payload?.mode;

      if (!payload || options?.splitQuote === true) return;
      if (!SUPPORTED_QUOTE_MODES.includes(mode)) return;

      const oldTotal = Number(
        currentOptions.quoteSummary?.totalQuantity || matched?.quantity || 1,
      );

      // Guard: if the mode-specific quantity field cannot be located, abort
      // to avoid a quantity/price desync.
      if (mode === 'print_product' && findPrintQuantityKey(payload.selections, oldTotal) == null) {
        return;
      }

      const tokenKey = `${productId}::${JSON.stringify(options)}`;
      const myToken = (recalcTokens.current[tokenKey] || 0) + 1;
      recalcTokens.current[tokenKey] = myToken;

      const updatedPayload = buildUpdatedQuotePayload(
        payload,
        requested,
        oldTotal,
      );

      try {
        const res = await fetch('/api/quote/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedPayload),
        });
        if (!res.ok) return; // keep previous cart state
        const summary = await res.json();
        if (recalcTokens.current[tokenKey] !== myToken) return; // stale

        setItems((prevItems) =>
          prevItems.map((it) => {
            if (
              it.id !== productId ||
              JSON.stringify(it.options) !== JSON.stringify(options)
            ) {
              return it;
            }
            return {
              ...it,
              quantity: requested,
              options: {
                ...it.options,
                quotePayload: updatedPayload,
                quoteSummary: summary,
                customizationsDisplay: rebuildCustomizationsDisplay(
                  mode,
                  it.options?.customizationsDisplay,
                  summary,
                  requested,
                  oldTotal,
                ),
              },
            };
          }),
        );
      } catch {
        // Network/server error: keep previous cart state, no partial update.
      }
    },
    [],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => {
      if (item.options?.customLineTotal != null) {
        return total + Number(item.options.customLineTotal || 0);
      }
      if (item.options?.quoteSummary?.grandTotal != null) {
        return total + Number(item.options.quoteSummary.grandTotal || 0);
      }
      const qty = Number(item.quantity || 1);
      const basePrice = item.price || 0;
      const optionsPrice = item.options?.extraPrice || 0;
      return total + (basePrice + optionsPrice) * qty;
    }, 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateQuoteQuantity,
    clearCart,
    getTotal,
    getItemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
