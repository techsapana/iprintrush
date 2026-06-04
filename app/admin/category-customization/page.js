'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';

export default function CategoryCustomizationPage() {
   const router = useRouter();
   const { adminUser, adminLoading, categories, updateCategory, refreshCategories } = useAdmin();
   const [pools, setPools] = useState([]);
   const [expandedId, setExpandedId] = useState(null);
   const [editingSchema, setEditingSchema] = useState(null);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState(null);

   useEffect(() => {
     if (!adminLoading && !adminUser) router.push('/admin/login');
   }, [adminUser, adminLoading, router]);

  useEffect(() => {
    const loadPools = async () => {
      try {
        const res = await fetch('/api/quote-config/pools');
        if (res.ok) {
          const data = await res.json();
          setPools(data.pools || []);
        }
      } catch (err) {
        console.error('Error loading pools:', err);
      }
    };
    loadPools();
  }, []);

  const startEditing = (category) => {
    const schema = category.customizationSchema || { mode: 'apparel', groups: [] };
    setEditingSchema({
      mode: schema.mode || 'apparel',
      groups: Array.isArray(schema.groups) ? [...schema.groups] : [],
    });
    setExpandedId(category.id);
  };

  const cancelEditing = () => {
    setEditingSchema(null);
    setExpandedId(null);
    setError(null);
  };

  const setMode = (mode) => {
    setEditingSchema((s) => ({ ...s, mode }));
  };

  const addGroup = () => {
    const pool = pools[0];
    setEditingSchema((s) => ({
      ...s,
      groups: [
        ...(s.groups || []),
        {
          poolKey: pool?.key || '',
          label: pool?.name || 'Option',
          required: true,
          selectionType: pool?.selectionType || 'single',
          useTiers: pool?.selectionType === 'quantity',
        },
      ],
    }));
  };

  const updateGroup = (index, field, value) => {
    setEditingSchema((s) => {
      const g = [...(s.groups || [])];
      if (!g[index]) return s;
      g[index] = { ...g[index], [field]: value };
      if (field === 'poolKey') {
        const pool = pools.find((p) => p.key === value);
        if (pool) {
          g[index].selectionType = pool.selectionType;
          g[index].useTiers = pool.selectionType === 'quantity';
          g[index].label = g[index].label || pool.name;
        }
      }
      return { ...s, groups: g };
    });
  };

  const removeGroup = (index) => {
    setEditingSchema((s) => ({
      ...s,
      groups: (s.groups || []).filter((_, i) => i !== index),
    }));
  };

  const moveGroup = (index, dir) => {
    const groups = [...(editingSchema?.groups || [])];
    const ni = index + dir;
    if (ni < 0 || ni >= groups.length) return;
    [groups[index], groups[ni]] = [groups[ni], groups[index]];
    setEditingSchema((s) => ({ ...s, groups }));
  };

  const handleSave = async () => {
    if (!editingSchema || !expandedId) return;
    setSaving(true);
    setError(null);
    try {
      await updateCategory(expandedId, {
        customizationSchema: {
          mode: editingSchema.mode,
          groups: editingSchema.mode === 'print_product' ? (editingSchema.groups || []) : [],
        },
      });
      await refreshCategories();
      cancelEditing();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (adminLoading || !adminUser) return null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Category Customizations</h1>
            <p className="text-gray-600 text-sm mt-1">
              Configure which customization options (size, paper, quantity, etc.) each category uses.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {categories.map((category) => {
            const schema = category.customizationSchema || {};
            const mode = schema.mode || 'apparel';
            const isExpanded = expandedId === category.id;
            const isEditing = isExpanded && editingSchema;

            return (
              <div key={category.id} className="bg-white rounded-lg shadow overflow-hidden">
                <button
                  type="button"
                  onClick={() => (isExpanded ? cancelEditing() : startEditing(category))}
                  className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition text-left"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Mode: <span className="font-medium">{mode}</span>
                      {mode === 'print_product' && schema.groups?.length > 0 && (
                        <span> • {schema.groups.length} option groups</span>
                      )}
                    </p>
                  </div>
                  <span className="text-gray-400">
                    {isExpanded ? '▼ Collapse' : '▶ Expand'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t px-6 py-4 bg-gray-50">
                    {!isEditing ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          Mode: <strong>{mode}</strong>
                        </p>
                        {mode === 'print_product' && schema.groups?.length > 0 && (
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {schema.groups.map((g, i) => (
                              <li key={i}>
                                {g.label} ({g.poolKey}){g.required && ' *'}
                              </li>
                            ))}
                          </ul>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditing(category)}
                          className="mt-4 text-[#29b6f6] hover:text-[#1e8fc4] font-medium"
                        >
                          Edit customization
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Mode */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Customization mode
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="mode"
                                checked={editingSchema.mode === 'apparel'}
                                onChange={() => setMode('apparel')}
                                className="rounded"
                              />
                              Apparel (decoration, colors, sizes, etc.)
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="mode"
                                checked={editingSchema.mode === 'print_product'}
                                onChange={() => setMode('print_product')}
                                className="rounded"
                              />
                              Print product (size, paper, quantity, etc.)
                            </label>
                          </div>
                        </div>

                        {editingSchema.mode === 'print_product' && (
                          <>
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Option groups (order matters)
                                </label>
                                <button
                                  type="button"
                                  onClick={addGroup}
                                  className="text-sm bg-[#29b6f6] text-white px-3 py-1.5 rounded hover:bg-[#1e8fc4]"
                                >
                                  + Add group
                                </button>
                              </div>
                              <div className="space-y-3">
                                {(editingSchema.groups || []).map((g, i) => (
                                  <div
                                    key={i}
                                    className="flex flex-wrap gap-2 items-center p-3 bg-white rounded border"
                                  >
                                    <select
                                      value={g.poolKey}
                                      onChange={(e) => updateGroup(i, 'poolKey', e.target.value)}
                                      className="px-3 py-2 border rounded text-sm w-40"
                                    >
                                      <option value="">Select pool...</option>
                                      {pools.map((p) => (
                                        <option key={p.id} value={p.key}>
                                          {p.name}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      value={g.label || ''}
                                      onChange={(e) => updateGroup(i, 'label', e.target.value)}
                                      placeholder="Label"
                                      className="px-3 py-2 border rounded text-sm w-32"
                                    />
                                    <label className="flex items-center gap-1 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={!!g.required}
                                        onChange={(e) => updateGroup(i, 'required', e.target.checked)}
                                        className="rounded"
                                      />
                                      Required
                                    </label>
                                    {g.selectionType === 'quantity' && (
                                      <label className="flex items-center gap-1 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={!!g.useTiers}
                                          onChange={(e) => updateGroup(i, 'useTiers', e.target.checked)}
                                          className="rounded"
                                        />
                                        Use tiers
                                      </label>
                                    )}
                                    <div className="flex gap-1 ml-auto">
                                      <button
                                        type="button"
                                        onClick={() => moveGroup(i, -1)}
                                        disabled={i === 0}
                                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                                        title="Move up"
                                      >
                                        ↑
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => moveGroup(i, 1)}
                                        disabled={i === (editingSchema.groups?.length || 0) - 1}
                                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                                        title="Move down"
                                      >
                                        ↓
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeGroup(i)}
                                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#29b6f6] text-white px-4 py-2 rounded-lg hover:bg-[#1e8fc4] disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {categories.length === 0 && (
          <p className="text-center text-gray-500 py-12">No categories found.</p>
        )}
      </div>
    </div>
  );
}
