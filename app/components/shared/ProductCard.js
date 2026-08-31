'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { SameDayBadge } from './SameDayBadge';
import { isSameDayPrintingProduct } from '../../lib/siteConstants';
import { useWishlist } from '../../hooks/useWishlist';

export function ProductCard({ product, onAddToCart, compact = false, className = '' }) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const inWishlist = isInWishlist(product.id);

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const price = Number(product?.price || 0);
  const oldPrice = product?.oldPrice != null ? Number(product.oldPrice) : null;
  const showOldPrice = oldPrice != null && !Number.isNaN(oldPrice) && oldPrice > price;
  const hasPrice = price > 0 && !Number.isNaN(price); // Only show price if it's greater than 0
  const outOfStock = product?.outOfStock === true;

  const isMailbox = product?.categorySlug === 'mailbox-notary' || product?.category === 'Mailbox & Notary';
  const isNewProduct = (() => {
    if (!product?.createdAt) return false;
    const created = new Date(product.createdAt).getTime();
    if (!Number.isFinite(created)) return false;
    const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
    return ageDays >= 0 && ageDays <= 5;
  })();

  return (
    <Card
      className={`flex flex-col h-full rounded-2xl border border-gray-200 bg-white hover:shadow-xl hover:-translate-y-1 transition-all ${className}`}
    >
      <Link href={`/products/${product.slug}`} className="flex flex-col flex-1">
        <CardContent
          className={`pt-4 flex flex-col flex-1 ${compact ? 'pb-2' : 'pb-4'} cursor-pointer`}
        >
          <div className={`relative mb-4 overflow-hidden rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center ${compact ? 'h-48 md:h-52' : 'h-56 md:h-64'}`}>
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 z-0"
                onError={(e) => { 
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement.insertAdjacentHTML('beforeend', '<div class="z-0 text-gray-400 text-sm font-medium">Image Not Available</div>');
                }}
              />
            ) : (
              <div className="text-gray-400 text-sm font-medium z-0">
                No Image
              </div>
            )}
            
            {isSameDayPrintingProduct(product) && (
              <div className="absolute bottom-2 left-2 z-10">
                <SameDayBadge />
              </div>
            )}
            {isNewProduct && (
              <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold shadow-sm">
                New
              </div>
            )}
            <button
              onClick={handleWishlistToggle}
              className={`absolute top-2 right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all ${
                inWishlist
                  ? 'bg-red-500 text-white'
                  : 'bg-white/95 text-gray-600 hover:bg-gray-50'
              }`}
              title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          </div>

          <h3
            className={`font-semibold text-gray-900 leading-tight hover:text-[#29b6f6] transition-colors line-clamp-2 ${
              compact ? 'text-sm' : 'text-lg'
            }`}
          >
            {product.name}
          </h3>

          <p
            className={`text-gray-600 mt-2 line-clamp-2 ${
              compact ? 'text-xs' : 'text-sm'
            }`}
          >
            {product.description}
          </p>

          <div className="pt-4 flex flex-wrap gap-1.5 mt-auto">
            {(product.features || []).slice(0, 2).map((feature, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium tracking-wide bg-[rgba(41,182,246,0.12)] text-[#1a7ba3] px-2 py-1 rounded-md"
              >
                {feature}
              </span>
            ))}
          </div>
        </CardContent>
      </Link>

      <CardFooter className="flex flex-row items-end justify-between gap-2 px-4 pb-4 pt-2 border-t border-gray-50 mt-0">
        <div className="leading-tight">
          {hasPrice ? (
            <>
              <div className={`text-[10px] font-medium uppercase tracking-wide text-gray-400 ${compact ? '' : 'mb-1'}`}>
                Starting price
              </div>
              <div className={`font-bold text-[#29b6f6] flex flex-col sm:flex-row items-start sm:items-baseline sm:gap-x-2 ${compact ? 'text-base' : 'text-xl'}`}>
                <span>
                  ${price.toFixed(2)}
                  {isMailbox && (
                    <span className="ml-1 text-xs text-gray-500 font-normal">/mo</span>
                  )}
                </span>
                {showOldPrice && (
                  <span className="line-through text-red-500/70 text-xs sm:text-sm font-medium mt-0.5 sm:mt-0">${oldPrice.toFixed(2)}</span>
                )}
              </div>
            </>
          ) : (
            <div className={`font-semibold text-gray-500 ${compact ? 'text-sm' : 'text-base'}`}>
            </div>
          )}
        </div>
        <Link href={`/products/${product.slug}`} className="flex-shrink-0 mt-auto">
          <Button
            size={compact ? "sm" : "default"}
            disabled={outOfStock}
            className={`text-white font-semibold rounded-lg shadow-sm ${outOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#29b6f6] hover:bg-[#1e8fc4] hover:shadow'}`}
          >
            {outOfStock ? 'Out of stock' : 'Buy Now'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
