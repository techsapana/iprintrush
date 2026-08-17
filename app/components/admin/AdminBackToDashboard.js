'use client';

import { useRouter } from 'next/navigation';

/**
 * Prominent link back to admin dashboard — use at top of each admin page (except login).
 */
export function AdminBackToDashboard() {
  const router = useRouter();
  return (
    <div className="bg-slate-800 border-b border-slate-700 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg bg-white text-slate-900 px-4 py-2 text-sm font-semibold shadow hover:bg-slate-100 transition border-none cursor-pointer"
        >
          <span aria-hidden>←</span>
          Go Back
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-700/50 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs font-medium transition cursor-pointer border border-slate-600"
          >
            Dashboard
          </button>
          <span className="text-xs text-slate-400 hidden sm:inline">Admin</span>
        </div>
      </div>
    </div>
  );
}
