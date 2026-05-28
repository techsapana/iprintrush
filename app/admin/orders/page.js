'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';
import Link from 'next/link';

export default function AdminOrdersPage() {
  const router = useRouter();
  const { adminUser } = useAdmin();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!adminUser) router.push('/admin/login');
  }, [adminUser, router]);

  useEffect(() => {
    if (!adminUser) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const url = statusFilter
          ? `/api/admin/orders?workflow=${encodeURIComponent(statusFilter)}`
          : '/api/admin/orders';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        } else {
          setOrders([]);
        }
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [adminUser, statusFilter]);

  if (!adminUser) return null;

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const workflowLabel = (w) => {
    const map = {
      order_review: 'Order Review',
      artwork_pending: 'Artwork Pending',
      artwork_approved: 'Artwork Approved',
      in_production: 'On Production',
      ready_for_shipping: 'Ready for Shipping',
      shipped: 'Shipped',
    };
    return map[w] || (w ? String(w).replace(/_/g, ' ') : '—');
  };

  const workflowBadge = (status) => {
    const styles = {
      order_review: 'bg-amber-100 text-amber-800',
      artwork_pending: 'bg-orange-100 text-orange-800',
      artwork_approved: 'bg-blue-100 text-blue-800',
      in_production: 'bg-indigo-100 text-indigo-800',
      ready_for_shipping: 'bg-teal-100 text-teal-800',
      shipped: 'bg-green-100 text-green-800',
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
          styles[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {workflowLabel(status)}
      </span>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4 flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by workflow
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
            >
              <option value="">All workflows</option>
              <option value="order_review">Order Review</option>
              <option value="artwork_pending">Artwork Pending</option>
              <option value="artwork_approved">Artwork Approved</option>
              <option value="in_production">On Production</option>
              <option value="ready_for_shipping">Ready for Shipping</option>
              <option value="shipped">Shipped</option>
            </select>
          </div>
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search (Order # or Customer Email)
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. ORD-..., or customer@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No orders found.
            </div>
          ) : (
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Workflow</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders
                  .filter((order) => {
                    if (!search.trim()) return true;
                    const term = search.trim().toLowerCase();
                    return (
                      (order.orderNumber || '').toLowerCase().includes(term) ||
                      (order.customerEmail || '').toLowerCase().includes(term)
                    );
                  })
                  .map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{order.customerName || '—'}</div>
                      {order.customerEmail && (
                        <div className="text-xs text-gray-500">{order.customerEmail}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.itemCount}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ${order.amountTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 flex flex-col gap-1">
                      <div>{workflowBadge(order.workflowStatus || 'order_review')}</div>
                      {order.rush && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 w-fit">
                          Rush
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 flex flex-col gap-1">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-[#29b6f6] hover:text-[#1e8fc4] font-medium"
                      >
                        View
                      </Link>
                      {order.artworkItemCount > 0 ? (
                        <Link
                          href={`/admin/orders/${order.id}#artwork`}
                          className="text-xs font-semibold text-gray-600 hover:text-[#29b6f6]"
                        >
                          Download artwork
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
