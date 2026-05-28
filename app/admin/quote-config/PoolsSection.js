'use client';

import { useEffect, useState } from 'react';

export default function PoolsSection({ editing, formData, onEdit, onSave, onDelete, onCancel, setFormData }) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [optionsPoolId, setOptionsPoolId] = useState(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [optionsError, setOptionsError] = useState('');

  const [optionForm, setOptionForm] = useState({
    id: '',
    label: '',
    value: '',
    priceModifier: 0,
    enabled: true,
    displayOrder: 0,
    metadata: '',
  });

  useEffect(() => {
    loadPools();
  }, []);

  const loadPools = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pools');
      if (!res.ok) throw new Error('Failed to load pools');
      const json = await res.json();
      setPools(json.pools || []);
    } catch (err) {
      setError(err.message || 'Failed to load pools');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePool = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pool and all its options?')) return;

    try {
      setError('');
      const res = await fetch(`/api/pools/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete pool');
      }

      await loadPools();
    } catch (err) {
      setError(err.message || 'Failed to delete pool');
    }
  };

  const loadPoolOptions = async (poolId) => {
    setOptionsError('');
    setOptionsLoading(true);
    try {
      const res = await fetch(`/api/pools/${encodeURIComponent(poolId)}/options`);
      if (!res.ok) throw new Error('Failed to load options');
      const json = await res.json();
      setOptions(Array.isArray(json.options) ? json.options : []);
    } catch (err) {
      setOptions([]);
      setOptionsError(err?.message || 'Failed to load options');
    } finally {
      setOptionsLoading(false);
    }
  };

  const openOptionsModal = (poolId) => {
    setOptionsPoolId(poolId);
    setOptionForm({
      id: '',
      label: '',
      value: '',
      priceModifier: 0,
      enabled: true,
      displayOrder: (options?.length || 0) + 1,
      metadata: '',
    });
    loadPoolOptions(poolId);
  };

  const closeOptionsModal = () => {
    setOptionsPoolId(null);
    setOptions([]);
    setOptionsError('');
  };

  const addOption = async () => {
    if (!optionsPoolId) return;
    setOptionsError('');

    try {
      if (!optionForm.label.trim()) {
        throw new Error('Option label is required');
      }

      const payload = {
        label: optionForm.label.trim(),
        value: optionForm.value?.trim() || null,
        priceModifier: Number(optionForm.priceModifier) || 0,
        enabled: !!optionForm.enabled,
        displayOrder: Number(optionForm.displayOrder) || 0,
      };

      if (optionForm.id && optionForm.id.trim()) payload.id = optionForm.id.trim();
      if (optionForm.metadata && optionForm.metadata.trim()) payload.metadata = optionForm.metadata.trim();

      const res = await fetch(`/api/pools/${encodeURIComponent(optionsPoolId)}/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to save option');

      await loadPoolOptions(optionsPoolId);
      setOptionForm({
        id: '',
        label: '',
        value: '',
        priceModifier: 0,
        enabled: true,
        displayOrder: (options?.length || 0) + 1,
        metadata: '',
      });
    } catch (err) {
      setOptionsError(err?.message || 'Failed to save option');
    }
  };

  const deleteOption = async (optionId) => {
    if (!optionsPoolId) return;
    if (!window.confirm('Delete this option?')) return;
    setOptionsError('');
    try {
      const res = await fetch(
        `/api/pools/${encodeURIComponent(optionsPoolId)}/options/${encodeURIComponent(optionId)}`,
        { method: 'DELETE' },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to delete option');
      await loadPoolOptions(optionsPoolId);
    } catch (err) {
      setOptionsError(err?.message || 'Failed to delete option');
    }
  };

  const handleSavePool = async (data) => {
    try {
      setError('');
      const isNew = editing === 'new';
      const endpoint = isNew ? '/api/pools' : `/api/pools/${editing}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save pool');
      }

      onCancel(); // Reset editing state
      await loadPools();
    } catch (err) {
      setError(err.message || 'Failed to save pool');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Dynamic Customization Pools</h2>
        <button
          onClick={() => {
            onEdit('pools', {
              id: 'new',
              key: '',
              name: '',
              description: '',
              selectionType: 'single',
              priceType: 'per_unit',
              displayOrder: 0,
              enabled: true,
            });
          }}
          className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white px-4 py-2 rounded-lg font-medium"
        >
          Add New Pool
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading pools...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pool Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Selection Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Price Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Options</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Enabled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pools.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No pools found. Click "Add New Pool" to create one.
                  </td>
                </tr>
              ) : (
                pools.map((pool) => (
                  <tr key={pool.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{pool.key}</td>
                    <td className="px-6 py-4 text-gray-900">{pool.name}</td>
                    <td className="px-6 py-4 text-gray-600">{pool.description}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                        {pool.selectionType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                        {pool.priceType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{pool.options?.length || 0} options</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${pool.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {pool.enabled ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm space-x-3">
                      <button
                        onClick={() => {
                          onEdit('pools', pool);
                        }}
                        className="text-[#29b6f6] hover:text-[#1a7ba3] font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePool(pool.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => openOptionsModal(pool.id)}
                        className="ml-2 text-[#29b6f6] hover:text-[#1a7ba3] font-medium"
                      >
                        Manage Options
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editing === 'new' ? 'Add New Pool' : 'Edit Pool'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pool Key *</label>
                <input
                  type="text"
                  value={formData.key || ''}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., banner_sizes, colors, material_options"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pool Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Banner Sizes, Color Options"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Describe what this pool is used for"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selection Type *</label>
                  <select
                    value={formData.selectionType || 'single'}
                    onChange={(e) => setFormData({ ...formData, selectionType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="single">Single Select (choose one)</option>
                    <option value="multi">Multi Select (choose multiple)</option>
                    <option value="quantity">Quantity Input</option>
                    <option value="dimension">Dimension Input (width/height)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Type *</label>
                  <select
                    value={formData.priceType || 'per_unit'}
                    onChange={(e) => setFormData({ ...formData, priceType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="per_unit">Per Unit</option>
                    <option value="per_order">Per Order</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder || 0}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enabled !== false}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="h-4 w-4 text-[#29b6f6] border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">Enabled</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSavePool(formData)}
                className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white px-4 py-2 rounded-lg font-medium"
              >
                {editing === 'new' ? 'Create Pool' : 'Update Pool'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Options Modal */}
      {optionsPoolId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Options for pool: {optionsPoolId}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Add options like sizes (e.g. `23x29`, `34"`), materials, etc. These appear in the quote builder.
                </p>
              </div>
              <button
                type="button"
                onClick={closeOptionsModal}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            {optionsError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {optionsError}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Existing Options</h4>
                  <span className="text-xs text-gray-500">{options?.length || 0}</span>
                </div>

                {optionsLoading ? (
                  <div className="text-sm text-gray-600">Loading options…</div>
                ) : options.length === 0 ? (
                  <div className="text-sm text-gray-600">No options yet for this pool.</div>
                ) : (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
                    {options.map((opt) => (
                      <div
                        key={opt.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 bg-white"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{opt.label}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {opt.value ? `Value: ${opt.value}` : `ID: ${opt.id}`}
                          </div>
                          <div className="text-xs text-gray-700">
                            +${(Number(opt.priceModifier) || 0).toFixed(2)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteOption(opt.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Add New Option</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label *
                    </label>
                    <input
                      value={optionForm.label}
                      onChange={(e) => setOptionForm({ ...optionForm, label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., 23x29"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value (optional)
                    </label>
                    <input
                      value={optionForm.value}
                      onChange={(e) => setOptionForm({ ...optionForm, value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., 23x29"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Modifier
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={optionForm.priceModifier}
                      onChange={(e) => setOptionForm({ ...optionForm, priceModifier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={optionForm.enabled}
                        onChange={(e) => setOptionForm({ ...optionForm, enabled: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Enabled</span>
                    </label>
                    <div className="flex-1" />
                    <div className="w-28">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order
                      </label>
                      <input
                        type="number"
                        value={optionForm.displayOrder}
                        onChange={(e) => setOptionForm({ ...optionForm, displayOrder: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Metadata (optional JSON)
                    </label>
                    <textarea
                      value={optionForm.metadata}
                      onChange={(e) => setOptionForm({ ...optionForm, metadata: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder='e.g., { "minWidthIn": 10, "maxWidthIn": 60 }'
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Only needed if your pool uses dimension metadata.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addOption}
                    className="w-full bg-[#29b6f6] hover:bg-[#1e8fc4] text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Add Option
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
