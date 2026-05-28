'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function PortfolioPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/portfolio', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setItems(Array.isArray(data.items) ? data.items : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
            <p className="text-gray-600 mt-1">A gallery of our recent work.</p>
          </div>
          <Link href="/" className="text-[#29b6f6] hover:underline">
            Back to Home
          </Link>
        </div>

        <p className="text-sm text-gray-600 mb-8 max-w-3xl">
          Images are for viewing only. Contact us for permission to use.
        </p>

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-gray-500">
            No portfolio images added yet.
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {items.map((item) => {
              const domId = `portfolio-work-${item.id}`;
              return (
                <div
                  key={item.id}
                  id={domId}
                  className="break-inside-avoid mb-6 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
                >
                  <div
                    className="relative group select-none"
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.label || 'Portfolio work'}
                      draggable={false}
                      className="w-full h-auto object-cover align-middle block pointer-events-none"
                    />
                    <div
                      className="absolute inset-0 z-10 flex flex-col justify-end p-4 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-auto"
                      aria-hidden="true"
                    >
                      <p className="text-xs text-white/90 font-medium">View only — contact us for permission to use.</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <h2 className="text-sm font-semibold text-gray-900">{item.label}</h2>
                    <p className="text-xs text-gray-500 mt-1">ID: {item.id}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
