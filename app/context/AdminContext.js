'use client';

import { createContext, useState, useCallback, useEffect } from 'react';
import { isSameDayPrintingProduct } from '../lib/siteConstants';

export const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchCategories()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProducts, fetchCategories]);

  // Product operations - API-backed
  const addProduct = useCallback(async (product) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchProducts(); // Refresh list
        return { success: true, id: data.id };
      }
      const error = await res.json();
      throw new Error(error.error || 'Failed to add product');
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }, [fetchProducts]);

  const updateProduct = useCallback(async (id, updates) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchProducts(); // Refresh list
        return { success: true, id: data.id || id };
      }
      const error = await res.json();
      throw new Error(error.error || 'Failed to update product');
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }, [fetchProducts]);

  const deleteProduct = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchProducts(); // Refresh list
        return { success: true };
      }
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete product');
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }, [fetchProducts]);

  const getProductById = useCallback((id) => {
    return products.find((p) => p.id === id);
  }, [products]);

  const getProductBySlug = useCallback((slug) => {
    return products.find((p) => p.slug === slug);
  }, [products]);

  const getProductsByCategory = useCallback((category) => {
    if (category === 'all') return products;
    return products.filter((p) => p.category === category);
  }, [products]);

  const getSameDayProducts = useCallback(() => {
    return products.filter((p) => isSameDayPrintingProduct(p));
  }, [products]);

  // Category operations - API-backed
  const addCategory = useCallback(async (category) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
      });
      if (res.ok) {
        await fetchCategories(); // Refresh list
        return { success: true };
      }
      const error = await res.json();
      throw new Error(error.error || 'Failed to add category');
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }, [fetchCategories]);

  const updateCategory = useCallback(async (id, updates) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await fetchCategories(); // Refresh list
        return { success: true };
      }
      const error = await res.json();
      throw new Error(error.error || 'Failed to update category');
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchCategories(); // Refresh list
        return { success: true };
      }
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete category');
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }, [fetchCategories]);

  const getCategoryBySlug = useCallback((slug) => {
    return categories.find((c) => c.slug === slug);
  }, [categories]);

  // Admin auth backed by secure HTTP-only token cookie + localStorage fallback for UI
  const loginAdmin = useCallback(async (email, password) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // Ensure cookies are sent and received
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.admin) {
        return false;
      }
      setAdminUser(data.admin);
      // Store in localStorage for UI persistence (token is in HttpOnly cookie)
      if (typeof window !== 'undefined') {
        localStorage.setItem('iprintrush_admin_session', JSON.stringify(data.admin));
      }
      return true;
    } catch (err) {
      console.error('Admin login failed:', err);
      return false;
    }
  }, []);

  const logoutAdmin = useCallback(async () => {
    try {
      await fetch('/api/admin/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Admin logout failed:', err);
    } finally {
      setAdminUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('iprintrush_admin_session');
      }
    }
  }, []);

  const checkAdminAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/me', { 
        method: 'GET',
        credentials: 'include' // Ensure cookies are sent
      });
      if (!res.ok) {
        setAdminUser(null);
        // Clear localStorage if server rejects
        if (typeof window !== 'undefined') {
          localStorage.removeItem('iprintrush_admin_session');
        }
        return false;
      }
      const data = await res.json().catch(() => ({}));
      if (data?.admin) {
        setAdminUser(data.admin);
        // Sync localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('iprintrush_admin_session', JSON.stringify(data.admin));
        }
        return true;
      }
      setAdminUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('iprintrush_admin_session');
      }
      return false;
    } catch {
      setAdminUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('iprintrush_admin_session');
      }
      return false;
    }
  }, []);

// Check auth on mount and whenever window gains focus (in case tab was restored)
   useEffect(() => {
     const checkAndRestore = async () => {
       // First, try to restore from localStorage synchronously
       if (typeof window !== 'undefined') {
         try {
           const stored = localStorage.getItem('iprintrush_admin_session');
           if (stored) {
             setAdminUser(JSON.parse(stored));
           }
         } catch {
           localStorage.removeItem('iprintrush_admin_session');
         }
       }
       // Then verify with server
       await checkAdminAuth();
       setAdminLoading(false);
     };
     checkAndRestore();
     const handleFocus = () => checkAdminAuth();
     if (typeof window !== 'undefined') {
       window.addEventListener('focus', handleFocus);
     }
     return () => {
       if (typeof window !== 'undefined') {
         window.removeEventListener('focus', handleFocus);
       }
     };
   }, [checkAdminAuth]);

  const value = {
    // Products
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    getProductBySlug,
    getProductsByCategory,
    getSameDayProducts,
    refreshProducts: fetchProducts,
    
    // Categories
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryBySlug,
    refreshCategories: fetchCategories,
    
    // Admin
    adminUser,
    adminLoading,
    loginAdmin,
    logoutAdmin,
    checkAdminAuth,
    loading
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
