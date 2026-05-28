'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export function useSavedItems() {
  const { isAuthenticated } = useAuth();
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadSavedItems();
    } else {
      setSavedItems([]);
    }
  }, [isAuthenticated]);

  const loadSavedItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customer/saved-items');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSavedItems(data.savedItems || []);
        }
      }
    } catch (err) {
      console.error('Failed to load saved items:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToSavedItems = async (productId) => {
    if (!isAuthenticated) return false;

    try {
      const res = await fetch('/api/customer/saved-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, action: 'add' })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSavedItems(data.savedItems);
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to add to saved items:', err);
    }
    return false;
  };

  const removeFromSavedItems = async (productId) => {
    if (!isAuthenticated) return false;

    try {
      const res = await fetch('/api/customer/saved-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, action: 'remove' })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSavedItems(data.savedItems);
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to remove from saved items:', err);
    }
    return false;
  };

  const isInSavedItems = (productId) => {
    return savedItems.includes(productId);
  };

  const toggleSavedItem = async (productId) => {
    if (isInSavedItems(productId)) {
      return await removeFromSavedItems(productId);
    } else {
      return await addToSavedItems(productId);
    }
  };

  return {
    savedItems,
    loading,
    addToSavedItems,
    removeFromSavedItems,
    isInSavedItems,
    toggleSavedItem,
    refreshSavedItems: loadSavedItems
  };
}
