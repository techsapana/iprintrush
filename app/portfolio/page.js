'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function PortfolioPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [resItems, resCats] = await Promise.all([
          fetch('/api/portfolio', { cache: 'no-store' }),
          fetch('/api/portfolio-categories', { cache: 'no-store' })
        ]);
        const dataItems = await resItems.json().catch(() => ({}));
        const dataCats = await resCats.json().catch(() => ({}));
        
        setItems(Array.isArray(dataItems.items) ? dataItems.items : []);
        setCategories(Array.isArray(dataCats.categories) ? dataCats.categories : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter items based on active category
  const displayedItems = activeCategoryId
    ? items.filter((item) => item.categoryId === activeCategoryId)
    : [];

  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {activeCategory ? `Portfolio: ${activeCategory.name}` : 'Portfolio Folders'}
            </h1>
            <p className="text-gray-600 mt-1">A gallery of our recent work.</p>
          </div>
          <div className="flex items-center gap-4">
            {activeCategoryId && (
              <button
                onClick={() => setActiveCategoryId(null)}
                className="text-[#29b6f6] font-medium hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Folders
              </button>
            )}
            <Link href="/" className="text-gray-500 hover:text-gray-900 text-sm font-medium">
              Back to Home
            </Link>
          </div>
        </div>

        {activeCategoryId && (
          <p className="text-sm text-gray-600 mb-8 max-w-3xl">
            Images are for viewing only. Contact us for permission to use.
          </p>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-gray-500">Loading...</div>
        ) : !activeCategoryId ? (
          // FOLDERS VIEW
          categories.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-gray-500">
              No portfolio folders added yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {categories.map((category) => {
                const itemCount = items.filter(i => i.categoryId === category.id).length;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategoryId(category.id)}
                    className="relative overflow-hidden flex flex-col items-start justify-between p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group text-left h-48"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#29b6f6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#29b6f6] to-[#1e8fc4] flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 z-10">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    
                    <div className="z-10 mt-auto">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#29b6f6] transition-colors">{category.name}</h3>
                      <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1">
                        <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                        <svg className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-1 transition-all duration-300 text-[#29b6f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          // IMAGES VIEW (Inside a Folder)
          displayedItems.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-gray-500">
              No images in this folder yet.
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {displayedItems.map((item) => {
                const domId = `portfolio-work-${item.id}`;
                return (
                  <div
                    key={item.id}
                    id={domId}
                    className="break-inside-avoid mb-6 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
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
                    <div className="p-4 flex justify-between items-center bg-white">
                      <h2 className="text-sm font-semibold text-gray-900">{item.label}</h2>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
