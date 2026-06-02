'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useCart } from '../hooks/useCart';

export default function MyOrdersPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [updateError, setUpdateError] = useState('');
  const [noteDrafts, setNoteDrafts] = useState({});
  const [savingNoteItemId, setSavingNoteItemId] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/orders/user?email=${encodeURIComponent(user.email)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load orders');
        }
        const data = await res.json();
        const nextOrders = data.orders || [];
        setOrders(nextOrders);
        const nextDrafts = {};
        nextOrders.forEach((entry) => {
          (entry.items || []).forEach((item) => {
            if (item?.id) {
              nextDrafts[item.id] = item.customSizeNote || '';
            }
          });
        });
        setNoteDrafts(nextDrafts);
      } catch (err) {
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) {
      load();
    }
  }, [isAuthenticated, user?.email]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
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
        className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${
          styles[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {workflowLabel(status)}
      </span>
    );
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

  const handleReorder = (item) => {
    if (!item?.productId) return;

    const customization = item.customization || {};
    const payload = customization.quotePayload;

    if (!payload) {
      window.alert('This item has no saved customization to reorder.');
      return;
    }

    const product = {
      id: item.productId,
      name: item.name,
      image: item.image,
      price: 0
    };

    const options = {
      quantity: item.quantity || 1,
      quotePayload: payload,
      quoteSummary: customization.quoteSummary,
      customizationsDisplay: customization.customizationsDisplay || {},
      artworkFiles: item.artworkFiles || [],
      customSizeNote: item.customSizeNote || '',
    };

    addToCart(product, options);

    router.push('/cart');
  };

  const handleSaveNote = async (itemId) => {
    const value = noteDrafts[itemId] ?? '';
    if (!itemId) return;
    try {
      setSavingNoteItemId(itemId);
      setUpdateError('');
      const res = await fetch(`/api/order-items/${itemId}/artwork`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customSizeNote: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save note');
      }
      setOrders((prev) =>
        prev.map((entry) => ({
          ...entry,
          items: (entry.items || []).map((item) =>
            item.id === itemId ? { ...item, customSizeNote: value } : item
          ),
        }))
      );
    } catch (err) {
      setUpdateError(err.message || 'Failed to save note');
    } finally {
      setSavingNoteItemId(null);
    }
  };

  const handleDeleteArtwork = async (itemId, fileUrl, orderId) => {
    if (!itemId || !fileUrl) return;
    if (!confirm('Delete this artwork file?')) return;
    try {
      setUpdatingItemId(itemId);
      setUpdateError('');
      const res = await fetch(`/api/order-items/${itemId}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl, fileType: 'artwork' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete artwork');
      }
      setOrders((prev) =>
        prev.map((entry) => {
          if (entry.order.id !== orderId) return entry;
          return {
            ...entry,
            items: entry.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    artworkFiles: (item.artworkFiles || []).filter((url) => url !== fileUrl),
                  }
                : item
            ),
          };
        })
      );
    } catch (err) {
      setUpdateError(err.message || 'Failed to delete artwork');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!orderId) return;
    if (!confirm('Delete this order? All uploaded artwork files for this order will also be deleted.')) return;
    try {
      setDeletingOrderId(orderId);
      setUpdateError('');
      const res = await fetch('/api/orders/user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete order');
      }
      setOrders((prev) => prev.filter((entry) => entry.order.id !== orderId));
    } catch (err) {
      setUpdateError(err.message || 'Failed to delete order');
    } finally {
      setDeletingOrderId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">View Your Orders</h1>
          <p className="text-sm text-gray-600">
            Please log in with the same email you used at checkout to see your orders.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#29b6f6] text-white font-semibold hover:bg-[#1e8fc4] transition"
          >
            Go to Login
          </Link>
          <div className="text-xs text-gray-400">
            <Link href="/products" className="text-[#29b6f6] hover:text-[#1e8fc4]">
              ← Back to shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-600">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm text-[#29b6f6] hover:text-[#1e8fc4] font-medium"
          >
            ← Continue Shopping
          </Link>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-6 text-gray-500 text-sm">
            Loading your orders...
          </div>
        )}

        {(error || updateError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {error || updateError}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600 text-sm space-y-3">
            <p>You don&apos;t have any orders yet.</p>
            <Link
              href="/products"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#29b6f6] text-white font-semibold hover:bg-[#1e8fc4] transition"
            >
              Start Your First Order
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map(({ order, items }) => (
              <div key={order.id} className="bg-white rounded-lg shadow p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link href={`/my-orders/${order.id}`} className="text-sm text-gray-500 hover:text-[#29b6f6] transition-colors">
                      Order #{order.orderNumber}
                    </Link>
                    <div className="text-xs text-gray-400">
                      Placed on {formatDate(order.createdAt)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Status: {workflowLabel(order.workflowStatus)}
                    </div>
                    {order.workflowStatus === 'shipped' && order.trackingNumber ? (
                      <div className="text-xs text-gray-500 mt-1">
                        Tracking: <span className="font-semibold">{order.trackingNumber}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 mt-1">Tracking: Pending shipment</div>
                    )}
                    {order.deliveryMethod === 'shipping' && order.shippingAddress && (
                      <div className="text-xs text-gray-500 mt-1">
                        Ship to:{' '}
                        {order.shippingAddress.address
                          ? `${order.shippingAddress.address}${order.shippingAddress.apt ? `, ${order.shippingAddress.apt}` : ''}`
                          : `${order.shippingAddress.city || ''}${order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''} ${order.shippingAddress.zip || ''}`.trim()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {workflowBadge(order.workflowStatus)}
                    <div className="text-sm font-semibold text-gray-900">
                      ${order.amountTotal.toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order.id)}
                      disabled={deletingOrderId === order.id}
                      className="text-xs px-2.5 py-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                    >
                      {deletingOrderId === order.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2 text-sm">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col lg:flex-row justify-between items-start gap-4 border-b last:border-b-0 pb-3 last:pb-0"
                    >
                      <div className="flex gap-3 flex-1">
                        <img
                          src={item.image || '/placeholder.jpg'}
                          alt={item.name}
                          className="w-14 h-14 rounded-md object-cover border border-gray-200 flex-shrink-0"
                        />
                        <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          Qty {item.quantity} · ${item.unitPrice.toFixed(2)} each
                        </div>
                        {item.customization &&
                          item.customization.customizationsDisplay &&
                          Object.keys(item.customization.customizationsDisplay).length > 0 && (
                            <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                              {Object.entries(
                                item.customization.customizationsDisplay
                              ).map(([k, v]) =>
                                v ? (
                                  <div key={k}>
                                    <span className="font-semibold">{k}:</span> {v}
                                  </div>
                                ) : null
                              )}
                            </div>
                          )}
                        {/* Custom size note */}
                        <div className="mt-2 text-xs text-gray-600 space-y-1">
                          <label className="block font-semibold text-gray-800">
                            Custom size / notes (optional)
                          </label>
                          <textarea
                            value={noteDrafts[item.id] ?? item.customSizeNote ?? ''}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            rows={2}
                            className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#29b6f6]"
                            placeholder="e.g., 24in x 36in, bleed on all sides..."
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveNote(item.id)}
                            disabled={savingNoteItemId === item.id}
                            className="mt-1 inline-flex items-center rounded-md bg-[#29b6f6] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1e8fc4] disabled:opacity-60"
                          >
                            {savingNoteItemId === item.id ? 'Saving...' : 'Save note'}
                          </button>
                        </div>

                        {/* Artwork upload */}
                        <div className="mt-2 text-xs text-gray-600 space-y-1">
                          <div className="font-semibold text-gray-800">Artwork files</div>
                          {item.artworkFiles && item.artworkFiles.length > 0 ? (
                            <div className="space-y-2">
                              {item.artworkFiles.map((url, i) => (
                                <div key={i} className="space-y-1">
                                  <img
                                    src={`/api/order-items/${item.id}/artwork/${i}`}
                                    alt={`Artwork ${i + 1}`}
                                    className="max-w-[220px] rounded-md border border-gray-200"
                                  />
                                  <div className="flex items-center gap-3">
                                    <a
                                      href={`/api/order-items/${item.id}/artwork/${i}?download=1`}
                                      download
                                      className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#29b6f6] text-white text-[11px] font-semibold hover:bg-[#1e8fc4]"
                                    >
                                      Download artwork
                                    </a>
                                    <button
                                      type="button"
                                      disabled={updatingItemId === item.id}
                                      onClick={() => handleDeleteArtwork(item.id, url, order.id)}
                                      className="text-[11px] font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                                    >
                                      Delete artwork
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-gray-500">
                              No artwork uploaded yet for this item.
                            </p>
                          )}
                          <div className="mt-1">
                            <label className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-700 cursor-pointer hover:bg-gray-100">
                              <span>{updatingItemId === item.id ? 'Uploading...' : 'Upload / Re-upload artwork'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={updatingItemId === item.id}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file || !item.id) return;
                                  try {
                                    setUpdatingItemId(item.id);
                                    setUpdateError('');

                                    const formData = new FormData();
                                    formData.append('file', file);
                                    const uploadRes = await fetch('/api/artwork/temp-upload', {
                                      method: 'POST',
                                      body: formData,
                                    });
                                    if (!uploadRes.ok) {
                                      const data = await uploadRes.json().catch(() => ({}));
                                      throw new Error(data.error || 'Upload failed');
                                    }
                                    const uploadJson = await uploadRes.json();
                                    const tempId = uploadJson.tempId;

                                    const res = await fetch(
                                      `/api/order-items/${item.id}/artwork`,
                                      {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ fileUrl: tempId, replaceArtwork: true }),
                                      }
                                    );
                                    if (!res.ok) {
                                      const data = await res.json().catch(() => ({}));
                                      throw new Error(data.error || 'Failed to save artwork');
                                    }
                                    const saved = await res.json().catch(() => ({}));

                                    // Update local state
                                    setOrders((prev) =>
                                      prev.map((entry) => {
                                        if (entry.order.id !== order.id) return entry;
                                        const nextItems = entry.items.map((it, index2) => {
                                          if (index2 !== idx) return it;
                                          return {
                                            ...it,
                                            artworkFiles: saved.artworkFiles || it.artworkFiles || [],
                                          };
                                        });
                                        return { ...entry, items: nextItems };
                                      })
                                    );
                                  } catch (err) {
                                    setUpdateError(err.message || 'Failed to upload artwork');
                                  } finally {
                                    setUpdatingItemId(null);
                                    if (e.target) {
                                      e.target.value = '';
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        </div>
                      </div>
                      <div className="w-full lg:w-auto flex lg:flex-col items-center lg:items-end justify-between gap-2">
                        <div className="text-sm font-medium text-gray-900">${item.lineTotal.toFixed(2)}</div>
                        <button
                          type="button"
                          onClick={() => handleReorder(item)}
                          className="text-xs px-3 py-1.5 rounded-md bg-[#29b6f6] text-white hover:bg-[#1e8fc4] transition"
                        >
                          Reorder
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

