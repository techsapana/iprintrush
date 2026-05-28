'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdmin } from '../../hooks/useAdmin';

export default function AdminNavbarOrderPage() {
  const router = useRouter();
  const { adminUser, refreshCategories } = useAdmin();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [tableMissing, setTableMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setMessage('');
      const res = await fetch('/api/admin/navbar-category-order', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      if (data.tableMissing) {
        setTableMissing(true);
        setRows([]);
        return;
      }
      setTableMissing(false);
      setRows(Array.isArray(data.categories) ? data.categories : []);
    } catch (e) {
      setMessage(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!adminUser) router.push('/admin/login');
  }, [adminUser, router]);

  useEffect(() => {
    if (adminUser) load();
  }, [adminUser, load]);

  const swap = async (categoryId, direction) => {
    try {
      setBusyId(categoryId);
      setMessage('');
      const res = await fetch('/api/admin/navbar-category-order', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, direction }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setRows(Array.isArray(data.categories) ? data.categories : []);
      await refreshCategories?.();
    } catch (e) {
      setMessage(e?.message || 'Update failed');
    } finally {
      setBusyId('');
    }
  };

  if (!adminUser) return null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Navbar — Category order</h1>
          <p className="text-sm text-gray-600 mt-1">
            Reorder category links in the main blue navigation strip (same set as on the public site, excluding “All
            Products” and the same-day tab). Use the arrows to swap with the neighbor above or below.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          {tableMissing && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm p-4">
              The <code className="font-mono">navbar_category_order</code> table was not found. Run{' '}
              <code className="font-mono bg-white/80 px-1 rounded">sql/hero_same_day_and_navbar_order.sql</code> on
              your database, then reload this page.
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <ul className="divide-y border rounded-lg">
              {rows.map((c, index) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-3">
                  <span className="text-xs text-gray-500 w-8">{index + 1}</span>
                  <span className="flex-1 font-medium text-gray-900">{c.name}</span>
                  <span className="text-xs text-gray-500 truncate max-w-[140px]">{c.slug}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={index === 0 || busyId}
                      onClick={() => swap(c.id, 'up')}
                      className="px-2 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={index === rows.length - 1 || busyId}
                      onClick={() => swap(c.id, 'down')}
                      className="px-2 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
                    >
                      ↓
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {message && <p className="text-sm text-red-600">{message}</p>}

          <button
            type="button"
            onClick={load}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Reload
          </button>
        </div>

        <Link href="/admin/dashboard" className="text-sm text-[#29b6f6] hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
