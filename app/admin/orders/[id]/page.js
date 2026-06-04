'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAdmin } from '../../../hooks/useAdmin';
import Link from 'next/link';

export default function AdminOrderDetailPage() {
   const router = useRouter();
   const params = useParams();
   const { adminUser, adminLoading } = useAdmin();
   const [order, setOrder] = useState(null);
   const [items, setItems] = useState([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [updatingArtworkItemId, setUpdatingArtworkItemId] = useState(null);
   const [deletingOrder, setDeletingOrder] = useState(false);
   const [creatingShipment, setCreatingShipment] = useState(false);
   const [shipmentServiceType, setShipmentServiceType] = useState('FEDEX_GROUND');
   const [shipmentError, setShipmentError] = useState('');

   useEffect(() => {
     if (!adminLoading && !adminUser) router.push('/admin/login');
   }, [adminUser, adminLoading, router]);

   useEffect(() => {
     if (!adminUser || !params?.id) return;
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/orders/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
          setItems(data.items || []);
        } else {
          setOrder(null);
          setItems([]);
        }
      } catch {
        setOrder(null);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [adminUser, params?.id]);

  if (adminLoading || !adminUser) return null;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const handleUpdate = async (patch) => {
    if (!order) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const updated = { ...order, ...patch };
        if (data.workflowStatus) {
          updated.workflowStatus = data.workflowStatus;
        }
        setOrder(updated);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArtwork = async (itemId, fileUrl) => {
    if (!confirm('Delete this artwork file?')) return;
    try {
      setUpdatingArtworkItemId(itemId);
      const res = await fetch(`/api/order-items/${itemId}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl, fileType: 'artwork' }),
      });
      if (!res.ok) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                artworkFiles: (item.artworkFiles || []).filter((url) => url !== fileUrl),
              }
            : item
        )
      );
    } finally {
      setUpdatingArtworkItemId(null);
    }
  };

  const handleUploadArtwork = async (itemId, file) => {
    if (!file || !itemId) return;
    try {
      setUpdatingArtworkItemId(itemId);
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/artwork/temp-upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) return;
      const uploadJson = await uploadRes.json();
      const res = await fetch(`/api/order-items/${itemId}/artwork`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: uploadJson.tempId, replaceArtwork: true }),
      });
      if (!res.ok) return;
      const saved = await res.json().catch(() => ({}));
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, artworkFiles: saved.artworkFiles || item.artworkFiles || [] }
            : item
        )
      );
      setOrder((prev) => (prev ? { ...prev, workflowStatus: 'artwork_pending' } : prev));
    } finally {
      setUpdatingArtworkItemId(null);
    }
  };

  const handleDeleteOrder = async () => {
    if (!order?.id) return;
    if (!confirm('Delete this order? This also deletes artwork files from uploads.')) return;
    try {
      setDeletingOrder(true);
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: 'DELETE' });
      if (!res.ok) return;
      router.push('/admin/orders');
    } finally {
      setDeletingOrder(false);
    }
  };

  const handleCreateShipment = async () => {
    if (!order?.id) return;
    try {
      setCreatingShipment(true);
      setShipmentError('');
      const res = await fetch(`/api/admin/orders/${order.id}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceType: shipmentServiceType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create shipment');
      }
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              trackingNumber: data.trackingNumber || prev.trackingNumber,
              workflowStatus: data.workflowStatus || 'shipped',
              deliveryStatus: 'out_for_delivery',
            }
          : prev
      );
      if (data?.label) {
        const href = `data:application/pdf;base64,${data.label}`;
        const link = document.createElement('a');
        link.href = href;
        link.download = `label-${data.trackingNumber || order.orderNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      setShipmentError(err.message || 'Failed to create shipment');
    } finally {
      setCreatingShipment(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-600 mb-4">Order not found.</p>
          <Link href="/admin/orders" className="text-[#29b6f6] hover:underline">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const addr = order.billingAddress || {};
  const fullAddress = [addr.address, addr.city, addr.state, addr.zip]
    .filter(Boolean)
    .join(', ');

  const ship = order.shippingAddress || {};
  const fullShipping = [ship.address, ship.city, ship.state, ship.zip]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDeleteOrder}
              disabled={deletingOrder}
              className="text-xs px-3 py-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
            >
              {deletingOrder ? 'Deleting...' : 'Delete order'}
            </button>
            <Link
              href="/admin/orders"
              className="text-[#29b6f6] hover:text-[#1e8fc4] font-medium"
            >
              ← Back to Orders
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Status & Dates */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">Workflow</div>
              <select
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
                value={order.workflowStatus || 'order_review'}
                onChange={(e) =>
                  handleUpdate({ workflowStatus: e.target.value })
                }
              >
                <option value="order_review">Order Review</option>
                <option value="artwork_pending">Artwork Pending</option>
                <option value="artwork_approved">Artwork Approved</option>
                <option value="in_production">On Production</option>
                <option value="ready_for_shipping">Ready for Shipping</option>
                <option value="shipped">Shipped</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Placed</span>
              <div className="font-medium">{formatDate(order.createdAt)}</div>
            </div>
            {order.paidAt && (
              <div>
                <span className="text-gray-500">Paid</span>
                <div className="font-medium">{formatDate(order.paidAt)}</div>
              </div>
            )}
            <div>
              <span className="text-gray-500">Estimated Completion</span>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                  value={order.estimatedCompletionAt || ''}
                  onChange={(e) =>
                    handleUpdate({ estimatedCompletionAt: e.target.value || null })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded"
                checked={order.rush || false}
                onChange={(e) => handleUpdate({ rush: e.target.checked })}
              />
              <span className="font-medium text-red-600">Rush Order</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Assigned Staff</span>
              <input
                type="text"
                className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                defaultValue={order.assignedStaff || ''}
                onBlur={(e) =>
                  handleUpdate({ assignedStaff: e.target.value || null })
                }
              />
            </div>
          </div>

          {saving && (
            <div className="text-xs text-gray-400">Saving changes…</div>
          )}
        </div>

        {/* Customer */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Customer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div>
                <span className="text-gray-500">Name</span>
                <div className="font-medium">{order.customerName || '—'}</div>
              </div>
              <div>
                <span className="text-gray-500">Email</span>
                <div className="font-medium">
                  {order.customerEmail ? (
                    <a
                      href={`mailto:${order.customerEmail}`}
                      className="text-[#29b6f6] hover:underline"
                    >
                      {order.customerEmail}
                    </a>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              {order.customerPhone && (
                <div>
                  <span className="text-gray-500">Phone</span>
                  <div className="font-medium">
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="text-[#29b6f6] hover:underline"
                    >
                      {order.customerPhone}
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {fullAddress && (
                <div>
                  <span className="text-gray-500">Billing Address</span>
                  <div className="font-medium">{fullAddress}</div>
                </div>
              )}
              {fullShipping && (
                <div>
                  <span className="text-gray-500">Shipping Address</span>
                  <div className="font-medium">{fullShipping}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shipping / Delivery */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Shipping & Delivery</h2>
          {order.deliveryMethod === 'shipping' && (
            <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
              <div className="text-xs font-semibold text-gray-600 uppercase mb-2">FedEx Shipment</div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={shipmentServiceType}
                  onChange={(e) => setShipmentServiceType(e.target.value)}
                  className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white"
                  disabled={creatingShipment || Boolean(order.trackingNumber)}
                >
                  <option value="FEDEX_GROUND">FedEx Ground</option>
                  <option value="FEDEX_2_DAY">FedEx 2 Day</option>
                  <option value="FEDEX_EXPRESS_SAVER">FedEx Express Saver</option>
                  <option value="PRIORITY_OVERNIGHT">FedEx Priority Overnight</option>
                </select>
                <button
                  type="button"
                  onClick={handleCreateShipment}
                  disabled={
                    creatingShipment ||
                    Boolean(order.trackingNumber) ||
                    order.workflowStatus !== 'ready_for_shipping'
                  }
                  className="text-xs px-3 py-1.5 rounded-md bg-[#29b6f6] text-white hover:bg-[#1e8fc4] disabled:opacity-60"
                >
                  {creatingShipment ? 'Creating shipment...' : 'Create shipment & tracking'}
                </button>
                {order.workflowStatus !== 'ready_for_shipping' && !order.trackingNumber && (
                  <span className="text-xs text-amber-700">
                    Set workflow to Ready for Shipping first.
                  </span>
                )}
              </div>
              {shipmentError && <div className="text-xs text-red-700 mt-2">{shipmentError}</div>}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Delivery Type</span>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                value={order.deliveryType || ''}
                onChange={(e) =>
                  handleUpdate({ deliveryType: e.target.value || null })
                }
              >
                <option value="">Not set</option>
                <option value="standard">Standard</option>
                <option value="rush">Rush</option>
                <option value="same_day">Same-Day</option>
                <option value="after_hours">After-Hours</option>
              </select>
            </div>
            <div>
              <span className="text-gray-500">Delivery Status</span>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                value={order.deliveryStatus || ''}
                onChange={(e) =>
                  handleUpdate({ deliveryStatus: e.target.value || null })
                }
              >
                <option value="">Not set</option>
                <option value="scheduled">Scheduled</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <span className="text-gray-500">Tracking Number</span>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                defaultValue={order.trackingNumber || ''}
                onBlur={(e) =>
                  handleUpdate({ trackingNumber: e.target.value || null })
                }
              />
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-lg shadow p-6 space-y-3 text-sm">
          <h2 className="font-semibold text-gray-900">Pricing & Payment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Subtotal</span>
                <span>${order.amountSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discounts</span>
                <span>
                  -${(order.discountAmount || 0).toFixed(2)}
                  {order.couponCode ? ` (${order.couponCode})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>${order.amountTax.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-gray-600">Payment Method</span>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                  defaultValue={order.paymentMethod || ''}
                  onBlur={(e) =>
                    handleUpdate({ paymentMethod: e.target.value || null })
                  }
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between pt-2 border-t mt-2 text-base font-semibold">
            <span>Total</span>
            <span>${order.amountTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="font-semibold text-gray-900 p-6 pb-0">Items</h2>
          <table className="w-full mt-4">
            <thead className="bg-gray-50 border-y">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Qty</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Unit Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, idx) => (
                <React.Fragment key={idx}>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {item.name}
                      {item.productId && (
                        <span className="block text-xs text-gray-500 font-normal">{item.productId}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      ${item.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      ${item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 pb-4 pt-0" colSpan={4}>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm space-y-3">
                        <div id="artwork" className="text-xs font-semibold text-gray-500 uppercase">Artwork</div>
                        {item.artworkFiles?.length > 0 ? (
                          <div className="flex flex-wrap gap-4 items-start">
                            {item.artworkFiles.map((_, i) => (
                              <div key={i} className="flex flex-col gap-2 items-start">
                                <img
                                  src={`/api/order-items/${item.id}/artwork/${i}`}
                                  alt={`Artwork ${i + 1}`}
                                  className="max-w-[220px] rounded-md border border-gray-200"
                                />
                                <a
                                  href={`/api/order-items/${item.id}/artwork/${i}?download=1`}
                                  download
                                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#29b6f6] text-white text-xs font-semibold hover:bg-[#1e8fc4]"
                                >
                                  Download artwork {i + 1}
                                </a>
                                <button
                                  type="button"
                                  disabled={updatingArtworkItemId === item.id}
                                  onClick={() => handleDeleteArtwork(item.id, item.artworkFiles[i])}
                                  className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-60"
                                >
                                  Delete file {i + 1}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">No artwork uploaded yet.</div>
                        )}
                        <label className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100">
                          <span>
                            {updatingArtworkItemId === item.id
                              ? 'Uploading...'
                              : item.artworkFiles?.length > 0
                                ? 'Upload replacement artwork'
                                : 'Upload artwork'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={updatingArtworkItemId === item.id}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) await handleUploadArtwork(item.id, file);
                              if (e.target) e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </td>
                  </tr>
                  {(item.requirementFiles?.length > 0 || item.requirementStatus !== 'none') && (
                    <tr>
                      <td className="px-6 pb-4 pt-0" colSpan={4}>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm space-y-3">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase">
                                Requirements File (PDF/TXT)
                              </div>
                              <div className="text-xs text-gray-500">
                                Status: <span className="font-semibold text-gray-700">{item.requirementStatus || 'none'}</span>
                              </div>
                            </div>
                            {item.id && (
                              <div className="flex items-center gap-2">
                                <select
                                  className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white"
                                  value={item.requirementStatus || 'none'}
                                  onChange={async (e) => {
                                    const next = e.target.value;
                                    const res = await fetch(`/api/admin/order-items/${item.id}/requirements`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: next, notes: item.requirementReviewNotes || '' }),
                                    });
                                    if (res.ok) {
                                      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, requirementStatus: next } : it));
                                    }
                                  }}
                                >
                                  <option value="none">None</option>
                                  <option value="pending">Pending</option>
                                  <option value="approved">Approved</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {item.requirementFiles?.length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1">
                              {item.requirementFiles.map((url, i) => (
                                <li key={i}>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#29b6f6] hover:underline break-all"
                                  >
                                    File {i + 1}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-xs text-gray-500">No requirements file uploaded.</div>
                          )}

                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Review Notes</div>
                            <textarea
                              rows={2}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs"
                              value={item.requirementReviewNotes || ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, requirementReviewNotes: v } : it));
                              }}
                              onBlur={async (e) => {
                                if (!item.id) return;
                                const res = await fetch(`/api/admin/order-items/${item.id}/requirements`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: item.requirementStatus || 'none', notes: e.target.value }),
                                });
                                // ignore failure silently; admin can retry
                                await res.json().catch(() => ({}));
                              }}
                              placeholder="Optional notes to customer (e.g., please re-upload with bleed)."
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {item.customization && (
                    <tr>
                      <td className="px-6 pb-4 pt-0" colSpan={4}>
                        <div className="bg-gray-50 rounded-lg p-4 text-sm">
                          {(item.customization.customizationsDisplay && Object.keys(item.customization.customizationsDisplay).length > 0) && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Customizations</div>
                              <ul className="text-gray-700 space-y-0.5">
                                {Object.entries(item.customization.customizationsDisplay).map(([k, v]) => (
                                  v ? <li key={k}><span className="font-medium">{k}:</span> {v}</li> : null
                                ))}
                              </ul>
                            </div>
                          )}
                          {item.customization.lineItems && item.customization.lineItems.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Quote Breakdown</div>
                              <ul className="text-gray-600 space-y-0.5">
                                {item.customization.lineItems.map((line, i) => (
                                  <li key={i} className="flex justify-between">
                                    <span>{line.label}</span>
                                    <span>${Number(line.amount || 0).toFixed(2)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {/* Internal Notes */}
          <div className="border-t bg-gray-50 px-6 py-4 space-y-2 text-sm">
            <div>
              <span className="text-gray-600 block mb-1">Internal Notes</span>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                defaultValue={order.internalNotes || ''}
                onBlur={(e) =>
                  handleUpdate({ internalNotes: e.target.value || null })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
