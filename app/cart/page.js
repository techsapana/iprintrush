'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveQuotePrefill } from '../lib/quotePrefill';
import { Button } from '@/components/ui/button';
import { useCart } from '../hooks/useCart';
import { useSameDayEligibility } from '../hooks/useSameDayEligibility';

import { useAuth } from '../hooks/useAuth';
import { clearBuyNowItems, requireLoginForCheckout, computeLineTotal } from '../lib/checkoutFlow';
import { buildQuoteCartEntries } from '../lib/cartHelpers';

import { CartEditModal } from '../components/product/CartEditModal';
function CartQuantityControl({ initialQuantity, onQuantityChange }) {
  const [value, setValue] = useState(initialQuantity);
  
  useEffect(() => { setValue(initialQuantity); }, [initialQuantity]);

  const handleBlur = () => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setValue(initialQuantity);
    } else if (parsed !== initialQuantity) {
      onQuantityChange(parsed);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleBlur();
  };

  const handleAdjust = (delta) => {
    const parsed = parseInt(value, 10) || 1;
    const newValue = Math.max(1, parsed + delta);
    setValue(newValue);
    onQuantityChange(newValue);
  };

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => handleAdjust(-1)}
        className="px-3 py-1 border border-gray-300 rounded-l hover:bg-gray-100 bg-white"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-16 px-2 py-1 border-t border-b border-gray-300 text-center focus:outline-none appearance-none"
        style={{ MozAppearance: 'textfield' }}
      />
      <button
        type="button"
        onClick={() => handleAdjust(1)}
        className="px-3 py-1 border border-gray-300 rounded-r hover:bg-gray-100 bg-white"
      >
        +
      </button>
    </div>
  );
}

