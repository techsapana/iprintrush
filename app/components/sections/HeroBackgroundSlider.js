'use client';

import { useEffect, useMemo, useState } from 'react';

const DESKTOP_IMAGES = ['/d1.jpg', '/d2.jpg'];
const MOBILE_IMAGES = ['/m1.jpg', '/m2.jpg'];

export function HeroBackgroundSlider({
  images,
  intervalMs = 6000,
  fadeMs = 1200,
  className = '',
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [heroDesktopImageUrl, setHeroDesktopImageUrl] = useState('');
  const [heroMobileImageUrl, setHeroMobileImageUrl] = useState('');
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadHeroImages = async () => {
      try {
        const res = await fetch('/api/site-settings/announcement', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setHeroDesktopImageUrl(typeof data.heroDesktopImageUrl === 'string' ? data.heroDesktopImageUrl.trim() : '');
        setHeroMobileImageUrl(typeof data.heroMobileImageUrl === 'string' ? data.heroMobileImageUrl.trim() : '');
      } catch {
        // ignore and keep static fallback images
      }
    };
    loadHeroImages();
    return () => {
      cancelled = true;
    };
  }, []);

  const safeImages = useMemo(() => {
    if (Array.isArray(images) && images.length > 0) {
      return images;
    }
    if (isMobile && heroMobileImageUrl) {
      return [heroMobileImageUrl];
    }
    if (!isMobile && heroDesktopImageUrl) {
      return [heroDesktopImageUrl];
    }
    return isMobile ? MOBILE_IMAGES : DESKTOP_IMAGES;
  }, [heroDesktopImageUrl, heroMobileImageUrl, images, isMobile]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;

    const onChange = () => setReduceMotion(Boolean(media.matches));
    onChange();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    if (safeImages.length <= 1) return;

    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeImages.length);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, reduceMotion, safeImages.length]);

  return (
    <div
      aria-hidden="true"
      className={['relative w-full select-none overflow-hidden', className].join(' ')}
    >
      {/* Invisible first image to set the natural height */}
      <img
        src={safeImages[0]}
        alt=""
        className="w-full h-auto block invisible"
      />

      {/* All slides stacked absolutely on top */}
      {safeImages.map((src, idx) => {
        const isActive = idx === activeIndex;
        return (
          <img
            key={src}
            src={src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: isActive ? 1 : 0,
              transition: reduceMotion ? undefined : `opacity ${fadeMs}ms ease-in-out`,
            }}
          />
        );
      })}
    </div>
  );
}