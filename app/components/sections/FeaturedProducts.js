'use client';

import { useAdmin } from '../../hooks/useAdmin';
import { getFeaturedProducts } from '../../data/products';
import { ProductSlider } from '../shared/ProductSlider';
import { useEffect, useState } from 'react';

export function FeaturedProducts() {
  const { products, categories } = useAdmin();
  const featuredProducts = getFeaturedProducts(products, 6);
  const apparelCategory = categories.find((c) => c.slug === 'custom-apparels' || c.name === 'Custom Apparels');
  const apparelName = apparelCategory?.name || 'Custom Apparels';
  const apparelSlug = apparelCategory?.slug;
  const [apparelProducts, setApparelProducts] = useState([]);
  const apparelHref = apparelCategory ? `/products?category=${apparelCategory.slug}` : '/products?q=custom%20apparels';

  const [promoHeadline, setPromoHeadline] = useState(
    'Stock up on business essentials for the new year',
  );
  const [promoSubheadline, setPromoSubheadline] = useState(
    'Get everything you need to start 2026 strong',
  );
  const [promoBannerImageUrl, setPromoBannerImageUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/site-settings/announcement', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (typeof json.promoHeadline === 'string') setPromoHeadline(json.promoHeadline);
        if (typeof json.promoSubheadline === 'string') setPromoSubheadline(json.promoSubheadline);
        if (typeof json.promoBannerImageUrl === 'string') setPromoBannerImageUrl(json.promoBannerImageUrl);
      } catch {
        // ignore
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadApparel = async () => {
      try {
        const res = await fetch('/api/home-custom-apparel-products', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed');
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const list = Array.isArray(json.products) ? json.products : [];
        if (list.length > 0) {
          setApparelProducts(list);
          return;
        }
      } catch {
        // fallback below
      }
      if (cancelled) return;
      const fallback = (products || [])
        .filter(
          (p) =>
            p.category === apparelName || (apparelSlug && p.categorySlug === apparelSlug),
        )
        .slice(0, 12);
      setApparelProducts(fallback);
    };
    loadApparel();
    return () => {
      cancelled = true;
    };
  }, [products, apparelName, apparelSlug]);

  return (
    <>
      {/* Custom Apparels (replaces Recent View Products) */}
      <ProductSlider title="Custom Apparels" products={apparelProducts} viewAllHref={apparelHref} />

      {/* Promotional Banner */}
      <section
        className="relative py-16 overflow-hidden"
        style={{
          backgroundColor: '#29b6f6',
          backgroundImage: promoBannerImageUrl
            ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${promoBannerImageUrl})`
            : 'linear-gradient(135deg, #29b6f6, #29b6f6)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2">
            <div className="w-full h-full bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_0%,_transparent_70%)] animate-spin-slow" />
          </div>
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 text-center">
          {promoHeadline ? (
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-fadeInUp">
              {promoHeadline}
            </h2>
          ) : null}
          {promoSubheadline ? (
            <p className="text-xl text-white/90 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              {promoSubheadline}
            </p>
          ) : null}
        </div>
      </section>

      {/* Featured Products Section */}
      <ProductSlider title="Featured Products" products={featuredProducts} viewAllHref="/products" />
    </>
  );
}