function EditDropdown({ item, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-right" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-[#29b6f6] hover:text-[#1e8fc4] font-medium transition-colors"
      >
        Edit Item
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onSelect(item, null);
              }}
            >
              Start from Beginning
            </button>
            <div className="border-t border-gray-100"></div>
            {Object.keys(item.options?.customizationsDisplay || {}).map((key) => (
              <button
                key={key}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onSelect(item, key);
                }}
              >
                Edit {key}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateQuoteQuantity,
    updateSplitQuoteQuantity,
    getTotal,
    clearCart,
  } = useCart();
  const eligibility = useSameDayEligibility();

  const [editingItem, setEditingItem] = useState(null);
  const [taxRatePercent, setTaxRatePercent] = useState(0);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [oversizeConsent, setOversizeConsent] = useState(false);

  const seenIds = useRef(new Set());

  useEffect(() => {
    setSelectedItemIds(prev => {
      let changed = false;
      const newSelected = [...prev];
      
      items.forEach(item => {
        if (!seenIds.current.has(item.cartItemId)) {
          seenIds.current.add(item.cartItemId);
          newSelected.push(item.cartItemId);
          changed = true;
        }
      });
      
      const currentCartIds = new Set(items.map(i => i.cartItemId));
      const filtered = newSelected.filter(id => currentCartIds.has(id));
      
      if (filtered.length !== newSelected.length) changed = true;
      
      return changed ? filtered : prev;
    });
  }, [items]);

  const toggleSelection = (cartItemId) => {
    setSelectedItemIds(prev => 
      prev.includes(cartItemId)
        ? prev.filter(id => id !== cartItemId)
        : [...prev, cartItemId]
    );
  };

  const toggleAll = () => {
    if (selectedItemIds.length === items.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map(item => item.cartItemId));
    }
  };

  useEffect(() => {
    fetch('/api/site-settings/announcement')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.taxRatePercent != null) {
          setTaxRatePercent(Number(data.taxRatePercent));
        }
      })
      .catch(() => {});
  }, []);

  const handleEditItem = (item, targetStepTitle = null) => {
    const payload = item.options?.quotePayload;
    if (!payload) {
      window.alert('This cart item cannot be edited (no saved customization).');
      return;
    }
    setEditingItem({ item, targetStepTitle });
  };


  const handleProceedToCheckout = () => {
    clearBuyNowItems();
    if (selectedItemIds.length === 0) {
      alert('Please select at least one item to proceed to checkout.');
      return;
    }

    const hasOversizedItems = items.some((item) => item.options?.quoteSummary?.shippingReviewRequired || item.options?.shippingReviewRequired);
    if (hasOversizedItems && !oversizeConsent) {
      alert('Please agree to the Oversize Shipping & handling fee to proceed.');
      return;
    }
    
    // Save selected item ids for checkout page
    localStorage.setItem('checkoutItems', JSON.stringify(selectedItemIds));

    if (!isAuthenticated) {
      requireLoginForCheckout(router, '/checkout');
      return;
    }
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Your Shopping Cart
            </h1>
            <p className="text-gray-600 text-lg mb-8">Your cart is empty</p>
            <Link href="/products">
              <Button className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals ONLY for selected items
  const selectedItems = items.filter(item => selectedItemIds.includes(item.cartItemId));
  
  const subtotal = selectedItems.reduce((acc, item) => {
    return acc + (computeLineTotal(item) || 0);
  }, 0);

  const subtotalCents = Math.round(subtotal * 100);
  
  const taxRatePercentNum = Number(taxRatePercent) || 0;
  const taxRate = taxRatePercentNum / 100;
  const taxCents = Math.round(subtotalCents * taxRate);
  
  const totalCents = subtotalCents + taxCents;

  const tax = taxCents / 100;
  const finalTotal = totalCents / 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedItemIds.length === items.length && items.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#29b6f6] focus:ring-[#29b6f6]"
                  />
                  Select All
                </label>
                <span className="text-sm text-gray-500">{items.length} items</span>
              </div>
              
              <div className="space-y-6">
                {items.map((item, idx) => {
                  const isQuoteItem =
                    item.options?.quotePayload ||
                    item.options?.splitQuote === true ||
                    item.options?.customLineTotal != null;

                  const isApparel = item.options?.quotePayload?.mode === 'apparel' || item.options?.quotePayload?.mode === 'custom_apparel';
                  const hasMultipleSizes = (item.options?.quoteSummary?.sizeBreakdown?.length || 0) > 1;

                  const canEditQuoteQuantity =
                    !!item.options?.quotePayload &&
                    item.options?.splitQuote !== true &&
                    !hasMultipleSizes;
                    
                  const isSelected = selectedItemIds.includes(item.cartItemId);

                  return (
                    <div
                      key={item.cartItemId || `${item.id}-${idx}`}
                      className={`flex gap-4 sm:gap-6 pb-6 border-b border-gray-200 last:pb-0 last:border-b-0 transition-opacity ${!isSelected ? 'opacity-50' : ''}`}
                    >
                      {/* Checkbox */}
                      <div className="flex items-center pt-8">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(item.cartItemId)}
                          className="w-5 h-5 rounded border-gray-300 text-[#29b6f6] focus:ring-[#29b6f6] cursor-pointer"
                        />
                      </div>

                      {/* Product Image */}
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 cursor-pointer" onClick={() => toggleSelection(item.cartItemId)}>
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {item.name}
                          </h3>
                          {/* Customizations Display (mirror quote summary) */}
                          {item.options?.customizationsDisplay &&
                            Object.keys(item.options.customizationsDisplay)
                              .length > 0 && (
                              <div className="mt-2 text-xs text-gray-700 space-y-0.5">
                                {Object.entries(
                                  item.options.customizationsDisplay,
                                )
                                  .filter(
                                    ([k]) => !/size\s*breakdown/i.test(String(k)),
                                  )
                                  .map(([k, v]) =>
                                      v ? (
                                        <div key={k}>
                                          <span className="font-semibold">
                                            {k}:
                                          </span>{' '}
                                          {v}
                                        </div>
                                      ) : null,
                                  )}
                              </div>
                            )}
                          {item.options?.deliveryMethod && (
                            <p className="text-sm text-gray-600 mt-1">
                              Delivery:{' '}
                              {item.options.deliveryMethod === 'shipping'
                                ? 'Shipping'
                                : 'Pickup'}
                            </p>
                          )}

                          {/* Quantity Control */}
                          <div
                            className="flex items-center gap-2 mt-4"
                            title={
                              isQuoteItem && !canEditQuoteQuantity
                                ? 'Edit product to change quantity'
                                : undefined
                            }
                          >
                            {!isQuoteItem ? (
                              <CartQuantityControl 
                                initialQuantity={item.quantity} 
                                onQuantityChange={(newQty) => updateQuantity(item.id, newQty, item.options, item.cartItemId)} 
                              />
                            ) : canEditQuoteQuantity ? (
                              <CartQuantityControl 
                                initialQuantity={item.quantity} 
                                onQuantityChange={(newQty) => updateQuoteQuantity(item.id, newQty, item.options, item.cartItemId)} 
                              />
                            ) : item.options?.splitQuote === true ? (
                              <CartQuantityControl
                                initialQuantity={item.quantity}
                                onQuantityChange={(newQty) => updateSplitQuoteQuantity(item.cartItemId, newQty)}
                              />
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-4 py-1 border border-gray-300 rounded bg-gray-50">
                                  {item.quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleEditItem(item, null)}
                                  className="text-xs text-[#29b6f6] hover:text-[#1e8fc4] underline ml-2 font-medium"
                                  title="Edit item to change quantities"
                                >
                                  Edit quantities
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-left sm:text-right mt-4 sm:mt-0 flex flex-row sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto border-t sm:border-0 border-gray-100 pt-4 sm:pt-0">
                          {(() => {
                            const lineTotal = computeLineTotal(item);
                            return (
                              <p className="text-xl font-bold text-[#29b6f6]">
                                ${(lineTotal || 0).toFixed(2)}
                              </p>
                            );
                          })()}
                          <section className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-2 mt-0 sm:mt-4">
                            {item.options?.quotePayload ? (
                              <EditDropdown item={item} onSelect={handleEditItem} />
                            ) : null}
                            <button
                              onClick={() =>
                                removeFromCart(item.id, item.options, item.cartItemId)
                              }
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              Remove
                            </button>
                          </section>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cart Actions */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between">
                <Link href="/products">
                  <button className="text-[#29b6f6] hover:underline font-medium">
                    Continue Shopping
                  </button>
                </Link>
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:underline font-medium"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span>${(subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Tax (est.):</span>
                  <span>${(tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total:</span>
                  <span className="text-[#29b6f6]">
                    ${(finalTotal || 0).toFixed(2)}
                  </span>
                </div>
              </div>

{/* Same-Day Status */}
              <div className="mb-6">

              </div>

              {/* Shipping Review Warning */}
              {items.some((item) => item.options?.quoteSummary?.shippingDecision?.oversized || item.options?.quoteSummary?.shippingDecision?.status === 'review_required') && (
                <div className="mb-6 space-y-4">
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                    <span className="font-semibold">Shipping Review Required</span>
                    <p className="text-sm mt-1">Your order contains oversized items. Final shipping cost will be determined after manual review.</p>
                  </div>
                  <label className="flex items-start gap-2 text-sm font-medium text-gray-700 cursor-pointer bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                    <input 
                      type="checkbox"
                      checked={oversizeConsent}
                      onChange={(e) => setOversizeConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#29b6f6] focus:ring-[#29b6f6]"
                    />
                    <span>I agree to pay this Over size Shipping & handling fee</span>
                  </label>
                </div>
              )}

              {/* Checkout Button */}
              <Button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold py-3 text-base"
              >
                Proceed to Payment
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Secure checkout with SSL encryption
              </p>
            </div>
          </div>
        </div>
      </div>

      {editingItem && (
        <CartEditModal
          item={editingItem.item}
          targetStep={editingItem.targetStepTitle}
          onClose={() => setEditingItem(null)}
          onSave={(currentQuote) => {
            if (currentQuote && currentQuote.summary) {
              // The original item could be a single item or part of a split group
              const originalItem = editingItem.item;
              const splitGroupId = originalItem.options?.splitGroupId;
              
              // Remove the old item(s). If it was a split group, removeFromCart automatically removes all in the group.
              removeFromCart(originalItem.id, originalItem.options, originalItem.cartItemId);
              
              // Add the new entries
              const entries = buildQuoteCartEntries(currentQuote, { id: originalItem.id });
              entries.forEach(options => {
                addToCart({ id: originalItem.id, name: originalItem.name, image: originalItem.image, slug: originalItem.slug }, options);
              });
            }
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}
