'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useAdmin } from '../../hooks/useAdmin';
import { useAuth } from '../../hooks/useAuth';
import { SAME_DAY_PRINTING_CATEGORY_SLUG, isSameDayPrintingProduct } from '../../lib/siteConstants';
import { isNavbarStripCategory } from '../../lib/siteNavCategory';

const SAME_DAY_PRINTING_HREF = `/products?category=${SAME_DAY_PRINTING_CATEGORY_SLUG}`;

const NAV_DROPDOWN_PREVIEW_LIMIT = 10;

/** Newest first for category hover menus (matches “latest” in dropdown). */
function sortProductsLatestFirst(products) {
  if (!Array.isArray(products)) return [];
  return [...products].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (tb !== ta) return tb - ta;
    const ida = Number(a.id);
    const idb = Number(b.id);
    if (Number.isFinite(ida) && Number.isFinite(idb) && idb !== ida) return idb - ida;
    return String(b.id).localeCompare(String(a.id));
  });
}

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [logoImgError, setLogoImgError] = useState(false);
  const [logoImageUrl, setLogoImageUrl] = useState('');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { getItemCount } = useCart();
  const { getItemCount: getWishlistCount } = useWishlist();
  const { categories, products } = useAdmin();
  const { isAuthenticated } = useAuth();
  const cartCount = getItemCount();
  const wishlistCount = getWishlistCount();
  const router = useRouter();

  const stripRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const dragMoved = useRef(false);
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState(null);
  const [announcementText, setAnnouncementText] = useState(
    'Get it by Christmas: Up to 40% off select last-minute gifts | Ends Dec. 22'
  );
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  const isTouchDevice =
    typeof window !== 'undefined' &&
    (('ontouchstart' in window) || (navigator && navigator.maxTouchPoints > 0));

  const supportsHover =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover)').matches;

  const openDropdownAt = (e, id) => {
    if (!supportsHover) return;
    setHoveredCategoryId(id);
    const rect = e?.currentTarget?.getBoundingClientRect?.();
    if (!rect) return;
    setDropdownPos({
      left: rect.left + rect.width / 2,
      top: rect.bottom,
      width: rect.width,
    });
  };

  const closeDropdown = (id) => {
    if (!supportsHover) return;
    setHoveredCategoryId((current) => (current === id ? null : current));
    setDropdownPos((current) => (hoveredCategoryId === id ? null : current));
  };

  useEffect(() => {
    if (!supportsHover) return;
    const onScrollOrResize = () => {
      // close on layout shifts to avoid misplaced floating dropdown
      setHoveredCategoryId(null);
      setDropdownPos(null);
    };
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [supportsHover]);

  useEffect(() => {
    let cancelled = false;
    const loadAnnouncement = async () => {
      try {
        const res = await fetch('/api/site-settings/announcement', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (typeof data.announcementText === 'string' && data.announcementText.trim()) {
          setAnnouncementText(data.announcementText.trim());
        }
        setAnnouncementEnabled(data.announcementEnabled !== false);
        setLogoImageUrl(typeof data.logoImageUrl === 'string' ? data.logoImageUrl.trim() : '');
      } catch {
        // keep default text
      }
    };
    loadAnnouncement();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLogoImgError(false);
  }, [logoImageUrl]);

  const updateScrollState = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  const navbarStripCategories = useMemo(() => {
    return [...(categories || [])]
      .filter(isNavbarStripCategory)
      .sort((a, b) => (Number(a.navPosition) || 0) - (Number(b.navPosition) || 0));
  }, [categories]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [navbarStripCategories, categories, updateScrollState]);

  const scrollBy = (dir) => {
    stripRef.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  const onMouseDown = (e) => {
    if (!isTouchDevice) return;
    isDragging.current = true;
    dragMoved.current = false;
    startX.current = e.pageX - (stripRef.current?.offsetLeft ?? 0);
    scrollLeftStart.current = stripRef.current?.scrollLeft ?? 0;
  };
  const onMouseMove = (e) => {
    if (!isTouchDevice) return;
    if (!isDragging.current || !stripRef.current) return;
    e.preventDefault();
    const x = e.pageX - stripRef.current.offsetLeft;
    const walk = x - startX.current;
    if (Math.abs(walk) > 4) dragMoved.current = true;
    stripRef.current.scrollLeft = scrollLeftStart.current - walk;
  };
  const onMouseUp = () => {
    isDragging.current = false;
    // allow subsequent clicks after drag ends
    setTimeout(() => {
      dragMoved.current = false;
    }, 0);
  };
  const onLinkClick = (e) => {
    if (dragMoved.current) e.preventDefault();
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const q = (searchValue || '').trim();
    setMobileMenuOpen(false);
    if (!q) {
      router.push('/products');
      return;
    }
    router.push(`/products?q=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    const q = (searchValue || '').trim().toLowerCase();
    if (q.length < 3) {
      setSearchSuggestions([]);
      return;
    }
    const matches = (products || [])
      .filter((p) => String(p.name || '').toLowerCase().includes(q))
      .slice(0, 8);
    setSearchSuggestions(matches);
  }, [searchValue, products]);

  const staticLinks = [
    { href: '/products', label: 'All Products' },
    { href: SAME_DAY_PRINTING_HREF, label: 'Same Day Printing' },
    { href: '/contact', label: 'Contact' },
    { href: '/faq', label: 'FAQ' },
  ];

  const primaryNavLinks = staticLinks.slice(0, 2); // All Products + Same Day Printing
  const secondaryNavLinks = staticLinks.slice(2);  // Contact, FAQ

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#29b6f6] shadow-lg">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Top Bar ── */}
          <div className="flex items-center justify-between gap-6 py-4">
            <Link href="/" className="flex-shrink-0">
              {logoImgError ? (
                <span className="text-white font-bold text-3xl lowercase tracking-tight hover:scale-105 transition-transform block">
                  iprint
                </span>
              ) : (
                <img
                  src={logoImageUrl || '/logo.png'}
                  alt="iPrintRush"
                  className="h-7 w-auto max-h-7 max-w-[160px] object-contain object-left hover:scale-105 transition-transform block"
                  onError={() => setLogoImgError(true)}
                />
              )}
            </Link>

            <div className="flex-1 max-w-[600px] hidden md:block">
              <form onSubmit={onSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Search for products, services..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="w-full px-6 py-3 pr-12 rounded-full bg-white/95 text-base shadow-md focus:outline-none focus:bg-white focus:shadow-xl transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#29b6f6] flex items-center justify-center text-white hover:bg-[#1e9fe4] transition-colors"
                  aria-label="Search"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </button>
                {searchSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-[1000] max-h-72 overflow-y-auto">
                    {searchSuggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSearchValue('');
                          setSearchSuggestions([]);
                          router.push(`/products/${p.slug}`);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <a
                href="tel:+19164581139"
                className="hidden lg:flex items-center gap-1 text-white font-semibold hover:scale-105 transition-transform whitespace-nowrap text-sm"
              >
                <span className="text-lg">📞</span>
                <span>916-458-1139</span>
              </a>

              <Link href="/wishlist" className="flex flex-col items-center gap-1">
                <button className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all hover:-translate-y-0.5">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#ff4444] text-white text-xs font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </button>
                <span className="text-white text-xs font-bold">Saved</span>
              </Link>
              <Link href={isAuthenticated ? "/profile" : "/login"} className="hidden sm:flex flex-col items-center gap-1">
                <button className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all hover:-translate-y-0.5">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="10" cy="7" r="4" />
                  </svg>
                </button>
                <span className="text-white text-xs font-bold">{isAuthenticated ? "Profile" : "Login"}</span>
              </Link>


              <Link href="/cart" className="flex flex-col items-center gap-1">
                <button className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all hover:-translate-y-0.5">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#ff4444] text-white text-xs font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
                <span className="text-white text-xs font-bold">Cart</span>
              </Link>

              <button
                className="md:hidden text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  {mobileMenuOpen
                    ? <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    : <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />}
                </svg>
              </button>
            </div>
          </div>

          {/* ── Bottom Nav: smooth scrollable strip (all breakpoints) ── */}
          <div className="relative pb-3">
            {/* Left fade + arrow */}
            <div className="absolute left-0 top-0 bottom-3 z-10 flex items-center" style={{ width: 52, pointerEvents: 'none' }}>
              <div
                className="absolute inset-0 transition-opacity duration-200"
                style={{
                  background: 'linear-gradient(to right, #29b6f6 50%, transparent)',
                  opacity: canScrollLeft ? 1 : 0,
                }}
              />
              <button
                onClick={() => scrollBy('left')}
                style={{ pointerEvents: canScrollLeft ? 'auto' : 'none', opacity: canScrollLeft ? 1 : 0 }}
                className="relative z-10 w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center text-white transition-all ml-1"
                aria-label="Scroll left"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>
            </div>

            {/* The scrollable strip */}
            <div
              ref={stripRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              className="flex items-center gap-1 overflow-x-auto overflow-y-visible select-none"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                cursor: isTouchDevice ? 'grab' : 'auto',
                paddingLeft: 52,
                paddingRight: 52,
              }}
            >
              {/* Primary links: All Products + Same Day Printing */}
              {primaryNavLinks.map(({ href, label }) => {
                const isSameDay = href === SAME_DAY_PRINTING_HREF;
                const isHovered = hoveredCategoryId === 'same-day';
                const sameDayProducts = sortProductsLatestFirst(
                  products?.filter((p) => isSameDayPrintingProduct(p)) || [],
                );
                const sameDayProductsPreview = sameDayProducts.slice(0, NAV_DROPDOWN_PREVIEW_LIMIT);

                // All Products: simple static link, no dropdown
                if (!isSameDay) {
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onLinkClick}
                      className="flex-shrink-0 px-4 py-2 text-white font-bold text-sm rounded-full hover:bg-white/20 active:bg-white/30 transition-colors whitespace-nowrap"
                    >
                      {label}
                    </Link>
                  );
                }

                // Same Day Printing: static link with desktop hover dropdown of same-day products
                return (
                  <div
                    key={href}
                    className="relative flex-shrink-0"
                    onMouseEnter={(e) => openDropdownAt(e, 'same-day')}
                    onMouseLeave={() => closeDropdown('same-day')}
                  >
                    <Link
                      href={href}
                      onClick={onLinkClick}
                      className="px-4 py-2 text-white font-bold text-sm rounded-full hover:bg-white/20 active:bg-white/30 transition-colors whitespace-nowrap hidden md:inline-block"
                    >
                      {label}
                    </Link>
                    <Link
                      href={href}
                      onClick={onLinkClick}
                      className="flex-shrink-0 px-4 py-2 text-white font-bold text-sm rounded-full hover:bg-white/20 active:bg-white/30 transition-colors whitespace-nowrap md:hidden"
                    >
                      {label}
                    </Link>
                    {supportsHover && isHovered && sameDayProducts.length > 0 && dropdownPos && (
                      <div
                        className="hidden md:block fixed mt-0 min-w-[220px] max-w-xs bg-white text-gray-900 rounded-xl shadow-xl border border-gray-100 z-[9999]"
                        style={{ left: dropdownPos.left, top: dropdownPos.top, transform: 'translateX(-50%)' }}
                      >
                        <div className="py-2">
                          {sameDayProductsPreview.map((product) => (
                            <Link
                              key={product.id}
                              href={`/products/${encodeURIComponent(product.slug || product.id)}`}
                              onClick={onLinkClick}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                            >
                              <span className="truncate">{product.name}</span>
                            </Link>
                          ))}
                          {sameDayProducts.length > NAV_DROPDOWN_PREVIEW_LIMIT && (
                            <div className="px-3 pb-2 pt-1">
                              <Link
                                href={SAME_DAY_PRINTING_HREF}
                                onClick={onLinkClick}
                                className="flex w-full items-center justify-center rounded-lg border border-[#29b6f6]/40 bg-[#29b6f6]/10 px-3 py-2 text-sm font-semibold text-[#0d8bd4] hover:bg-[#29b6f6]/20"
                              >
                                Load more
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Categories (exclude any "All Products" category) */}
              {navbarStripCategories.map((category) => {
                  const categoryProducts = sortProductsLatestFirst(
                    products?.filter(
                      (p) =>
                        p.categorySlug === category.slug ||
                        p.category === category.name ||
                        (p.categorySlug === SAME_DAY_PRINTING_CATEGORY_SLUG &&
                          p.linkedCategorySlug === category.slug),
                    ) || [],
                  );
                  const categoryProductsPreview = categoryProducts.slice(0, NAV_DROPDOWN_PREVIEW_LIMIT);
                  const isHovered = hoveredCategoryId === category.id;
                  return (
                    <div
                      key={category.id}
                      className="relative flex-shrink-0"
                      onMouseEnter={(e) => openDropdownAt(e, category.id)}
                      onMouseLeave={() => closeDropdown(category.id)}
                    >
                      <Link
                        href={`/products?category=${category.slug}`}
                        onClick={onLinkClick}
                        className="px-4 py-2 text-white font-bold text-sm rounded-full hover:bg-white/20 active:bg-white/30 transition-colors whitespace-nowrap hidden md:inline-block"
                      >
                        {category.name}
                      </Link>
                      <Link
                        href={`/products?category=${category.slug}`}
                        onClick={onLinkClick}
                        className="flex-shrink-0 px-4 py-2 text-white font-bold text-sm rounded-full hover:bg-white/20 active:bg-white/30 transition-colors whitespace-nowrap md:hidden"
                      >
                        {category.name}
                      </Link>
                      {/* Desktop-only hover dropdown with products */}
                      {supportsHover && isHovered && categoryProducts.length > 0 && dropdownPos && (
                        <div
                          className="hidden md:block fixed mt-0 min-w-[220px] max-w-xs bg-white text-gray-900 rounded-xl shadow-xl border border-gray-100 z-[9999]"
                          style={{ left: dropdownPos.left, top: dropdownPos.top, transform: 'translateX(-50%)' }}
                        >
                          <div className="py-2">
                            {categoryProductsPreview.map((product) => (
                              <Link
                                key={product.id}
                                href={`/products/${encodeURIComponent(product.slug || product.id)}`}
                                onClick={onLinkClick}
                                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                              >
                                <span className="truncate">{product.name}</span>
                              </Link>
                            ))}
                            {categoryProducts.length > NAV_DROPDOWN_PREVIEW_LIMIT && (
                              <div className="px-3 pb-2 pt-1">
                                <Link
                                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                                  onClick={onLinkClick}
                                  className="flex w-full items-center justify-center rounded-lg border border-[#29b6f6]/40 bg-[#29b6f6]/10 px-3 py-2 text-sm font-semibold text-[#0d8bd4] hover:bg-[#29b6f6]/20"
                                >
                                  Load more
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Divider between main nav + contact/FAQ */}
              <span className="flex-shrink-0 w-px h-5 bg-white/30 mx-2" />

              {secondaryNavLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onLinkClick}
                  className="flex-shrink-0 px-4 py-2 text-white/85 font-bold text-sm rounded-full hover:bg-white/20 hover:text-white active:bg-white/30 transition-colors whitespace-nowrap"
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Right fade + arrow */}
            <div className="absolute right-0 top-0 bottom-3 z-10 flex items-center justify-end" style={{ width: 52, pointerEvents: 'none' }}>
              <div
                className="absolute inset-0 transition-opacity duration-200"
                style={{
                  background: 'linear-gradient(to left, #29b6f6 50%, transparent)',
                  opacity: canScrollRight ? 1 : 0,
                }}
              />
              <button
                onClick={() => scrollBy('right')}
                style={{ pointerEvents: canScrollRight ? 'auto' : 'none', opacity: canScrollRight ? 1 : 0 }}
                className="relative z-10 w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center text-white transition-all mr-1"
                aria-label="Scroll right"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Mobile search ── */}
          <div className="md:hidden pb-4">
            <form onSubmit={onSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search for products, services..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full px-6 py-3 pr-12 rounded-full bg-white/95 text-base shadow-md focus:outline-none focus:bg-white focus:shadow-xl transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#29b6f6] flex items-center justify-center text-white hover:bg-[#1e9fe4] transition-colors"
                aria-label="Search"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>
              {searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-[1000] max-h-72 overflow-y-auto">
                  {searchSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSearchValue('');
                        setSearchSuggestions([]);
                        router.push(`/products/${p.slug}`);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </form>
          </div>

          {/* ── Mobile full-screen menu (hamburger) ─ */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
              <div
                className="absolute top-0 right-0 bottom-0 w-4/5 max-w-xs bg-[#29b6f6] shadow-xl pt-16 pb-6 flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 pb-4 border-b border-white/20">
                  <p className="text-white text-sm font-semibold mb-1">Menu</p>
                </div>
                <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
                  {primaryNavLinks.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2.5 rounded-md text-white font-bold text-sm hover:bg-white/15"
                    >
                      {label}
                    </Link>
                  ))}
                  {navbarStripCategories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/products?category=${category.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2.5 rounded-md text-white font-bold text-sm hover:bg-white/15"
                    >
                      {category.name}
                    </Link>
                  ))}
                  <div className="h-px bg-white/20 my-2" />
                  {secondaryNavLinks.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2.5 rounded-md text-white/90 font-bold text-sm hover:bg-white/15"
                    >
                      {label}
                    </Link>
                  ))}
                  <div className="h-px bg-white/20 my-2" />
                  <Link
                    href={isAuthenticated ? "/profile" : "/login"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-white font-bold text-sm hover:bg-white/15"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="10" cy="7" r="4" />
                    </svg>
                    <span>{isAuthenticated ? "Profile" : "Login"}</span>
                  </Link>
                </nav>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── Announcement Banner ── */}
      {announcementEnabled && (
        <div className="bg-[#1a1a1a] text-white py-3 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex overflow-hidden">
            <div
              className="announcement-marquee-track flex shrink-0 items-center gap-16 whitespace-nowrap px-4 text-sm font-medium"
              aria-label={announcementText}
            >
              <span>{announcementText}</span>
              <span aria-hidden="true">{announcementText}</span>
            </div>
            <div
              className="announcement-marquee-track flex shrink-0 items-center gap-16 whitespace-nowrap px-4 text-sm font-medium"
              aria-hidden="true"
            >
              <span>{announcementText}</span>
              <span>{announcementText}</span>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* Hide scrollbar for the category strip */
        .category-strip::-webkit-scrollbar { display: none; }
        @keyframes announcement-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .announcement-marquee-track {
          animation: announcement-marquee 28s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .announcement-marquee-track {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}