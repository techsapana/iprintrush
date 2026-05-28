'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';

export default function AdminPortfolioPage() {
  const router = useRouter();
  const { adminUser } = useAdmin();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    label: '',
    imageUrl: '',
    displayOrder: 0,
  });

  useEffect(() => {
    if (!adminUser) router.push('/admin/login');
  }, [adminUser, router]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/portfolio', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load portfolio');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setMessage(err?.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminUser) loadItems();
  }, [adminUser]);

  if (!adminUser) return null;

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
      setForm({ label: '', imageUrl: '', displayOrder: 0 });
      setMessage('Portfolio image added.');
      await loadItems();
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
    await loadItems();
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Gallery</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <form onSubmit={createItem} className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Portfolio Image</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Label"
              value={form.label}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
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
            {saving ? 'Saving...' : 'Add to Portfolio'}
          </button>
          {message ? <p className="text-sm text-gray-600">{message}</p> : null}
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
                <div key={item.id} className="border rounded-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                  <img src={item.imageUrl} alt={item.label} className="h-24 w-full object-cover rounded border" />
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, label: e.target.value } : x))
                      )
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm md:col-span-2"
                  />
                  <input
                    type="number"
                    value={item.displayOrder}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === item.id ? { ...x, displayOrder: Number(e.target.value || 0) } : x
                        )
                      )
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <a
                      href={item.imageUrl}
                      download
                      className="bg-slate-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-slate-800 inline-flex items-center"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateItem(item);
                          setMessage('Portfolio item updated.');
                          await loadItems();
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
                          setMessage('Portfolio item deleted.');
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
      </div>
    </div>
  );
}

