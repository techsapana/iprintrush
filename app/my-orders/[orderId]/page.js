'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';

export default function OrderDetailPage() {
  const { user, isAuthenticated } = useAuth();
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId;
  
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [updateError, setUpdateError] = useState('');
  const [noteDrafts, setNoteDrafts] = useState({});
  const [savingNoteItemId, setSavingNoteItemId] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      if (!user?.email || !orderId) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/orders/user?email=${encodeURIComponent(user.email)}&orderId=${orderId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load order');
        }
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);
          const nextItems = data.items || [];
          setItems(nextItems);
          const nextDrafts = {};
          nextItems.forEach((item) => {
            if (item?.id) nextDrafts[item.id] = item.customSizeNote || '';
          });
          setNoteDrafts(nextDrafts);
        } else {
          throw new Error('Order not found');
        }
      } catch (err) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated && orderId) {
      loadOrder();
    }
  }, [isAuthenticated, user?.email, orderId]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
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
        className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${
          styles[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {workflowLabel(status)}
      </span>
    );
  };

  const handleDeleteFile = async (itemId, fileUrl, fileType) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      setUpdatingItemId(itemId);
      setUpdateError('');
      
      const res = await fetch(`/api/order-items/${itemId}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl, fileType }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete file');
      }

      // Update local state
      if (fileType === 'artwork') {
        setItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, artworkFiles: item.artworkFiles.filter(url => url !== fileUrl) }
            : item
        ));
      } else if (fileType === 'requirement') {
        setItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, requirementFiles: item.requirementFiles.filter(url => url !== fileUrl) }
            : item
        ));
      }
    } catch (err) {
      setUpdateError(err.message || 'Failed to delete file');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleUploadFile = async (itemId, file, fileType) => {
    try {
      setUpdatingItemId(itemId);
      setUpdateError('');

      // Check file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        setUpdateError('File size must be less than 20MB');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', fileType);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }
      const uploadJson = await uploadRes.json();
      const url = uploadJson.url;

      const apiEndpoint = fileType === 'artwork' ? `/api/order-items/${itemId}/artwork` : `/api/order-items/${itemId}/requirements`;
      const res = await fetch(apiEndpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save file');
      }

      // Update local state
      if (fileType === 'artwork') {
        setItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, artworkFiles: [...(item.artworkFiles || []), url] }
            : item
        ));
      } else if (fileType === 'requirement') {
        setItems(prev => prev.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                requirementFiles: [...(item.requirementFiles || []), url], 
                requirementStatus: 'pending' 
              } 
            : item
        ));
      }
    } catch (err) {
      setUpdateError(err.message || 'Failed to upload file');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleSaveNote = async (itemId) => {
    if (!itemId) return;
    const value = noteDrafts[itemId] ?? '';
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
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, customSizeNote: value } : item
        )
      );
    } catch (err) {
      setUpdateError(err.message || 'Failed to save note');
    } finally {
      setSavingNoteItemId(null);
    }
  };

  const handleDeleteOrder = async () => {
    if (!order?.id) return;
    if (!confirm('Delete this order? All uploaded artwork files for this order will also be deleted.')) return;
    try {
      setDeletingOrder(true);
      setUpdateError('');
      const res = await fetch('/api/orders/user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete order');
      }
      router.push('/my-orders');
    } catch (err) {
      setUpdateError(err.message || 'Failed to delete order');
    } finally {
      setDeletingOrder(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">View Your Order</h1>
          <p className="text-sm text-gray-600">
            Please log in to view your order details.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#29b6f6] text-white font-semibold hover:bg-[#1e8fc4] transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading order details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Not Found</h1>
          <p className="text-sm text-gray-600">{error}</p>
          <div className="space-y-2">
            <Link
              href="/my-orders"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#29b6f6] text-white font-semibold hover:bg-[#1e8fc4] transition"
            >
              Back to My Orders
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
            <Link href="/my-orders" className="text-sm text-[#29b6f6] hover:text-[#1e8fc4] font-medium mb-2 inline-block">
              ← Back to My Orders
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
            <p className="text-sm text-gray-600">
              Order #{order?.orderNumber} • Signed in as <span className="font-medium">{user.email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleDeleteOrder}
            disabled={deletingOrder}
            className="text-xs px-3 py-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
          >
            {deletingOrder ? 'Deleting...' : 'Delete order'}
          </button>
        </div>

        {(updateError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {updateError}
          </div>
        )}

        {order && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-gray-500">Order #{order.orderNumber}</div>
                <div className="text-xs text-gray-400">
                  Placed on {formatDate(order.createdAt)}
                </div>
                {order.workflowStatus === 'shipped' && order.trackingNumber ? (
                  <div className="text-xs text-gray-500 mt-1">
                    Tracking Number: <span className="font-semibold">{order.trackingNumber}</span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 mt-1">Tracking Number: Pending shipment</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {workflowBadge(order.workflowStatus)}
                <div className="text-sm font-semibold text-gray-900">
                  ${order.amountTotal.toFixed(2)}
                </div>
              </div>
            </div>

            {order.customerName && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Information</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Name:</strong> {order.customerName}</div>
                  <div><strong>Email:</strong> {order.customerEmail}</div>
                  {order.customerPhone && <div><strong>Phone:</strong> {order.customerPhone}</div>}
                </div>
              </div>
            )}

            {order.billingAddress && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Billing Address</h3>
                <div className="text-sm text-gray-600">
                  {order.billingAddress.address && <div>{order.billingAddress.address}</div>}
                  {order.billingAddress.city && order.billingAddress.state && (
                    <div>{order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zip}</div>
                  )}
                </div>
              </div>
            )}

            {order.deliveryMethod === 'shipping' && order.shippingAddress && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Shipping Address</h3>
                <div className="text-sm text-gray-600">
                  {order.shippingAddress.address && (
                    <div>
                      {order.shippingAddress.address}
                      {order.shippingAddress.apt ? `, ${order.shippingAddress.apt}` : ''}
                    </div>
                  )}
                  {order.shippingAddress.city && order.shippingAddress.state && (
                    <div>
                      {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                      {order.shippingAddress.zip}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
              <div className="space-y-6">
                {items.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          Qty {item.quantity} · ${item.unitPrice.toFixed(2)} each
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        ${item.lineTotal.toFixed(2)}
                      </div>
                    </div>

                    {item.customization && item.customization.customizationsDisplay && 
                     Object.keys(item.customization.customizationsDisplay).length > 0 && (
                      <div className="text-sm text-gray-600 space-y-1">
                        <strong>Customizations:</strong>
                        {Object.entries(item.customization.customizationsDisplay).map(([k, v]) =>
                          v ? (
                            <div key={k}>
                              <span className="font-semibold">{k}:</span> {v}
                            </div>
                          ) : null
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">
                          Custom size / notes
                        </label>
                        <textarea
                          value={noteDrafts[item.id] ?? item.customSizeNote ?? ''}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          rows={2}
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#29b6f6]"
                          placeholder="e.g., 24in x 36in, bleed on all sides..."
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNote(item.id)}
                          disabled={savingNoteItemId === item.id}
                          className="mt-2 inline-flex items-center rounded-md bg-[#29b6f6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e8fc4] disabled:opacity-60"
                        >
                          {savingNoteItemId === item.id ? 'Saving...' : 'Save note'}
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-800">Artwork files</h4>
                          <span className="text-xs text-gray-500">Max 20MB per file</span>
                        </div>
                        
                        {item.artworkFiles && item.artworkFiles.length > 0 ? (
                          <div className="space-y-2">
                            {item.artworkFiles.map((url, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <a
                                  href={`/api/order-items/${item.id}/artwork/${i}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#29b6f6] hover:text-[#1e8fc4] text-sm truncate flex-1"
                                >
                                  Artwork {i + 1}
                                </a>
                                <a
                                  href={`/api/order-items/${item.id}/artwork/${i}?download=1`}
                                  className="ml-2 text-[#29b6f6] hover:text-[#1e8fc4] text-sm"
                                >
                                  Download
                                </a>
                                <button
                                  onClick={() => handleDeleteFile(item.id, url, 'artwork')}
                                  disabled={updatingItemId === item.id}
                                  className="ml-2 text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No artwork files uploaded yet.</p>
                        )}
                        
                        {item.artworkFiles && item.artworkFiles.length < 1 && (
                          <label className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100">
                            <span>{updatingItemId === item.id ? 'Uploading...' : 'Upload artwork image'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={updatingItemId === item.id}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !item.id) return;
                                await handleUploadFile(item.id, file, 'artwork');
                                if (e.target) e.target.value = '';
                              }}
                            />
                          </label>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-800">Requirements file (PDF/TXT/Image)</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            item.requirementStatus === 'approved'
                              ? 'bg-green-50 border-green-200 text-green-800'
                              : item.requirementStatus === 'rejected'
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : item.requirementStatus === 'pending'
                                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                                  : 'bg-gray-50 border-gray-200 text-gray-600'
                          }`}>
                            {item.requirementStatus || 'none'}
                          </span>
                        </div>

                        {item.requirementFiles && item.requirementFiles.length > 0 ? (
                          <div className="space-y-2">
                            {item.requirementFiles.map((url, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#29b6f6] hover:text-[#1e8fc4] text-sm truncate flex-1"
                                >
                                  File {i + 1}
                                </a>
                                <button
                                  onClick={() => handleDeleteFile(item.id, url, 'requirement')}
                                  disabled={updatingItemId === item.id}
                                  className="ml-2 text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No requirements files uploaded yet.</p>
                        )}

                        {item.requirementReviewNotes && (
                          <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                            <strong>Admin note:</strong> {item.requirementReviewNotes}
                          </p>
                        )}

                        <label className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100">
                          <span>{updatingItemId === item.id ? 'Uploading...' : 'Upload PDF/TXT/Image'}</span>
                          <input
                            type="file"
                            accept="application/pdf,text/plain,.pdf,.txt,image/*"
                            className="hidden"
                            disabled={updatingItemId === item.id}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !item.id) return;
                              await handleUploadFile(item.id, file, 'requirement');
                              if (e.target) e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
