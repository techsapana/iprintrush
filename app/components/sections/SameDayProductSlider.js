'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ProductCard } from '../shared/ProductCard';
import { isSameDayPrintingProduct } from '../../lib/siteConstants';

export function SameDayProductSlider() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const heroRes = await fetch('/api/hero-same-day-products', { cache: 'no-store' });
        if (heroRes.ok) {
          const heroJson = await heroRes.json();
          if (cancelled) return;
          if (Array.isArray(heroJson.products) && heroJson.products.length > 0 && heroJson.curated) {
            setProducts(heroJson.products);
            return;
          }
        }

        const res = await fetch('/api/products');
        if (!res.ok) {
          throw new Error('Failed to load same-day products');
        }
        const json = await res.json();
        if (cancelled) return;
        const list = Array.isArray(json.products)
          ? json.products.filter((p) => isSameDayPrintingProduct(p)).slice(0, 5)
          : [];
        setProducts(list);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollByAmount = (direction) => {
    const container = scrollRef.current;
    if (!container) return;
    const amount = direction === 'left' ? -360 : 360;
    container.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (loading || error || products.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 text-center">
      <div className="flex items-center justify-center mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByAmount('left')}
            className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100 transition"
            aria-label="Scroll left"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount('right')}
            className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-100 transition"
            aria-label="Scroll right"
          >
            ›
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
          style={{
            scrollbarWidth: 'thin',
            msOverflowStyle: 'none',
          }}
        >
          {products.map((product) => (
            <div key={product.id} className="min-w-[280px] max-w-[280px] flex-shrink-0 snap-start">
              <ProductCard product={product} compact />
            </div>
          ))}
          <div className="min-w-[280px] max-w-[280px] flex-shrink-0 snap-start">
            <Link
              href="/products?category=same-day-printing"
              className="h-full w-full border border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 transition flex items-center justify-center"
            >
              <div className="text-center px-6 py-10">
                <div className="text-sm font-semibold text-gray-900">View all</div>
                <div className="text-xs text-gray-600 mt-1">Same Day Printing</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
