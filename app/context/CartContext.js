'use client';

import { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { computeItemsSubtotal } from '../lib/checkoutFlow';

export const CartContext = createContext(null);

const CART_STORAGE_KEY = 'iprintrush_cart_v1';

const SUPPORTED_QUOTE_MODES = ['simple', 'apparel', 'custom_apparel', 'print_product', 'mailbox'];

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
  } else if (mode === 'apparel' || mode === 'custom_apparel') {
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
  if (mode === 'apparel' || mode === 'custom_apparel') {
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

    const handleStorageChange = (e) => {
      if (e.key === CART_STORAGE_KEY) {
        try {
          const raw = e.newValue;
          let parsed = [];
          if (raw) {
            parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) parsed = [];
          }
          setItems(parsed);
        } catch {
          setItems([]);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
        { ...product, options, quantity: options.quantity || 1, cartItemId: Date.now().toString() + Math.random().toString(36).substr(2, 9) },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId, options = {}, cartItemId = null) => {
    setItems((prevItems) => {
      // If the item being removed belongs to a split group, remove ALL items in that group
      const splitGroupId = options?.splitGroupId;
      if (splitGroupId) {
        return prevItems.filter((item) => item.options?.splitGroupId !== splitGroupId);
      }

      return prevItems.filter((item) => {
        if (cartItemId && item.cartItemId) {
          return item.cartItemId !== cartItemId;
        }
        return !(
          item.id === productId &&
          JSON.stringify(item.options) === JSON.stringify(options)
        );
      });
    });
  }, []);

  const updateQuantity = useCallback(
    (productId, quantity, options = {}, cartItemId = null) => {
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
        prevItems.map((item) => {
          const isMatch = cartItemId 
            ? item.cartItemId === cartItemId 
            : item.id === productId && JSON.stringify(item.options) === JSON.stringify(options);
          return isMatch ? { ...item, quantity } : item;
        }),
      );
    },
    [removeFromCart],
  );

  // Recalculate a quote-backed cart item's price when its quantity changes.
  // Mutates ONLY the mode-specific quantity field, re-runs the server quote
  const updateSplitQuoteQuantity = useCallback(async (cartItemId, newQuantity) => {
    const requested = Math.max(0, Math.floor(Number(newQuantity) || 0));
    
    // Find the item being updated
    const targetItem = itemsRef.current.find(it => it.cartItemId === cartItemId);
    if (!targetItem || !targetItem.options?.splitGroupId || !targetItem.options?.splitSizeId) return;

    const splitGroupId = targetItem.options.splitGroupId;
    const groupItems = itemsRef.current.filter(it => it.options?.splitGroupId === splitGroupId);
    if (!groupItems.length) return;

    // The shared quote payload
    const payload = JSON.parse(JSON.stringify(groupItems[0].options.quotePayload));
    
    if (payload.mode === 'print_product') {
      if (!payload.selections) payload.selections = {};
      if (requested === 0) {
        delete payload.selections[targetItem.options.splitSizeId];
      } else {
        payload.selections[targetItem.options.splitSizeId] = requested;
      }
    } else {
      if (requested === 0) {
        payload.quantities = (payload.quantities || []).filter(q => String(q.sizeId) !== String(targetItem.options.splitSizeId));
      } else {
        const qIndex = (payload.quantities || []).findIndex(q => String(q.sizeId) === String(targetItem.options.splitSizeId));
        if (qIndex >= 0) {
          payload.quantities[qIndex].quantity = requested;
        } else {
          payload.quantities = payload.quantities || [];
          payload.quantities.push({ sizeId: targetItem.options.splitSizeId, quantity: requested });
        }
      }
    }
    
    // Check if total quantity becomes 0
    let newTotal = 0;
    if (payload.mode === 'print_product') {
      // For print product, sum up all values in selections that correspond to split items
      newTotal = groupItems.reduce((acc, it) => {
        const key = it.options.splitSizeId;
        return acc + Number(payload.selections[key] || 0);
      }, 0);
    } else {
      newTotal = (payload.quantities || []).reduce((a, b) => a + Number(b.quantity || 0), 0);
    }
    
    if (newTotal === 0) {
      setItems(prev => prev.filter(it => it.options?.splitGroupId !== splitGroupId));
      return;
    }

    try {
      const res = await fetch('/api/quote/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      const summary = await res.json();
      
      // Re-build cart lines for this group
      const currentQuote = {
        payload,
        summary,
        customizationsDisplay: groupItems[0].options.customizationsDisplay, // approximate, cartHelpers will fix
      };
      
      const product = { ...groupItems[0] };
      delete product.options;
      delete product.quantity;
      delete product.cartItemId;
      
      // Import buildQuoteCartEntries dynamically or assume it's available?
      // Wait, CartContext doesn't import buildQuoteCartEntries.
      // I'll just manually reconstruct the items based on the new breakdown!
      const newItems = summary.sizeBreakdown
        .filter(s => Number(s.quantity) > 0)
        .map(s => {
          const oldItem = groupItems.find(i => i.options?.splitSizeId === s.sizeId);
          const lineTotal = summary.grandTotal * (s.quantity / summary.totalQuantity);
          const merchandiseLineTotal = summary.merchandiseSubtotal * (s.quantity / summary.totalQuantity);
          const shippingTierLineTotal = summary.shippingTierSubtotal ? (summary.shippingTierSubtotal * (s.quantity / summary.totalQuantity)) : 0;
          return {
            ...product,
            quantity: s.quantity,
            cartItemId: oldItem ? oldItem.cartItemId : Date.now().toString() + Math.random().toString(36).substr(2, 9),
            options: {
              ...(oldItem ? oldItem.options : groupItems[0].options),
              quotePayload: payload,
              quoteSummary: {
                ...summary,
                totalQuantity: s.quantity,
                grandTotal: lineTotal,
                merchandiseSubtotal: merchandiseLineTotal,
                shippingTierSubtotal: shippingTierLineTotal,
                unitPrice: s.quantity > 0 ? lineTotal / s.quantity : 0,
                sizeBreakdown: [s],
              },
              splitSizeId: s.sizeId,
              splitSizeLabel: s.sizeLabel,
            }
          };
        });

      setItems(prev => {
        let firstIndex = -1;
        const nextItems = [];
        prev.forEach((it, idx) => {
          if (it.options?.splitGroupId === splitGroupId) {
            if (firstIndex === -1) firstIndex = idx;
          } else {
            nextItems.push(it);
          }
        });
        
        if (firstIndex === -1) {
          return [...nextItems, ...newItems];
        } else {
          nextItems.splice(firstIndex, 0, ...newItems);
          return nextItems;
        }
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  const updateQuoteQuantity = useCallback(
    async (productId, newTotal, options = {}, cartItemId = null) => {
      const requested = Math.max(1, Math.floor(Number(newTotal) || 1));

      const matched = itemsRef.current.find(
        (it) => cartItemId ? it.cartItemId === cartItemId : (it.id === productId && JSON.stringify(it.options) === JSON.stringify(options))
      );
      const currentOptions = matched?.options || {};
      const payload = currentOptions.quotePayload;
      const mode = payload?.mode;

      console.debug('[CartQtyDebug] updateQuoteQuantity:start', {
        productId,
        requestedNewTotal: requested,
        currentItemQuantity: matched?.quantity,
        mode,
        splitQuote: options?.splitQuote === true,
        hasQuotePayload: !!payload,
      });

      if (!payload || options?.splitQuote === true) {
        console.debug('[CartQtyDebug] EARLY_RETURN_NO_PAYLOAD', {
          hasPayload: !!payload,
          splitQuote: options?.splitQuote === true,
        });
        return;
      }
      if (!SUPPORTED_QUOTE_MODES.includes(mode)) {
        console.debug('[CartQtyDebug] EARLY_RETURN_UNSUPPORTED_MODE', { mode });
        return;
      }

      const oldTotal = Number(
        currentOptions.quoteSummary?.totalQuantity || matched?.quantity || 1,
      );

      // Guard: if the mode-specific quantity field cannot be located, abort
      // to avoid a quantity/price desync.
      const resolvedQuantityKey =
        mode === 'print_product'
          ? findPrintQuantityKey(payload.selections, oldTotal)
          : undefined;
      console.debug('[CartQtyDebug] findPrintQuantityKey', {
        oldTotal,
        selections: payload.selections,
        quantityKey: resolvedQuantityKey,
      });
      if (mode === 'print_product' && resolvedQuantityKey == null) {
        console.debug('[CartQtyDebug] EARLY_RETURN_NO_QUANTITY_KEY');
        return;
      }

      const tokenKey = `${productId}::${JSON.stringify(options)}`;
      const myToken = (recalcTokens.current[tokenKey] || 0) + 1;
      recalcTokens.current[tokenKey] = myToken;

      console.debug('[CartQtyDebug] buildUpdatedQuotePayload:input', { payload });
      const updatedPayload = buildUpdatedQuotePayload(
        payload,
        requested,
        oldTotal,
      );
      console.debug('[CartQtyDebug] buildUpdatedQuotePayload:output', { updatedPayload });

      try {
        console.debug('[CartQtyDebug] FETCH_POST', {
          url: '/api/quote/calculate',
          body: updatedPayload,
        });
        const res = await fetch('/api/quote/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedPayload),
        });
        console.debug('[CartQtyDebug] FETCH_RESPONSE', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
        });
        if (!res.ok) {
          let bodyText = '';
          try {
            bodyText = await res.text();
          } catch {
            // ignore body read failure
          }
          console.debug('[CartQtyDebug] API_ERROR', {
            status: res.status,
            body: bodyText,
          });
          return; // keep previous cart state
        }
        const summary = await res.json();
        console.debug('[CartQtyDebug] RESPONSE_JSON', { summary });
        if (recalcTokens.current[tokenKey] !== myToken) return; // stale

        console.debug('[CartQtyDebug] APPLY_CART_UPDATE', {
          productId,
          newQuantity: requested,
          grandTotal: summary?.grandTotal,
        });
        setItems((prevItems) =>
          prevItems.map((it) => {
            const isMatch = cartItemId 
              ? it.cartItemId === cartItemId 
              : it.id === productId && JSON.stringify(it.options) === JSON.stringify(options);
            
            if (!isMatch) {
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
      } catch (err) {
        console.debug('[CartQtyDebug] CATCH_ERROR', {
          error: err,
          stack: err?.stack,
        });
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
    return computeItemsSubtotal(items);
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
    updateSplitQuoteQuantity,
    clearCart,
    getTotal,
    getItemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
