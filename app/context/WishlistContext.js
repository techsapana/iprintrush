'use client';

import { createContext, useState, useCallback, useEffect } from 'react';

export const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [items, setItems] = useState([]);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wishlist');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load wishlist from localStorage:', err);
    }
  }, []);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('wishlist', JSON.stringify(items));
    } catch (err) {
      console.error('Failed to save wishlist to localStorage:', err);
    }
  }, [items]);

  const addToWishlist = useCallback((product) => {
    setItems((prevItems) => {
      const exists = prevItems.find((item) => item.id === product.id);
      if (exists) {
        return prevItems; // Already in wishlist
      }
      return [...prevItems, { ...product }];
    });
  }, []);

  const removeFromWishlist = useCallback((productId) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  }, []);

  const isInWishlist = useCallback((productId) => {
    return items.some((item) => item.id === productId);
  }, [items]);

  const clearWishlist = useCallback(() => {
    setItems([]);
  }, []);

  const getItemCount = useCallback(() => {
    return items.length;
  }, [items]);

  const value = {
    items,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist,
    getItemCount,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
