'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';

export default function AdminPortfolioPage() {
   const router = useRouter();
   const { adminUser, adminLoading } = useAdmin();
   const [items, setItems] = useState([]);
   const [categories, setCategories] = useState([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [message, setMessage] = useState('');
   const [activeTab, setActiveTab] = useState('images'); // 'images' or 'categories'
   
   const [form, setForm] = useState({
     label: '',
     imageUrl: '',
     displayOrder: 0,
     categoryId: '',
   });

   const [catForm, setCatForm] = useState({
     name: '',
     displayOrder: 0,
   });

   useEffect(() => {
     if (!adminLoading && !adminUser) router.push('/admin/login');
   }, [adminUser, adminLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resItems, resCats] = await Promise.all([
        fetch('/api/portfolio', { cache: 'no-store' }),
        fetch('/api/portfolio-categories', { cache: 'no-store' })
      ]);
      const dataItems = await resItems.json().catch(() => ({}));
      const dataCats = await resCats.json().catch(() => ({}));
      
      setItems(Array.isArray(dataItems.items) ? dataItems.items : []);
      setCategories(Array.isArray(dataCats.categories) ? dataCats.categories : []);
    } catch (err) {
      setMessage(err?.message || 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminUser) loadData();
  }, [adminUser]);

  if (adminLoading || !adminUser) return null;

  const onUploadImage = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'portfolio');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.url) throw new Error(json?.error || 'Upload failed');
    setForm((prev) => ({ ...prev, imageUrl: json.url }));
  };

  const createItem = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage('');
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to add image');
      setForm({ label: '', imageUrl: '', displayOrder: 0, categoryId: '' });
      setMessage('Portfolio image added.');
      await loadData();
    } catch (err) {
      setMessage(err?.message || 'Failed to add image');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (item) => {
    const res = await fetch(`/api/portfolio/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: item.label,
        imageUrl: item.imageUrl,
        displayOrder: item.displayOrder,
        categoryId: item.categoryId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to update item');
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this portfolio image?')) return;
    const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to delete item');
    await loadData();
  };

  const createCategory = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage('');
      const res = await fetch('/api/portfolio-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to add category');
      setCatForm({ name: '', displayOrder: 0 });
      setMessage('Folder added.');
      await loadData();
    } catch (err) {
      setMessage(err?.message || 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const updateCategory = async (cat) => {
    const res = await fetch(`/api/portfolio-categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cat.name,
        displayOrder: cat.displayOrder,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to update folder');
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this folder? Images inside it will become uncategorized.')) return;
    const res = await fetch(`/api/portfolio-categories/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to delete folder');
    await loadData();
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Management</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('images')}
              className={`${
                activeTab === 'images'
                  ? 'border-[#29b6f6] text-[#29b6f6]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Images
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`${
                activeTab === 'categories'
                  ? 'border-[#29b6f6] text-[#29b6f6]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Folders (Categories)
            </button>
          </nav>
        </div>

        {activeTab === 'images' ? (
          <>
            <form onSubmit={createItem} className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Portfolio Image</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Label"
                  value={form.label}
                  onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  required
                >
                  <option value="" disabled>Select Folder...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Display order"
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, displayOrder: Number(e.target.value || 0) }))
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    try {
                      await onUploadImage(e.target.files?.[0]);
                    } catch (err) {
                      setMessage(err?.message || 'Upload failed');
                    }
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <input
                type="text"
                placeholder="Image URL"
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Preview" className="h-28 rounded border object-cover" />
              ) : null}
              <button
                type="submit"
                disabled={saving}
                className="bg-[#29b6f6] text-white px-4 py-2 rounded-lg hover:bg-[#1e8fc4] disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Add Image'}
              </button>
              {message && activeTab === 'images' ? <p className="text-sm text-gray-600">{message}</p> : null}
            </form>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Images</h2>
              {loading ? (
                <p className="text-sm text-gray-600">Loading...</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-gray-500">No portfolio images yet.</p>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 grid grid-cols-1 lg:grid-cols-6 gap-3 items-center">
                      <div className="relative">
                        <img src={item.imageUrl} alt={item.label} className="h-20 w-full object-cover rounded border" />
                        <span className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm font-mono">ID: {item.id}</span>
                      </div>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) => (x.id === item.id ? { ...x, label: e.target.value } : x))
                          )
                        }
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm lg:col-span-2"
                        placeholder="Label"
                      />
                      <select
                        value={item.categoryId || ''}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) => (x.id === item.id ? { ...x, categoryId: e.target.value ? Number(e.target.value) : null } : x))
                          )
                        }
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="">No Folder</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        title="Display Order (lower numbers appear first)"
                        value={item.displayOrder}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === item.id ? { ...x, displayOrder: Number(e.target.value || 0) } : x
                            )
                          )
                        }
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="Display Order"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateItem(item);
                              setMessage('Image updated.');
                              await loadData();
                            } catch (err) {
                              setMessage(err?.message || 'Failed to update item');
                            }
                          }}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteItem(item.id);
                              setMessage('Image deleted.');
                            } catch (err) {
                              setMessage(err?.message || 'Failed to delete item');
                            }
                          }}
                          className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <form onSubmit={createCategory} className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Folder</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Folder Name (e.g. Business Cards)"
                  value={catForm.name}
                  onChange={(e) => setCatForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
                <input
                  type="number"
                  placeholder="Display order"
                  value={catForm.displayOrder}
                  onChange={(e) =>
                    setCatForm((prev) => ({ ...prev, displayOrder: Number(e.target.value || 0) }))
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#29b6f6] text-white px-4 py-2 rounded-lg hover:bg-[#1e8fc4] disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Create Folder'}
              </button>
              {message && activeTab === 'categories' ? <p className="text-sm text-gray-600">{message}</p> : null}
            </form>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Folders</h2>
              {loading ? (
                <p className="text-sm text-gray-600">Loading...</p>
              ) : categories.length === 0 ? (
                <p className="text-sm text-gray-500">No folders yet.</p>
              ) : (
                <div className="space-y-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="border rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((x) => (x.id === cat.id ? { ...x, name: e.target.value } : x))
                          )
                        }
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm md:col-span-2"
                        placeholder="Folder Name"
                      />
                      <input
                        type="number"
                        title="Display Order (lower numbers appear first)"
                        value={cat.displayOrder}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((x) =>
                              x.id === cat.id ? { ...x, displayOrder: Number(e.target.value || 0) } : x
                            )
                          )
                        }
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="Display Order"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateCategory(cat);
                              setMessage('Folder updated.');
                              await loadData();
                            } catch (err) {
                              setMessage(err?.message || 'Failed to update folder');
                            }
                          }}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteCategory(cat.id);
                              setMessage('Folder deleted.');
                            } catch (err) {
                              setMessage(err?.message || 'Failed to delete folder');
                            }
                          }}
                          className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
