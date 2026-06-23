'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../../hooks/useAdmin';

function ShippingZonesAdminPageInner() {
  const router = useRouter();
  const { adminUser, adminLoading } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [zipsState, setZipsState] = useState({});
  const [expandedZoneId, setExpandedZoneId] = useState(null);

  const getZoneState = (zoneId) => {
    return zipsState[zoneId] || { zips: [], newZip: '', bulkZips: '', zipAdded: null, zipError: '' };
  };

  const updateZoneState = (zoneId, updates) => {
    setZipsState(prev => {
      const current = prev[zoneId] || { zips: [], newZip: '', bulkZips: '', zipAdded: null, zipError: '' };
      return { ...prev, [zoneId]: { ...current, ...updates } };
    });
  };

  useEffect(() => {
    if (!adminLoading && !adminUser) {
      router.push('/admin/login');
      return;
    }
    if (adminLoading) return;
    loadZones();
  }, [adminUser, adminLoading, router]);

  const loadZones = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/shipping/zones');
      if (!res.ok) throw new Error('Failed to load shipping zones');
      const json = await res.json();
      setZones(json.zones || []);
    } catch (err) {
      setError(err.message || 'Failed to load shipping zones');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const isNew = editing === 'new';
      const endpoint = isNew 
        ? '/api/admin/shipping/zones' 
        : `/api/admin/shipping/zones/${editing}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_name: formData.zone_name,
          delivery_fee: Number(formData.delivery_fee) || 0,
          free_delivery_minimum: Number(formData.free_delivery_minimum) || 0,
          delivery_window: formData.delivery_window || null,
          cutoff_time: formData.cutoff_time || null,
          same_day_delivery: formData.same_day_delivery === true,
          enabled: formData.enabled !== false,
          display_order: Number(formData.display_order) || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      setEditing(null);
      setFormData({});
      await loadZones();
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this zone? All associated ZIP codes will be removed.')) return;
    
    try {
      setError('');
      const res = await fetch(`/api/admin/shipping/zones/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }

      await loadZones();
      setExpandedZoneId(null);
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const startEdit = (zone) => {
    setExpandedZoneId(null);
    setEditing(zone.id);
    setFormData({
      zone_name: zone.zone_name || '',
      delivery_fee: zone.delivery_fee || 0,
      free_delivery_minimum: zone.free_delivery_minimum || 0,
      delivery_window: zone.delivery_window || '',
      cutoff_time: zone.cutoff_time || '',
      same_day_delivery: zone.same_day_delivery === true,
      enabled: zone.enabled !== false,
      display_order: zone.display_order || 0,
    });
  };

  const startCreate = () => {
    setEditing('new');
    setFormData({
      zone_name: '',
      delivery_fee: 0,
      free_delivery_minimum: 0,
      delivery_window: '',
      cutoff_time: '',
      same_day_delivery: false,
      enabled: true,
      display_order: 0,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormData({});
    setZipsState({});
    setExpandedZoneId(null);
  };

  const loadZips = async (zoneId) => {
    try {
      const res = await fetch(`/api/admin/shipping/zones/${zoneId}/zips`);
      if (!res.ok) throw new Error('Failed to load ZIP codes');
      const json = await res.json();
      updateZoneState(zoneId, { zips: json.zips || [] });
    } catch (err) {
      updateZoneState(zoneId, { zipError: err.message || 'Failed to load ZIP codes' });
    }
  };

  const handleAddZip = async (zoneId) => {
    const zipCode = (getZoneState(zoneId).newZip || '').replace(/\D/g, '').slice(0, 5);
    if (!/^\d{5}$/.test(zipCode)) {
      updateZoneState(zoneId, { zipError: 'Please enter a valid 5-digit ZIP code' });
      return;
    }

    try {
      updateZoneState(zoneId, { zipError: '' });
      const res = await fetch(`/api/admin/shipping/zones/${zoneId}/zips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.duplicate) {
          updateZoneState(zoneId, { zipAdded: { added: 0, duplicates: 1 } });
        } else {
          throw new Error(err.error || 'Failed to add ZIP');
        }
      } else {
        const json = await res.json();
        updateZoneState(zoneId, { zipAdded: json });
      }

      updateZoneState(zoneId, { newZip: '' });
      await loadZips(zoneId);
    } catch (err) {
      updateZoneState(zoneId, { zipError: err.message || 'Failed to add ZIP' });
    }
  };

  const handleRemoveZip = async (zoneId, zipCode) => {
    try {
      updateZoneState(zoneId, { zipError: '' });
      const res = await fetch(`/api/admin/shipping/zones/zips/${zipCode}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove ZIP');
      }

      await loadZips(zoneId);
    } catch (err) {
      updateZoneState(zoneId, { zipError: err.message || 'Failed to remove ZIP' });
    }
  };

  const handleBulkZips = async (zoneId) => {
    const bulkZips = getZoneState(zoneId).bulkZips || '';
    const zipCodes = bulkZips.split('\n')
      .map(z => z.replace(/\D/g, '').slice(0, 5))
      .filter(z => /^\d{5}$/.test(z));

    if (zipCodes.length === 0) {
      updateZoneState(zoneId, { zipError: 'No valid 5-digit ZIP codes found' });
      return;
    }

    try {
      updateZoneState(zoneId, { zipError: '' });
      const res = await fetch(`/api/admin/shipping/zones/${zoneId}/bulk-zips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCodes }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add ZIP codes');
      }

      const json = await res.json();
      updateZoneState(zoneId, { zipAdded: json, bulkZips: '' });
      await loadZips(zoneId);
    } catch (err) {
      updateZoneState(zoneId, { zipError: err.message || 'Failed to add ZIP codes' });
    }
  };

  const getZoneZips = (zoneId) => {
    const state = zipsState[zoneId];
    if (!state) {
      loadZips(zoneId);
      return [];
    }
    return state.zips || [];
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Shipping Zones</h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage local delivery zones and ZIP code coverage
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Shipping Zones</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Configure zones for local delivery pricing and availability
                </p>
              </div>
              {!editing && (
                <button
                  onClick={startCreate}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                >
                  + Create Zone
                </button>
              )}
            </div>
          </div>

          {editing && (
            <form onSubmit={handleSave} className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zone Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.zone_name || ''}
                    onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Sacramento Zone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Fee ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.delivery_fee || 0}
                    onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Free Delivery Minimum ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.free_delivery_minimum || 0}
                    onChange={(e) => setFormData({ ...formData, free_delivery_minimum: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Window
                  </label>
                  <input
                    type="text"
                    value={formData.delivery_window || ''}
                    onChange={(e) => setFormData({ ...formData, delivery_window: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., 2-4 PM, Same Day"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cutoff Time
                  </label>
                  <input
                    type="time"
                    value={formData.cutoff_time || ''}
                    onChange={(e) => setFormData({ ...formData, cutoff_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order || 0}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.same_day_delivery === true}
                      onChange={(e) => setFormData({ ...formData, same_day_delivery: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Same Day Delivery</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.enabled !== false}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Enabled</span>
                  </label>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="submit"
                  className="bg-[#29b6f6] text-white px-6 py-2 rounded-lg hover:bg-[#1e8fc4] transition"
                >
                  {editing === 'new' ? 'Create Zone' : 'Update Zone'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-300 text-gray-900 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Zone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Delivery Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Free Delivery Min</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Window</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">ZIP Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Enabled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {zones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No shipping zones configured. Click "Create Zone" to add one.
                    </td>
                  </tr>
                ) : (
                  zones.map((zone) => (
                    <React.Fragment key={zone.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{zone.zone_name}</td>
                        <td className="px-6 py-4 text-gray-600">${Number(zone.delivery_fee || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-gray-600">${Number(zone.free_delivery_minimum || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-gray-600">{zone.delivery_window || '—'}</td>
                        <td className="px-6 py-4 text-gray-600">{zone.zipCount || 0}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${zone.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {zone.enabled ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm space-x-3">
                          <button
                            onClick={() => setExpandedZoneId(expandedZoneId === zone.id ? null : zone.id)}
                            className="text-[#29b6f6] hover:text-[#1a7ba3] font-medium"
                          >
                            {expandedZoneId === zone.id ? 'Hide Details' : 'View Details'}
                          </button>
                          <button
                            onClick={() => startEdit(zone)}
                            className="text-[#29b6f6] hover:text-[#1a7ba3] font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(zone.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      {expandedZoneId === zone.id && (
                        <tr key={`detail-${zone.id}`}>
                          <td colSpan={7} className="p-6 bg-gray-50">
                            <div className="mb-4">
                              <div className="flex flex-wrap gap-2 mb-3">
                                {getZoneZips(zone.id).length > 0 ? (
                                  getZoneZips(zone.id).map((zip) => (
                                    <span key={zip} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded text-sm">
                                      {zip}
                                      <button
                                        onClick={() => handleRemoveZip(zone.id, zip)}
                                        className="text-red-500 hover:text-red-700"
                                        title="Remove"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-gray-500 text-sm">No ZIP codes added</span>
                                )}
                              </div>
                              <div className="flex gap-2 mb-3">
                                <input
                                  type="text"
                                  value={getZoneState(zone.id).newZip || ''}
                                  onChange={(e) => updateZoneState(zone.id, { newZip: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                                  placeholder="Enter 5-digit ZIP code"
                                  maxLength={5}
                                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                                <button
                                  onClick={() => handleAddZip(zone.id)}
                                  className="bg-[#29b6f6] text-white px-4 py-2 rounded-lg hover:bg-[#1e8fc4] transition text-sm"
                                >
                                  Add ZIP
                                </button>
                              </div>
                              <div className="space-y-2">
                                <textarea
                                  value={getZoneState(zone.id).bulkZips || ''}
                                  onChange={(e) => updateZoneState(zone.id, { bulkZips: e.target.value })}
                                  placeholder="Bulk add ZIP codes (one per line)"
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
<button
                                   onClick={() => handleBulkZips(zone.id)}
                                   className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition text-sm"
                                 >
                                   Add All ZIPs
                                 </button>
                               </div>
                               {getZoneState(zone.id).zipAdded && (
                                 <div className="mt-2 text-sm text-green-700">
                                   Added {getZoneState(zone.id).zipAdded.added} ZIP codes{getZoneState(zone.id).zipAdded.duplicates > 0 ? `, skipped ${getZoneState(zone.id).zipAdded.duplicates} duplicates` : ''}
                                 </div>
                               )}
                               {getZoneState(zone.id).zipError && (
                                 <div className="mt-2 text-sm text-red-700">{getZoneState(zone.id).zipError}</div>
                               )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShippingZonesAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-gray-50 min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Loading…</p>
        </div>
      }
    >
      <ShippingZonesAdminPageInner />
    </Suspense>
  );
}