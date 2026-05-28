'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '../components/shared/PasswordInput';

export default function ProfilePage() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Preferences state
  const [preferences, setPreferences] = useState({
    promotions: false,
    specialOffer: false,
    siteUpdate: false,
    survey: false
  });
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState('');
  const [preferencesSuccess, setPreferencesSuccess] = useState('');

  // Saved items state
  const [savedItems, setSavedItems] = useState([]);
  const [savedItemsLoading, setSavedItemsLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPreferences();
      loadSavedItems();
    }
  }, [isAuthenticated, user]);

  const loadPreferences = async () => {
    try {
      const res = await fetch('/api/customer/preferences');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.preferences) {
          // Ensure all preference keys exist with default false values
          const loadedPreferences = {
            promotions: Boolean(data.preferences.promotions),
            specialOffer: Boolean(data.preferences.specialOffer),
            siteUpdate: Boolean(data.preferences.siteUpdate),
            survey: Boolean(data.preferences.survey)
          };
          setPreferences(loadedPreferences);
        }
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
      // Don't reset preferences on error, keep current state
    }
  };

  const loadSavedItems = async () => {
    try {
      setSavedItemsLoading(true);
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
      setSavedItemsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await fetch('/api/customer/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePreferencesSave = async () => {
    try {
      setPreferencesLoading(true);
      setPreferencesError('');
      setPreferencesSuccess('');

      const res = await fetch('/api/customer/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save preferences');
      }

      setPreferencesSuccess('Preferences saved successfully!');
    } catch (err) {
      setPreferencesError(err.message || 'Failed to save preferences');
    } finally {
      setPreferencesLoading(false);
    }
  };

  const handleSavedItemToggle = async (productId) => {
    try {
      const action = savedItems.includes(productId) ? 'remove' : 'add';
      const res = await fetch('/api/customer/saved-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, action })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update saved items');
      }

      if (data.success) {
        setSavedItems(data.savedItems);
      }
    } catch (err) {
      console.error('Failed to update saved items:', err);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#29b6f6]"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[#29b6f6] font-semibold mb-1">Hello, {user.name || 'there'}</p>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
              
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                    {user.name || 'Not provided'}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                    {user.email || 'Not provided'}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                    {user.phone || 'Not provided'}
                  </div>
                </div>

                {/* Account Created */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available'}
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 text-sm">
                    {passwordSuccess}
                  </div>
                )}

                <PasswordInput
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  placeholder="Enter current password"
                  label="Current Password"
                  required
                  className="py-3"
                />

                <PasswordInput
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  placeholder="Enter new password"
                  label="New Password"
                  required
                  minLength={6}
                  className="py-3"
                />

                <PasswordInput
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                  label="Confirm New Password"
                  required
                  minLength={6}
                  className="py-3"
                />

                <Button
                  type="submit"
                  disabled={passwordLoading}
                  className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50"
                >
                  {passwordLoading ? 'Changing Password...' : 'Change Password'}
                </Button>
              </form>
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Communication Preferences</h2>
              
              {preferencesError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-4">
                  {preferencesError}
                </div>
              )}

              {preferencesSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 text-sm mb-4">
                  {preferencesSuccess}
                </div>
              )}

              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(preferences?.promotions)}
                    onChange={(e) => setPreferences(prev => ({...prev, promotions: e.target.checked}))}
                    className="w-4 h-4 text-[#29b6f6] border-gray-300 rounded focus:ring-[#29b6f6]"
                  />
                  <span className="text-gray-700">Promotions</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(preferences?.specialOffer)}
                    onChange={(e) => setPreferences(prev => ({...prev, specialOffer: e.target.checked}))}
                    className="w-4 h-4 text-[#29b6f6] border-gray-300 rounded focus:ring-[#29b6f6]"
                  />
                  <span className="text-gray-700">Special Offer</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(preferences?.siteUpdate)}
                    onChange={(e) => setPreferences(prev => ({...prev, siteUpdate: e.target.checked}))}
                    className="w-4 h-4 text-[#29b6f6] border-gray-300 rounded focus:ring-[#29b6f6]"
                  />
                  <span className="text-gray-700">Site Update</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(preferences?.survey)}
                    onChange={(e) => setPreferences(prev => ({...prev, survey: e.target.checked}))}
                    className="w-4 h-4 text-[#29b6f6] border-gray-300 rounded focus:ring-[#29b6f6]"
                  />
                  <span className="text-gray-700">Survey</span>
                </label>
              </div>

              <Button
                onClick={handlePreferencesSave}
                disabled={preferencesLoading}
                className="mt-6 bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50"
              >
                {preferencesLoading ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>

            {/* Saved Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Saved Items</h2>
              
              {savedItemsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29b6f6] mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading saved items...</p>
                </div>
              ) : savedItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No saved items yet</p>
                  <Link href="/products" className="inline-block mt-4 text-[#29b6f6] hover:underline font-medium">
                    Browse Products
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedItems.map((productId) => (
                    <div key={productId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <span className="text-gray-900">Product ID: {productId}</span>
                      <Button
                        onClick={() => handleSavedItemToggle(productId)}
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    href="/wishlist"
                    className="flex items-center gap-3 w-full px-4 py-3 bg-white text-[#29b6f6] border border-[#29b6f6] rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    Saved Items
                  </Link>
                  <Link
                    href="/my-orders"
                    className="flex items-center gap-3 w-full px-4 py-3 bg-[#29b6f6] text-white rounded-lg hover:bg-[#1e8fc4] transition-colors font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    My Orders
                  </Link>
                  
                  <Link
                    href="/cart"
                    className="flex items-center gap-3 w-full px-4 py-3 bg-white text-[#29b6f6] border border-[#29b6f6] rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                    View Cart
                  </Link>
                </div>
              </div>

              {/* Logout */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account</h3>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 16l4-4m0 0l-4 4m4-4H3m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    <path d="M8 12h.01M12 12h.01M16 12h.01" />
                  </svg>
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>

              {/* Support */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
                <div className="space-y-3">
                  <Link
                    href="/contact"
                    className="flex items-center gap-3 w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact Support
                  </Link>
                  
                  <Link
                    href="/faq"
                    className="flex items-center gap-3 w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 011.82 0m.82 0a3 3 0 11-1.82 0" />
                    </svg>
                    View FAQ
                  </Link>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
