'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveQuotePrefill } from '../lib/quotePrefill';
import { Button } from '@/components/ui/button';
import { useCart } from '../hooks/useCart';
import { useSameDayEligibility } from '../hooks/useSameDayEligibility';
import { SameDayNotice } from '../components/shared/SameDayNotice';
import { useAuth } from '../hooks/useAuth';
import { clearBuyNowItems, requireLoginForCheckout } from '../lib/checkoutFlow';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { items, removeFromCart, updateQuantity, getTotal, clearCart } =
    useCart();
  const eligibility = useSameDayEligibility();

  const handleEditItem = (item) => {
    const payload = item.options?.quotePayload;
    if (!payload) {
      window.alert('This cart item cannot be edited (no saved customization).');
      return;
    }
    saveQuotePrefill({
      productId: item.id,
      payload,
      summary: item.options?.quoteSummary,
      customizationsDisplay: item.options?.customizationsDisplay || {},
      cartOptions: item.options,
    });
    const slug = item.slug;
    if (slug) {
      router.push(`/products/${encodeURIComponent(slug)}?edit=1`);
      return;
    }
    router.push(`/products?editProduct=${encodeURIComponent(item.id)}`);
  };

  const handleProceedToCheckout = () => {
    clearBuyNowItems();
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

  const total = getTotal();
  const subtotal = total;
  const tax = subtotal * 0.1; // 10% tax estimate
  const finalTotal = subtotal + tax;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="space-y-6">
                {items.map((item, idx) => {
                  const isQuoteItem =
                    item.options?.quotePayload ||
                    item.options?.splitQuote === true ||
                    item.options?.customLineTotal != null;

                  return (
                    <div
                      key={idx}
                      className="flex gap-6 pb-6 border-b border-gray-200 last:pb-0 last:border-b-0"
                    >
                      {/* Product Image */}
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>

                      {/* Product Details */}
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
                            isQuoteItem
                              ? 'Edit product to change quantity'
                              : undefined
                          }
                        >
                          {!isQuoteItem ? (
                            <>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    Math.max(1, item.quantity - 1),
                                    item.options,
                                  )
                                }
                                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                              >
                                −
                              </button>
                              <span className="px-4 py-1 border border-gray-300 rounded">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    item.quantity + 1,
                                    item.options,
                                  )
                                }
                                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-4 py-1 border border-gray-300 rounded bg-gray-50">
                                {item.quantity}
                              </span>

                              <span
                                className="text-xs text-gray-500"
                                title="Edit product to change quantity"
                              >
                                Edit product to change quantity
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        {(() => {
                          const lineTotal =
                            item.options?.customLineTotal != null
                              ? Number(item.options.customLineTotal)
                              : item.options?.quoteSummary?.grandTotal != null
                                ? Number(item.options.quoteSummary.grandTotal)
                                : Number(item.price || 0) *
                                  Number(item.quantity || 1);
                          return (
                            <p className="text-xl font-bold text-[#29b6f6]">
                              ${(lineTotal || 0).toFixed(2)}
                            </p>
                          );
                        })()}
                        <section className="flex flex-col items-end gap-2 mt-4">
                          {item.options?.quotePayload ? (
                            <button
                              type="button"
                              onClick={() => handleEditItem(item)}
                              className="text-sm text-[#29b6f6] hover:text-[#1e8fc4] font-medium"
                            >
                              Edit
                            </button>
                          ) : null}
                          <button
                            onClick={() =>
                              removeFromCart(item.id, item.options)
                            }
                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            Remove
                          </button>
                        </section>
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
                <SameDayNotice />
              </div>

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
    </div>
  );
}
