'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAdmin } from '../../hooks/useAdmin';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { SameDayBadge } from '../../components/shared/SameDayBadge';
import { isSameDayPrintingProduct } from '../../lib/siteConstants';
import { SameDayNotice } from '../../components/shared/SameDayNotice';
import { ProductCard } from '../../components/shared/ProductCard';
import { QuoteBuilder } from '../../components/product/QuoteBuilder';
import { MailboxQuoteBuilder } from '../../components/product/MailboxQuoteBuilder';
import { NotaryPricingChart } from '../../components/product/NotaryPricingChart';
import { MailboxPricingChart } from '../../components/product/MailboxPricingChart';
import { OurProcess } from '../../components/sections/OurProcess';
import { useAuth } from '../../hooks/useAuth';
import { useMemo } from 'react';
import {
  saveBuyNowItems,
  clearBuyNowItems,
  requireLoginForCheckout,
} from '../../lib/checkoutFlow';
import { readQuotePrefill, clearQuotePrefill } from '../../lib/quotePrefill';

export default function ProductDetailPage({ params }) {
  // Await params promise
  const resolvedParams = use(params);
  // Await params.slug if it's also a promise
  const slug = resolvedParams.slug && typeof resolvedParams.slug === 'object' && 'then' in resolvedParams.slug
    ? use(resolvedParams.slug)
    : resolvedParams.slug;
   const { getProductBySlug, products } = useAdmin();
   const productFromContext = getProductBySlug(slug);
   const { addToCart } = useCart();
   const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
   const router = useRouter();
   const { isAuthenticated } = useAuth();
   const path = usePathname();
   const searchParams = useSearchParams();

  const [addedToCart, setAddedToCart] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(null);
  const [quoteEnabled, setQuoteEnabled] = useState(true);
  const [quotePrefill, setQuotePrefill] = useState(null);

  const [productFresh, setProductFresh] = useState(null);

  useEffect(() => {
    const loadFresh = async () => {
      try {
        const res = await fetch(`/api/products/${slug}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.product) {
            setProductFresh(data.product);
          }
        }
      } catch {
        // ignore and fallback to context
      }
    };
    if (slug) loadFresh();
  }, [slug]);

  const product = productFresh || productFromContext;

  useEffect(() => {
    let cancelled = false;
    const loadQuoteMeta = async () => {
      if (!product?.id) return;
      try {
        const res = await fetch(`/api/quote-config/${encodeURIComponent(String(product.id))}`, {
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        // Apparel mode returns productSettings.enabled; dynamic mode returns enabled.
        const enabled =
          json?.mode === 'print_product'
            ? json?.enabled !== false
            : json?.productSettings?.enabled !== false;
        setQuoteEnabled(Boolean(enabled));
      } catch {
        // Default to enabled if config fetch fails.
        if (!cancelled) setQuoteEnabled(true);
      }
    };
    loadQuoteMeta();
    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  useEffect(() => {
    if (!product?.id) return;
    const stored = readQuotePrefill(product.id);
    if (stored?.payload) {
      setQuotePrefill(stored);
      clearQuotePrefill();
    }
  }, [product?.id]);

  const isMailboxNotaryCategory =
    product?.categorySlug === 'mailbox-notary' ||
    product?.category === 'Mailbox & Notary';

  const hasPrice = Number(product?.price || 0) > 0 && !Number.isNaN(Number(product?.price || 0));
  const outOfStock = product?.outOfStock === true;

  // Build media list (images + videos) safely even if product has not loaded yet
  const media = (() => {
    const items = [];

    const imageList =
      product?.galleryImages && product.galleryImages.length
        ? product.galleryImages
        : [product?.image || '/placeholder.jpg'];
    for (const url of imageList) {
      items.push({ type: 'image', url });
    }

    const videoList = Array.isArray(product?.videos) ? product.videos : [];
    for (const v of videoList) {
      if (!v?.url) continue;
      items.push({ type: 'video', url: v.url, title: v.title || '' });
    }

    return items;
  })();

  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const currentMedia = media[currentMediaIndex] || { type: 'image', url: product?.image || '/placeholder.jpg' };
  const inWishlist = product ? isInWishlist(product.id) : false;

  const [simpleQty, setSimpleQty] = useState(1);
  const simpleTotal = useMemo(() => {
    const unit = Number(product?.price || 0);
    const qty = Number(simpleQty || 0);
    if (!Number.isFinite(unit) || unit <= 0) return 0;
    if (!Number.isFinite(qty) || qty <= 0) return 0;
    return unit * qty;
  }, [product?.price, simpleQty]);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
          <Link href="/products" className="text-[#29b6f6] hover:underline">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const relatedProducts = products
    ? products.filter((p) => p.category === product.category && p.id !== product.id)
    : [];

  const buildQuoteCartEntries = () => {
    if (!currentQuote?.summary || !currentQuote?.payload) return [];
    const summary = currentQuote.summary;
    const totalQty = Number(summary.totalQuantity || 0);
    const merchandiseSubtotal = Number(summary.merchandiseSubtotal ?? summary.subtotal ?? 0);
    const shippingTierSubtotal = Number(summary.shippingTierSubtotal ?? summary.subtotal ?? 0);
    const breakdown = Array.isArray(summary.sizeBreakdown) ? summary.sizeBreakdown : [];
    if (breakdown.length <= 1 || totalQty <= 0) {
      return [
        {
          quantity: summary.totalQuantity,
          quotePayload: currentQuote.payload,
          quoteSummary: summary,
          merchandiseSubtotal,
          shippingTierSubtotal,
          customizationsDisplay: currentQuote.customizationsDisplay,
          artworkReady: currentQuote.payload?.artworkReady === true,
          tempArtworkFiles: currentQuote.payload?.tempArtworkFiles || [],
        },
      ];
    }

    // Split one quote into per-size cart lines so cart/checkout/orders show each size separately.
    const unit = Number(summary.grandTotal || 0) / totalQty;
    const splitGroupId = `${product.id}-${Date.now()}`;
    let running = 0;
    let runningMerchandise = 0;
    let runningShippingTierSubtotal = 0;
    return breakdown
      .filter((s) => Number(s?.quantity || 0) > 0)
      .map((s, index, arr) => {
        const qty = Number(s.quantity || 0);
        let lineTotal = Number((unit * qty).toFixed(2));
        if (index === arr.length - 1) {
          lineTotal = Number((Number(summary.grandTotal || 0) - running).toFixed(2));
        } else {
          running = Number((running + lineTotal).toFixed(2));
        }
        let merchandiseLineTotal = Number(((merchandiseSubtotal / totalQty) * qty).toFixed(2));
        if (index === arr.length - 1) {
          merchandiseLineTotal = Number((merchandiseSubtotal - runningMerchandise).toFixed(2));
        } else {
          runningMerchandise = Number((runningMerchandise + merchandiseLineTotal).toFixed(2));
        }
        let shippingTierLineTotal = Number(((shippingTierSubtotal / totalQty) * qty).toFixed(2));
        if (index === arr.length - 1) {
          shippingTierLineTotal = Number((shippingTierSubtotal - runningShippingTierSubtotal).toFixed(2));
        } else {
          runningShippingTierSubtotal = Number((runningShippingTierSubtotal + shippingTierLineTotal).toFixed(2));
        }
        const splitDisplay = {
          ...(currentQuote.customizationsDisplay || {}),
          Size: s.sizeLabel || 'Selected size',
        };
        return {
          quantity: qty,
          quotePayload: currentQuote.payload,
          quoteSummary: {
            ...summary,
            totalQuantity: qty,
            unitPrice: qty > 0 ? lineTotal / qty : 0,
            grandTotal: lineTotal,
            merchandiseSubtotal: merchandiseLineTotal,
            shippingTierSubtotal: shippingTierLineTotal,
            sizeBreakdown: [{ sizeLabel: s.sizeLabel || 'Selected size', quantity: qty }],
          },
          merchandiseSubtotal: merchandiseLineTotal,
          shippingTierSubtotal: shippingTierLineTotal,
          customizationsDisplay: splitDisplay,
          artworkReady: currentQuote.payload?.artworkReady === true,
          tempArtworkFiles: currentQuote.payload?.tempArtworkFiles || [],
          artworkFiles: currentQuote.payload?.artworkFiles || [],
          customSizeNote: currentQuote.payload?.customSizeNote || '',
          splitQuote: true,
          splitSizeLabel: s.sizeLabel || 'Selected size',
          customLineTotal: lineTotal,
          customUnitPrice: qty > 0 ? lineTotal / qty : 0,
          splitGroupId,
        };
      });
  };

  const buildBuyNowLines = (entries) =>
    entries.map((options) => ({
      ...product,
      quantity: options.quantity ?? 1,
      options: {
        ...options,
        quotePayload: currentQuote?.payload,
      },
    }));

  const handleAddToCart = () => {
    if (currentQuote) {
      const entries = buildQuoteCartEntries();
      entries.forEach((options) => addToCart(product, options));
    } else {
      addToCart(product, { quantity: 1 });
    }
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const canProceedToPayment = Boolean(
    currentQuote?.summary?.grandTotal != null && currentQuote?.payload,
  );

  const handleSimpleCheckout = () => {
    if (outOfStock) return;
    const qty = Math.max(1, Number(simpleQty || 1));
    clearBuyNowItems();
    saveBuyNowItems([{ ...product, quantity: qty, options: { quantity: qty } }]);
    if (!isAuthenticated) {
      requireLoginForCheckout(router, '/checkout?mode=buyNow');
      return;
    }
    router.push('/checkout?mode=buyNow');
  };

   const handleProceedToPayment = () => {
     if (!canProceedToPayment) return;
     clearBuyNowItems();
     const entries = buildQuoteCartEntries();
     saveBuyNowItems(buildBuyNowLines(entries));
     if (!isAuthenticated) {
       const currentUrl = path + (searchParams.toString() ? '?' + searchParams.toString() : '');
       requireLoginForCheckout(router, currentUrl);
       return;
     }
     router.push('/checkout?mode=buyNow');
   };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb + back */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[#29b6f6] hover:underline font-medium"
          >
            ← Back
          </button>
          <span className="text-gray-300">|</span>
          <Link
            href={product.categorySlug ? `/products?category=${encodeURIComponent(product.categorySlug)}` : '/products'}
            className="hover:text-[#29b6f6]"
          >
            {product.category || 'Products'}
          </Link>
          <span>/</span>
          <span>{product.name}</span>
        </div>

        {/* Product Main */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          {/* Image + Gallery Slider */}
          <div className="flex justify-center items-start bg-gray-100 rounded-lg p-4 md:p-8">
            <div className="w-full max-w-md">
              <div className="relative rounded-lg overflow-hidden bg-white">
                {currentMedia.type === 'video' ? (
                  <video
                    src={currentMedia.url}
                    controls
                    playsInline
                    className="w-full h-auto object-contain"
                  />
                ) : (
                  <img
                    src={currentMedia.url}
                    alt={product.name}
                    className="w-full h-auto object-contain"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (inWishlist) {
                      removeFromWishlist(product.id);
                    } else {
                      addToWishlist(product);
                    }
                  }}
                  className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    inWishlist
                      ? 'bg-red-500 text-white'
                      : 'bg-white/90 text-gray-700 hover:bg-white'
                  }`}
                  title={inWishlist ? 'Remove from Saved' : 'Save product'}
                >
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              </div>

              {media.length > 1 && (
                <div className="mt-4 flex items-center gap-2 overflow-x-auto">
                  {media.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentMediaIndex(idx)}
                      className={`w-16 h-16 rounded-md overflow-hidden border ${
                        idx === currentMediaIndex
                          ? 'border-[#29b6f6]'
                          : 'border-gray-300 hover:border-[#29b6f6]/60'
                      } flex-shrink-0`}
                    >
                      {item.type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-black text-white text-xs font-semibold">
                          VIDEO
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={`${product.name} ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product Info + Customizer */}
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>

            <div className="flex items-center gap-4 mb-6">
              {isSameDayPrintingProduct(product) && <SameDayBadge />}
              <div className="leading-tight">
                {hasPrice && product.oldPrice != null && Number(product.oldPrice) > Number(product.price || 0) && (
                  <div className="text-sm line-through text-red-600">
                    ${Number(product.oldPrice).toFixed(2)}
                  </div>
                )}
                <div className="text-3xl font-bold text-[#29b6f6]">
                  {isMailboxNotaryCategory ? (
                    <>
                      $
                      {Number(
                        product.mailboxPricePerMonth ?? product.price ?? 0,
                      ).toFixed(2)}
                      <span className="text-base text-gray-600 ml-1">/month</span>
                    </>
                  ) : hasPrice ? (
                    <>${(product.price || 0).toFixed(2)}</>
                  ) : (
                    <span className="text-gray-500"></span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-lg text-gray-600 mb-6">{product.description}</p>

            {outOfStock ? (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                This product is currently out of stock.
              </div>
            ) : null}

            {/* Features */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Features</h3>
              <ul className="grid grid-cols-2 gap-2">
                {product.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-700">
                    <span className="text-[#29b6f6]">✓</span> {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Customizer */}
            {isMailboxNotaryCategory ? (
              <MailboxQuoteBuilder
                productId={product.id}
                productName={product.name}
                pricePerMonth={product.mailboxPricePerMonth ?? product.price}
                onQuoteReady={setCurrentQuote}
              />
            ) : !quoteEnabled ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-gray-700">
                    Quantity
                    <div className="mt-1">
                      <input
                        type="number"
                        min={1}
                        value={simpleQty}
                        onChange={(e) => setSimpleQty(Number(e.target.value || 1))}
                        className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="text-xl font-bold text-[#29b6f6]">
                      ${Number(simpleTotal || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={handleSimpleCheckout}
                    disabled={!hasPrice || outOfStock}
                    className="w-full bg-[#0f172a] hover:bg-[#020617] text-white font-semibold py-4 text-lg rounded-lg transition disabled:opacity-60"
                  >
                    Checkout
                  </Button>
                </div>
              </div>
) : (
               <QuoteBuilder
                 productId={product.id}
                 productName={product.name}
                 productCategory={product.category || product.categorySlug || ''}
                 minQuantity={product.minQuantity}
                 maxQuantity={product.maxQuantity}
                 minOrderValue={product.minOrderValue}
                 maxOrderValue={product.maxOrderValue}
                 prefillQuote={quotePrefill}
                 onQuoteReady={setCurrentQuote}
                 weightLb={product.weightLb}
               />
             )}

            {/* Notary pricing chart (separate from mailbox rental) */}
            {isMailboxNotaryCategory && (
              <div className="mt-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <MailboxPricingChart pricePerMonth={product.mailboxPricePerMonth ?? product.price ?? 0} />
                  <NotaryPricingChart />
                </div>
              </div>
            )}

            {quotePrefill?.payload && (
              <p className="mt-6 text-sm text-[#0f172a] bg-sky-50 border border-sky-200 rounded-lg px-4 py-3">
                Your previous customization has been loaded. Review the options below, then add to cart or
                proceed to payment.
              </p>
            )}

            {/* Checkout Actions */}
            <div className="mt-8 space-y-3">
              {canProceedToPayment && (
                <Button
                  className="w-full bg-[#0f172a] hover:bg-[#020617] text-white font-semibold py-4 text-lg rounded-lg transition"
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={outOfStock}
                >
                  Proceed to Payment
                </Button>
              )}
              {canProceedToPayment && (
                <Button
                  onClick={handleAddToCart}
                  className="w-full bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold py-4 text-lg rounded-lg transition"
                  disabled={outOfStock}
                >
                  {addedToCart ? '✓ Added to Cart' : 'Add to Cart'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Same-Day Notice */}
        <div className="mt-12 mb-12">
          <SameDayNotice />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.slice(0, 4).map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          </section>
        )}

        {/* Our Print Process */}
        <OurProcess />
      </div>
    </div>
  );
}
