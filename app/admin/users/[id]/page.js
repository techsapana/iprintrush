'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAdmin } from '../../../hooks/useAdmin';
import Link from 'next/link';

export default function EditUserPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const { adminUser, adminLoading } = useAdmin();
  const [user, setUser] = useState(null);
  const [orderStats, setOrderStats] = useState({ totalOrders: 0, totalSpent: 0 });
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    enabled: true
  });

  const isAdmin = !!adminUser;
  const isAuthLoading = adminLoading;

  useEffect(() => {
    if (isAdmin && !isAuthLoading) {
      loadUser();
    }
  }, [isAdmin, isAuthLoading, id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/admin/users/${id}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load user');
      }
      
      if (data.success && data.user) {
        setUser(data.user);
        setOrderStats(data.orderStats || { totalOrders: 0, totalSpent: 0 });
        setTopProducts(data.topProducts || []);
        setFormData({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          enabled: Boolean(data.user.enabled)
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccess('User updated successfully');
      loadUser(); // Refresh user data to get any server-side changes
    } catch (err) {
      setError(err.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const formatPreferences = (preferences) => {
    if (!preferences) return 'None';
    try {
      const prefs = typeof preferences === 'string' ? JSON.parse(preferences) : preferences;
      const items = [];
      if (prefs.promotions) items.push('Promotions');
      if (prefs.specialOffer) items.push('Special Offer');
      if (prefs.siteUpdate) items.push('Site Update');
      if (prefs.survey) items.push('Survey');
      return items.length > 0 ? items.join(', ') : 'None';
    } catch (e) {
      return 'Invalid or Unparseable';
    }
  };

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#29b6f6]"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header & Breadcrumb */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-sm font-medium text-[#29b6f6] hover:text-[#1e8fc4] flex items-center gap-1 mb-4 w-fit bg-transparent border-none cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Users
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage User</h1>
              <p className="text-gray-600 mt-1">ID: {id}</p>
            </div>
            {user && (
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                formData.enabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {formData.enabled ? 'Active Account' : 'Deactivated'}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <span>{success}</span>
          </div>
        )}

        {!user && !loading && !error && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            User not found.
          </div>
        )}

        {user && (
          <div className="space-y-6">
            {/* Edit Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">User Details</h2>
              </div>
              <div className="p-6 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29b6f6] focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29b6f6] focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29b6f6] focus:border-transparent"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Account Status</h3>
                      <p className="text-xs text-gray-500 mt-1">If deactivated, the user will not be able to log in.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="enabled"
                        checked={formData.enabled} 
                        onChange={handleChange}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#29b6f6]"></div>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {formData.enabled ? 'Active' : 'Deactivated'}
                      </span>
                    </label>
                  </div>
                </div>

              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            {/* User Statistics Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Customer Statistics</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium uppercase tracking-wider mb-1">Total Orders</div>
                    <div className="text-3xl font-bold text-gray-900">{orderStats.totalOrders}</div>
                  </div>
                  <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
                    <div className="text-sm text-green-600 font-medium uppercase tracking-wider mb-1">Total Amount Spent</div>
                    <div className="text-3xl font-bold text-gray-900">${Number(orderStats.totalSpent).toFixed(2)}</div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-md font-semibold text-gray-800 mb-4 border-b pb-2">Most Purchased Products</h3>
                  {topProducts.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">No products purchased yet.</div>
                  ) : (
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 font-medium text-gray-600">Product Name</th>
                            <th className="px-4 py-2 font-medium text-gray-600 text-right">Quantity Bought</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {topProducts.map((product) => (
                            <tr key={product.product_id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-900">{product.product_name}</td>
                              <td className="px-4 py-3 text-gray-600 text-right font-medium">{product.total_quantity_bought}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Read-only info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">Account Information</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Joined Date</span>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Email Preferences</span>
                    <p className="text-sm text-gray-900 mt-1">
                      {formatPreferences(user.preferences)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">Saved Designs / Quotes</h2>
                </div>
                <div className="p-6">
                  {(() => {
                    let itemsCount = 0;
                    try {
                      const items = typeof user.saved_items === 'string' ? JSON.parse(user.saved_items) : user.saved_items;
                      itemsCount = Array.isArray(items) ? items.length : 0;
                    } catch (e) {
                      // ignore
                    }
                    return (
                      <div className="text-center py-4">
                        <div className="text-3xl font-bold text-[#29b6f6]">{itemsCount}</div>
                        <div className="text-sm text-gray-500 mt-1">Saved Items</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
