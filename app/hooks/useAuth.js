'use client';

import { useState, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.js';

/**
 * Hook for managing user authentication state
 * Can be used with AuthContext or standalone
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context) {
    return context;
  }

  // Fallback to local state if no provider
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      // Mock login - in a real app, this would call your auth API
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      setUser({
        id: '1',
        email,
        name: email.split('@')[0],
        createdAt: new Date()
      });
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password, name) => {
    setIsLoading(true);
    setError(null);
    try {
      // Mock registration - in a real app, this would call your auth API
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      setUser({
        id: '1',
        email,
        name,
        createdAt: new Date()
      });
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
  }, []);

  const isAuthenticated = user !== null;

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout
  };
}
