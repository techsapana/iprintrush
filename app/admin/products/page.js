'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';
import Link from 'next/link';
import { isSameDayPrintingProduct } from '../../lib/siteConstants';

export default function AdminProductsPage() {
  const router = useRouter();
  const { adminUser, products, deleteProduct, categories } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    if (!adminUser) router.push('/admin/login');
  }, [adminUser, router]);

  if (!adminUser) return null;

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct(id);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Products Management</h1>
          <Link
            href="/admin/products/new"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Add New Product
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
              >
                <option value="all">All Categories</option>
                {Array.from(new Set(products.map((p) => p.category))).map((cat) => (
                  <option key={`cat-${cat}`} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Product Name</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Price</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Category</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Same-day cat.</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{product.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{product.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">${(product.price || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{product.category}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isSameDayPrintingProduct(product)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {isSameDayPrintingProduct(product) ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm space-x-3 whitespace-nowrap">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="text-[#29b6f6] hover:text-[#1a7ba3] font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No products found. {searchTerm && 'Try adjusting your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Total: {filteredProducts.length} of {products.length} products
        </div>
      </div>
    </div>
  );
}
