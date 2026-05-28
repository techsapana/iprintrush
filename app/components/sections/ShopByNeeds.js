'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export function ShopByNeeds() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/business-categories');
        if (!res.ok) throw new Error('Failed to load business categories');
        const json = await res.json();
        if (!cancelled) {
          setCategories(json.categories || []);
        }
      } catch (err) {
        console.error('Failed to load business categories:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const checkScroll = () => {
      const el = sliderRef.current;
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth);
    };

    const el = sliderRef.current;
    if (!el) return;
    
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);
    
    return () => {
      el.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [categories]);

  const scroll = (direction) => {
    const el = sliderRef.current;
    if (!el) return;
    
    const scrollAmount = 320; // Card width + gap
    el.scrollTo({
      left: direction === 'left' ? el.scrollLeft - scrollAmount : el.scrollLeft + scrollAmount,
      behavior: 'smooth'
    });
  };

  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Shop by Business Needs
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find printing solutions tailored to your industry
            </p>
          </div>
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Shop by Business Needs
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find printing solutions tailored to your industry
          </p>
        </div>

        {/* Slider Container */}
        <div className="relative">
          {/* Left Scroll Button */}
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center transition-all ${
              canScrollLeft 
                ? 'text-gray-800 hover:bg-gray-100 hover:shadow-xl' 
                : 'text-gray-300 cursor-not-allowed opacity-50'
            }`}
            aria-label="Scroll left"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Right Scroll Button */}
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center transition-all ${
              canScrollRight 
                ? 'text-gray-800 hover:bg-gray-100 hover:shadow-xl' 
                : 'text-gray-300 cursor-not-allowed opacity-50'
            }`}
            aria-label="Scroll right"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Cards Slider */}
          <div
            ref={sliderRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide px-16 py-2"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex-shrink-0 w-80"
              >
                <Link href={`/products?businessCategory=${category.id}`}>
                  <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer border border-gray-200 h-full">
                    <div className="text-5xl mb-4">{category.icon || '📋'}</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {category.name}
                    </h3>
                    <p className="text-gray-600">
                      {category.description || 'Browse products for this category'}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
