'use client';

import { useState, useCallback, useContext } from 'react';
import { CartContext } from '../context/CartContext.js';

/**
 * Hook for managing shopping cart operations
 * Can be used with CartContext or standalone
 */
export function useCart() {
  const context = useContext(CartContext);

  // Fallback to local state if no provider
  const [items, setItems] = useState([]);

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
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => {
      const basePrice = item.price || 0;
      const optionsPrice = item.options?.extraPrice || 0;
      return total + (basePrice + optionsPrice) * item.quantity;
    }, 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  if (context) {
    return context;
  }

  return {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount
  };
}
