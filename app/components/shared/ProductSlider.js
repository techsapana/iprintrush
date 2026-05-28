'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ProductCard } from './ProductCard';

export function ProductSlider({ title, products, viewAllHref = null }) {
  const scrollRef = useRef(null);

  const scrollByAmount = (direction) => {
    const container = scrollRef.current;
    if (!container) return;
    const amount = direction === 'left' ? -360 : 360;
    container.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (!Array.isArray(products) || products.length === 0) return null;

  return (
    <section className="py-10 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
          </div>

          <div className="flex items-center gap-3">
            {viewAllHref && (
              <Link href={viewAllHref} className="text-sm font-semibold text-[#29b6f6] hover:underline">
                View all
              </Link>
            )}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollByAmount('left')}
                className="w-9 h-9 rounded-full border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100 transition"
                aria-label="Scroll left"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scrollByAmount('right')}
                className="w-9 h-9 rounded-full border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100 transition"
                aria-label="Scroll right"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        >
          {products.map((product) => (
            <div key={product.id} className="min-w-[280px] max-w-[280px] flex-shrink-0 snap-start">
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

