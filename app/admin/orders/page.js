'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';
import Link from 'next/link';

export default function AdminOrdersPage() {
   const router = useRouter();
   const { adminUser, adminLoading } = useAdmin();
   const [orders, setOrders] = useState([]);
   const [loading, setLoading] = useState(true);
   const [statusFilter, setStatusFilter] = useState('');
   const [search, setSearch] = useState('');
   const [expandedOrders, setExpandedOrders] = useState({});
   const [orderDetails, setOrderDetails] = useState({});

   const toggleRow = async (orderId) => {
     if (expandedOrders[orderId]) {
       setExpandedOrders(prev => ({...prev, [orderId]: false}));
       return;
     }
     setExpandedOrders(prev => ({...prev, [orderId]: true}));
     
     if (!orderDetails[orderId]) {
       try {
         const res = await fetch(`/api/admin/orders/${orderId}`);
         if (res.ok) {
           const data = await res.json();
           setOrderDetails(prev => ({...prev, [orderId]: data.items || []}));
         }
       } catch (e) {
         console.error('Failed to load order details', e);
       }
     }
   };

   useEffect(() => {
     if (!adminLoading && !adminUser) router.push('/admin/login');
   }, [adminUser, adminLoading, router]);

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

  if (adminLoading || !adminUser) return null;

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
      artwork_pending: 'Pending Artwork Approval',
      artwork_approved: 'Artwork Approved',
      in_production: 'On Production',
      ready_for_pickup: 'Ready for Store Pickup',
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
      ready_for_pickup: 'bg-emerald-100 text-emerald-800',
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
              <option value="artwork_pending">Pending Artwork Approval</option>
              <option value="artwork_approved">Artwork Approved</option>
              <option value="in_production">On Production</option>
              <option value="ready_for_pickup">Ready for Store Pickup</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Order Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Workflow</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
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
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              order.items?.[0]?.product?.image ||
                              order.items?.[0]?.image ||
                              "/placeholder.png"
                            }
                            alt="Product"
                            className="w-10 h-10 rounded object-cover border"
                          />
                          <div className="flex flex-col">
                            <span>#{order.orderNumber || order.id}</span>
                            <span className="text-xs text-gray-500 font-normal">{formatDate(order.createdAt)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{order.customerName || '—'}</div>
                      {order.customerEmail && (
                        <div className="text-xs text-gray-500">{order.customerEmail}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.itemCount}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${order.amountTotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {order.status === 'paid' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Paid</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <div>{workflowBadge(order.workflowStatus || 'order_review')}</div>
                        {order.rush && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 w-fit">
                            Rush
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-[#29b6f6] hover:text-[#1e8fc4] font-medium text-sm"
                        >
                          View Full Order
                        </Link>
                        {order.artworkItemCount > 0 ? (
                          <button
                            onClick={() => toggleRow(order.id)}
                            className="text-xs font-semibold text-gray-600 hover:text-[#29b6f6] text-left"
                          >
                            {expandedOrders[order.id] ? 'Hide Artwork' : 'View / Download Artwork'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No artwork uploaded</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedOrders[order.id] && order.artworkItemCount > 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 bg-white border-b shadow-inner">
                        {orderDetails[order.id] ? (
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">Order Artwork</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {orderDetails[order.id]
                                .filter(item => item.artworkFiles && item.artworkFiles.length > 0)
                                .map((item, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm border">
                                  <div className="font-medium text-gray-900 mb-2 truncate" title={item.name}>{item.name}</div>
                                  <div className="flex flex-wrap gap-3">
                                    {item.artworkFiles.map((_, i) => (
                                      <div key={i} className="flex flex-col gap-1 items-start bg-white p-2 rounded border">
                                        <img
                                          src={`/api/order-items/${item.id}/artwork/${i}`}
                                          alt={`Artwork ${i + 1}`}
                                          className="w-16 h-16 object-cover rounded border"
                                        />
                                        <a
                                          href={`/api/order-items/${item.id}/artwork/${i}?download=1`}
                                          download
                                          className="text-[10px] bg-[#29b6f6] text-white px-2 py-1 rounded font-semibold hover:bg-[#1e8fc4]"
                                        >
                                          Download
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 py-4 flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-[#29b6f6] rounded-full animate-spin"></div>
                            Loading artwork...
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
