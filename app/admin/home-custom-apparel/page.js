'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdmin } from '../../hooks/useAdmin';

const CUSTOM_APPAREL_SLUG = 'custom-apparels';

export default function AdminHomeCustomApparelPage() {
  const router = useRouter();
  const { adminUser, products, refreshProducts } = useAdmin();
  const [orderedIds, setOrderedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [addId, setAddId] = useState('');

  const apparelPool = useMemo(
    () =>
      (products || []).filter(
        (p) =>
          p.enabled !== false &&
          (p.categorySlug === CUSTOM_APPAREL_SLUG || p.category === 'Custom Apparels'),
      ),
    [products],
  );

  const idToProduct = useMemo(() => {
    const m = new Map();
    for (const p of apparelPool) m.set(String(p.id), p);
    return m;
  }, [apparelPool]);

  useEffect(() => {
    if (!adminUser) router.push('/admin/login');
  }, [adminUser, router]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/home-custom-apparel-products', {
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        if (!cancelled) {
          setOrderedIds(Array.isArray(data.productIds) ? data.productIds.map(String) : []);
        }
      } catch (e) {
        if (!cancelled) setMessage(e?.message || 'Failed to load picks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (adminUser) load();
    return () => {
      cancelled = true;
    };
  }, [adminUser]);

  const move = (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= orderedIds.length) return;
    setOrderedIds((prev) => {
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const removeAt = (index) => {
    setOrderedIds((prev) => prev.filter((_, i) => i !== index));
  };

  const addSelected = () => {
    const id = String(addId || '').trim();
    if (!id) return;
    if (orderedIds.includes(id)) {
      setMessage('That product is already in the list.');
      return;
    }
    if (!idToProduct.has(id)) {
      setMessage('Choose a Custom Apparels product from the list.');
      return;
    }
    setOrderedIds((prev) => [...prev, id]);
    setAddId('');
    setMessage('');
  };

  const save = async () => {
    try {
      setSaving(true);
      setMessage('');
      const res = await fetch('/api/admin/home-custom-apparel-products', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: orderedIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessage('Saved. The homepage Custom Apparels slider will use this order.');
    } catch (e) {
      setMessage(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!adminUser) return null;

  const addOptions = apparelPool.filter((p) => !orderedIds.includes(String(p.id)));

  return (
    <section className="bg-gray-50 min-h-screen">
      <section className="bg-white shadow">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Homepage — Custom Apparels</h1>
          <p className="text-sm text-gray-600 mt-1">
            Choose which Custom Apparels products appear in the homepage slider. If nothing is saved here,
            the site falls back to the latest products from that category.
          </p>
        </section>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <section className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => refreshProducts?.()}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Refresh product list
            </button>
            {loading && <span className="text-sm text-gray-500">Loading…</span>}
          </section>

          <section className="border rounded-lg divide-y">
            {orderedIds.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No products pinned yet — fallback mode on the homepage.</p>
            ) : (
              orderedIds.map((id, index) => {
                const p = idToProduct.get(id);
                return (
                  <section key={id} className="flex flex-wrap items-center gap-2 p-3">
                    <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                    <span className="flex-1 min-w-[160px] text-sm font-medium text-gray-900">
                      {p ? p.name : `Unknown (${id})`}
                    </span>
                    <section className="flex gap-1">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        className="px-2 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={index === orderedIds.length - 1}
                        onClick={() => move(index, 1)}
                        className="px-2 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAt(index)}
                        className="px-2 py-1 rounded border border-red-200 text-sm text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </section>
                  </section>
                );
              })
            )}
          </section>

          <section className="flex flex-wrap gap-2 items-end">
            <section className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Add product</label>
              <select
                value={addId}
                onChange={(e) => setAddId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {addOptions.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </section>
            <button
              type="button"
              onClick={addSelected}
              className="bg-[#29b6f6] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1e8fc4]"
            >
              Add
            </button>
          </section>

          <section className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save order'}
            </button>
            {message && <span className="text-sm text-gray-700">{message}</span>}
          </section>

          <p className="text-xs text-gray-500">
            Database setup: run{' '}
            <code className="bg-gray-100 px-1 rounded">sql/home_custom_apparel_and_tier_discount.sql</code>{' '}
            if the save API returns a missing-table error.
          </p>
        </section>

        <Link href="/admin/dashboard" className="text-sm text-[#29b6f6] hover:underline">
          ← Back to dashboard
        </Link>
      </section>
    </section>
  );
}
