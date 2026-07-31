'use client';

import { useState, useEffect, useMemo } from 'react';
import { QuoteBuilder } from './QuoteBuilder';
import { SimpleQuoteBuilder } from './SimpleQuoteBuilder';
import { MailboxQuoteBuilder } from './MailboxQuoteBuilder';
import { Button } from '@/components/ui/button';

export function CartEditModal({ item, targetStep, onClose, onSave }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuote, setCurrentQuote] = useState(null);
  
  // Use options.quotePayload if available for prefilling
  const quotePrefill = useMemo(() => {
    return item.options?.quotePayload ? {
      payload: item.options.quotePayload,
      targetStep: targetStep,
      cartOptions: item.options,
      cartItemId: item.cartItemId,
    } : null;
  }, [item, targetStep]);

  useEffect(() => {
    let active = true;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        // Fallback to slug if byId route doesn't exist or isn't set up yet
        if (item.slug) {
            const resSlug = await fetch(`/api/products/${encodeURIComponent(item.slug)}`, { cache: 'no-store' });
            if (resSlug.ok) {
            const dataSlug = await resSlug.json();
            if (active && dataSlug?.product) {
                setProduct(dataSlug.product);
            }
            }
        }
      } catch (err) {
        console.error('Failed to fetch product for modal edit', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProduct();
    return () => { active = false; };
  }, [item.id, item.slug]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
          <div className="text-center py-8">Loading Product Data...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Error</h2>
          <p>Product could not be loaded for editing.</p>
          <div className="mt-4 flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  const isMailboxNotaryCategory =
    product.categorySlug === 'mailbox-rental' ||
    product.categorySlug === 'notary-services' ||
    String(product.category).toLowerCase().includes('mailbox') ||
    String(product.category).toLowerCase().includes('notary');

  // Same logic as QuoteEngine check
  const quoteEnabled = product.allowQuoteCalculation ?? true;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4 sm:p-6 overflow-y-auto backdrop-blur-sm">
      <div className="bg-gray-50 rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col relative overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white z-10 rounded-t-lg shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800">Edit {item.name}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 text-3xl leading-none transition-colors"
            title="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-0 sm:p-6 overflow-y-auto flex-1">
          <div className="bg-white rounded-lg shadow-sm sm:border border-gray-100">
          {isMailboxNotaryCategory ? (
            <MailboxQuoteBuilder
              productId={product.id}
              productName={product.name}
              pricePerMonth={product.mailboxPricePerMonth ?? product.price}
              onQuoteReady={setCurrentQuote}
              onAddToCart={() => onSave(currentQuote)}
              isModal={true}
              prefillQuote={quotePrefill}
            />
          ) : !quoteEnabled ? (
            <SimpleQuoteBuilder
              productId={product.id}
              productName={product.name}
              minQuantity={product.minQuantity}
              maxQuantity={product.maxQuantity}
              minOrderValue={product.minOrderValue}
              maxOrderValue={product.maxOrderValue}
              prefillQuote={quotePrefill}
              onQuoteReady={setCurrentQuote}
              weightLb={product.weightLb}
              packageWidthIn={product.packageWidthIn}
              localDeliveryEligible={product.localDeliveryEligible}
              onAddToCart={() => onSave(currentQuote)}
              isModal={true}
            />
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
              packageWidthIn={product.packageWidthIn}
              localDeliveryEligible={product.localDeliveryEligible}
              onAddToCart={() => onSave(currentQuote)}
              isModal={true}
            />
          )}
          </div>
        </div>

        {/* Footer for Simple and Mailbox builders, which don't have their own Add To Cart buttons */}
        {(isMailboxNotaryCategory || !quoteEnabled) && (
          <div className="p-4 border-t bg-gray-50 flex justify-end">
            <Button
              onClick={() => onSave(currentQuote)}
              disabled={!currentQuote}
              className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
