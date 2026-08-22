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
  const [heroDesktopImages, setHeroDesktopImages] = useState([]);
  const [heroMobileImages, setHeroMobileImages] = useState([]);
  
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

        const parseImages = (val) => {
          if (!val || typeof val !== 'string') return [];
          const str = val.trim();
          if (str.startsWith('[') && str.endsWith(']')) {
            try { return JSON.parse(str); } catch { return [str]; }
          }
          return [str];
        };

        setHeroDesktopImages(parseImages(data.heroDesktopImageUrl));
        setHeroMobileImages(parseImages(data.heroMobileImageUrl));
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
    if (isMobile && heroMobileImages.length > 0) {
      return heroMobileImages;
    }
    if (!isMobile && heroDesktopImages.length > 0) {
      return heroDesktopImages;
    }
    return isMobile ? MOBILE_IMAGES : DESKTOP_IMAGES;
  }, [heroDesktopImages, heroMobileImages, images, isMobile]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (safeImages.length <= 1) return;

    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeImages.length);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, safeImages.length]);

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
              transition: `opacity ${fadeMs}ms ease-in-out`,
            }}
          />
        );
      })}
    </div>
  );
}