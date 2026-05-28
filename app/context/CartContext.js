'use client';

import { createContext, useState, useCallback, useEffect } from 'react';

export const CartContext = createContext(null);

const CART_STORAGE_KEY = 'iprintrush_cart_v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [cartHydrated, setCartHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // ignore corrupt storage
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
      const existingItem = prevItems.find(
        (item) =>
          item.id === product.id &&
          JSON.stringify(item.options) === JSON.stringify(options)
      );

      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id &&
          JSON.stringify(item.options) === JSON.stringify(options)
            ? { ...item, quantity: item.quantity + (options.quantity || 1) }
            : item
        );
      }

      return [...prevItems, { ...product, options, quantity: options.quantity || 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId, options = {}) => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) =>
          !(item.id === productId && JSON.stringify(item.options) === JSON.stringify(options))
      )
    );
  }, []);

  const updateQuantity = useCallback((productId, quantity, options = {}) => {
    if (quantity <= 0) {
      removeFromCart(productId, options);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId && JSON.stringify(item.options) === JSON.stringify(options)
          ? { ...item, quantity }
          : item
      )
    );
  }, [removeFromCart]);

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
    clearCart,
    getTotal,
    getItemCount
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
