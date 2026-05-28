'use client';

import Link from 'next/link';

/**
 * Prominent link back to admin dashboard — use at top of each admin page (except login).
 */
export function AdminBackToDashboard() {
  return (
    <div className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-white text-slate-900 px-4 py-2 text-sm font-semibold shadow hover:bg-slate-100 transition"
        >
          <span aria-hidden>←</span>
          Back to Dashboard
        </Link>
        <span className="text-xs text-slate-400 hidden sm:inline">Admin</span>
      </div>
    </div>
  );
}
