'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';

export default function BusinessCategoriesAdminPage() {
   const router = useRouter();
   const { adminUser, adminLoading, products } = useAdmin();
   const [loading, setLoading] = useState(true);
   const [categories, setCategories] = useState([]);
   const [error, setError] = useState('');
   const [editing, setEditing] = useState(null);
   const [editingProducts, setEditingProducts] = useState(null);
   const [formData, setFormData] = useState({});
   const [selectedProducts, setSelectedProducts] = useState([]);
   const [searchQuery, setSearchQuery] = useState('');

   useEffect(() => {
     if (!adminLoading && !adminUser) {
       router.push('/admin/login');
       return;
     }
     if (adminLoading) return;
     loadCategories();
   }, [adminUser, adminLoading, router]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/business-categories');
      if (!res.ok) throw new Error('Failed to load business categories');
      const json = await res.json();
      setCategories(json.categories || []);
    } catch (err) {
      setError(err.message || 'Failed to load business categories');
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryProducts = async (categoryId) => {
    try {
      const res = await fetch(`/api/business-categories/${categoryId}`);
      if (!res.ok) throw new Error('Failed to load category products');
      const json = await res.json();
      return json.category?.products || [];
    } catch (err) {
      console.error('Failed to load category products:', err);
      return [];
    }
  };

  const handleSave = async (data) => {
    try {
      setError('');
      const isNew = editing === 'new';
      const endpoint = isNew
        ? '/api/business-categories'
        : `/api/business-categories/${editing}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      setEditing(null);
      setFormData({});
      await loadCategories();
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this business category?')) return;

    try {
      setError('');
      const res = await fetch(`/api/business-categories/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }

      await loadCategories();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const startEdit = (category) => {
    setEditing(category?.id || 'new');
    setFormData(category || { name: '', description: '', icon: '📋', displayOrder: 0, enabled: true });
  };

  const startEditProducts = async (category) => {
    setEditingProducts(category.id);
    const categoryProducts = await loadCategoryProducts(category.id);
    setSelectedProducts(categoryProducts.map((p) => p.id));
  };

  const handleSaveProducts = async () => {
    try {
      setError('');
      const res = await fetch(`/api/business-categories/${editingProducts}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedProducts }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save products');
      }

      setEditingProducts(null);
      setSelectedProducts([]);
      setSearchQuery('');
      await loadCategories();
      alert('Products saved successfully!');
    } catch (err) {
      setError(err.message || 'Failed to save products');
    }
  };

  const toggleProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (adminLoading || !adminUser) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Checking authentication…</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Categories</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage business categories and assign products to each category
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Edit Category Form */}
        {editing && (
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editing === 'new' ? 'Add New Business Category' : 'Edit Business Category'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(formData);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon (emoji)
                  </label>
                  <input
                    type="text"
                    value={formData.icon || ''}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="🍽️"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder || 0}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.enabled ?? true}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Enabled</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-[#29b6f6] text-white px-6 py-2 rounded-lg hover:bg-[#1e8fc4] transition"
                >
                  {editing === 'new' ? 'Create' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setFormData({});
                  }}
                  className="bg-gray-300 text-gray-900 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Products Modal */}
        {editingProducts && (
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Select Products for "{categories.find((c) => c.id === editingProducts)?.name}"
            </h2>

            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or ID..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
              />
            </div>

            {/* Product List */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery ? 'No products found matching your search.' : 'No products available.'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProducts.includes(product.id);
                    return (
                      <label
                        key={product.id}
                        className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProduct(product.id)}
                          className="w-4 h-4 text-[#29b6f6] rounded focus:ring-[#29b6f6]"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            ID: {product.id} | ${(product.price || 0).toFixed(2)}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {selectedProducts.length} product(s) selected
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleSaveProducts}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Save Products
              </button>
              <button
                onClick={() => {
                  setEditingProducts(null);
                  setSelectedProducts([]);
                  setSearchQuery('');
                }}
                className="bg-gray-300 text-gray-900 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Categories List */}
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center text-gray-600">
            Loading categories…
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Business Categories</h2>
              {!editing && (
                <button
                  onClick={() => startEdit(null)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                >
                  + Add New Category
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Icon</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No business categories found. Click "Add New Category" to create one.
                      </td>
                    </tr>
                  ) : (
                    categories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-2xl">{category.icon || '📋'}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{category.name}</td>
                        <td className="px-6 py-4 text-gray-600">{category.description || '—'}</td>
                        <td className="px-6 py-4 text-gray-600">{category.displayOrder}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              category.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {category.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm space-x-3">
                          <button
                            onClick={() => startEditProducts(category)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Manage Products
                          </button>
                          <button
                            onClick={() => startEdit(category)}
                            className="text-[#29b6f6] hover:text-[#1a7ba3] font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
