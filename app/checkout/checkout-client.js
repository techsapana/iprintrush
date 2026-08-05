'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';

import { ShippingSelector } from '../components/shared/ShippingSelector';
import { clearAllQuoteDrafts } from '../lib/quoteDraft';
import {
  readBuyNowItems,
  clearBuyNowItems,
  computeItemsSubtotal,
  computeItemsMerchandiseSubtotal,
  computeLineTotal,
  requireLoginForCheckout,
} from '../lib/checkoutFlow';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;


const inputClass =
  'w-full border border-gray-300 rounded-md px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#29b6f6]';

function StripePaymentForm({ clientSecret, amount, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    setMessage(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });
    if (error) {
      setMessage(error.message);
    }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-[#29b6f6] flex items-center justify-center text-white font-bold text-sm">3</div>
        <div>
          <div className="font-semibold text-gray-900 text-base">Secure Payment</div>
          <div className="text-xs text-gray-500">256-bit SSL encrypted checkout</div>
        </div>
        <div className="ml-auto flex items-center gap-1 text-green-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <span className="text-xs font-medium">Secured</span>
        </div>
      </div>

      {/* Amount due */}
      <div className="bg-gradient-to-r from-[#29b6f6] to-[#0288d1] rounded-xl p-4 text-white flex justify-between items-center shadow-md">
        <div>
          <div className="text-xs opacity-80 uppercase tracking-wider">Amount Due</div>
          <div className="text-3xl font-bold">${amount.toFixed(2)}</div>
        </div>
        <div className="opacity-70">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
        </div>
      </div>

      {/* Payment form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            <span className="text-sm font-medium text-gray-700">Card Details</span>
            {/* Card brand icons */}
            <div className="ml-auto flex gap-1">
              {['VISA', 'MC', 'AMEX'].map(b => (
                <span key={b} className="text-[9px] font-bold border border-gray-300 rounded px-1 py-0.5 text-gray-500 bg-white">{b}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5">
          <PaymentElement options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
          }} />

          {message && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-sm text-red-700">{message}</span>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </button>
            <button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#29b6f6] to-[#0288d1] hover:from-[#1e8fc4] hover:to-[#0277bd] text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed text-base"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Processing Payment...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Pay ${amount.toFixed(2)} Securely
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Trust badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 py-2">
        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          SSL Secured
        </div>
        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          Powered by Stripe
        </div>
        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Safe & Encrypted
        </div>
      </div>
    </div>
  );
}


const fileModeButtonClass = (active) =>
  active
    ? 'bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold'
    : 'border-gray-300 text-gray-700 hover:bg-gray-50';

export default function CheckoutClient() {
  console.log("[CHECKOUT-LIFECYCLE][L1] CheckoutClient invoked");
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBuyNow = searchParams.get('mode') === 'buyNow';
  const { items: cartItems } = useCart();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setFormData((prev) => ({ ...prev, email: user.email }));
    }
  }, [isAuthenticated, user]);

  const [sessionReady, setSessionReady] = useState(false);
  const [buyNowItems, setBuyNowItems] = useState([]);
  const [taxRatePercent, setTaxRatePercent] = useState(0);
  const [autoDiscounts, setAutoDiscounts] = useState([]);
  const [couponLookup, setCouponLookup] = useState({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
    deliveryMethod: 'pickup',
    shippingAddress: '',
    shippingApt: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    billingAddress: '',
    billingApt: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    sameAsShipping: true,
  });
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
const [oversizedDetails, setOversizedDetails] = useState(null);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [zipCheckStatus, setZipCheckStatus] = useState('idle');
  const [zipCheckResult, setZipCheckResult] = useState(null);
  const [selectedCartIds, setSelectedCartIds] = useState([]);
  const [clientSecret, setClientSecret] = useState('');

  const checkoutItems = useMemo(() => {
    if (isBuyNow) {
      return Array.isArray(buyNowItems) ? buyNowItems : [];
    }
    
    // Only include cart items that were selected in the cart page
    if (selectedCartIds.length > 0) {
      return cartItems.filter(item => selectedCartIds.includes(item.cartItemId));
    }
    
    return Array.isArray(cartItems) ? cartItems : [];
  }, [isBuyNow, buyNowItems, cartItems, selectedCartIds]);

  const getItemSizeLabel = useCallback((item) => {
    const customizations = item?.options?.customizationsDisplay || {};
    const directSize =
      customizations.Size ||
      customizations.size ||
      customizations['Print Size'] ||
      customizations.Dimensions ||
      null;
    if (directSize) return String(directSize);
    const breakdown = item?.options?.quoteSummary?.sizeBreakdown;
    if (Array.isArray(breakdown) && breakdown.length > 0) {
      const labels = breakdown.map((b) => `${b.sizeLabel}: ${b.quantity}`).filter(Boolean);
      return labels.length > 0 ? labels.join(', ') : null;
    }
    return null;
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMethodSelect = (methodType, options) => {
    setSelectedMethod(methodType);
    if (!options?.preserveZipVerification) {
      setZipCheckStatus('idle');
      setZipCheckResult(null);
    }
    setFormData((prev) => ({
      ...prev,
      shippingZip: options?.preserveZipVerification ? prev.shippingZip : '',
      deliveryMethod: methodType === 'pickup' ? 'pickup' : 'shipping',
    }));
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/site-settings/announcement', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        setTaxRatePercent(Number(json.taxRatePercent || 0));
      } catch {
        // ignore
      }
    };
    loadSettings();
  }, []);

  // Fetch auto-discount eligibility when email changes
  useEffect(() => {
    const checkAutoDiscount = async () => {
      if (!formData.email) {
        setAutoDiscounts([]);
        return;
      }
      try {
        const res = await fetch('/api/checkout/auto-discount', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });
        const data = await res.json();
        if (data.eligible && data.discounts && data.discounts.length > 0) {
          setAutoDiscounts(data.discounts);
        } else {
          setAutoDiscounts([]);
        }
      } catch (err) {
        setAutoDiscounts([]);
      }
    };

    const timer = setTimeout(() => {
      checkAutoDiscount();
    }, 500); // debounce email input

    return () => clearTimeout(timer);
  }, [formData.email]);

  useEffect(() => {
    if (isBuyNow) {
      setBuyNowItems(readBuyNowItems());
    } else {
      const stored = localStorage.getItem('checkoutItems');
      if (stored) {
        try {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids)) {
            setSelectedCartIds(ids);
          }
        } catch(e){}
      }
    }
    setSessionReady(true);
  }, [isBuyNow]);

  useEffect(() => {
    const loadCoupons = async () => {
      try {
        const productIds = Array.from(new Set(checkoutItems.map((i) => i.id).filter(Boolean)));
        if (productIds.length === 0) {
          setCouponLookup({});
          return;
        }
        const res = await fetch('/api/coupons/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const map = {};
        for (const c of data.coupons || []) {
          if (c?.code && Number(c.discountPercent) > 0 && c.isActive !== false) {
            map[String(c.code).toUpperCase()] = Number(c.discountPercent);
          }
        }
        setCouponLookup(map);
      } catch {
        setCouponLookup({});
      }
    };

   loadCoupons();
    }, [checkoutItems]);

useEffect(() => {
    if (!sessionReady || checkoutItems.length === 0) return;
    const fetchMethods = async () => {
      try {
        const res = await fetch('/api/shipping/methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: checkoutItems.map((i) => ({
              id: i.id,
              quantity: i.quantity,
              quotePayload: i.options?.quotePayload || null,
              shippingTierSubtotal:
                i.options?.quoteSummary?.shippingTierSubtotal ??
                i.options?.shippingTierSubtotal ??
                null,
              product: {
                weight_lb: Number(i.weightLb ?? i.product?.weightLb ?? 0),
                package_width_in: Number(i.packageWidthIn ?? i.product?.packageWidthIn ?? 0),
                localDeliveryEligible: i.product?.localDeliveryEligible ?? true,
              },
            })),
            shippingAddress: {},
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data?.success && Array.isArray(data.methods)) {
          setShippingMethods(data.methods);
          if (data.oversizedDetails) {
            setOversizedDetails(data.oversizedDetails);
          }
          if (data.methods.some((m) => m.type === 'pickup')) {
            setSelectedMethod('pickup');
          }
        }
      } catch {
        // ignore
      } finally {
      }
    };
    fetchMethods();
  }, [sessionReady, checkoutItems]);

  const handleZipCheck = async (zip) => {
    if (!zip || zip.length !== 5) {
      setPayError('Please enter a valid 5-digit ZIP code.');
      return;
    }
    setZipCheckStatus('checking');
    setZipCheckResult(null);
    try {
      const res = await fetch('/api/shipping/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: checkoutItems.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            quotePayload: i.options?.quotePayload || null,
            shippingTierSubtotal:
              i.options?.quoteSummary?.shippingTierSubtotal ??
              i.options?.shippingTierSubtotal ??
              null,
            product: {
              weight_lb: Number(i.weightLb ?? i.product?.weightLb ?? 0),
              package_width_in: Number(i.packageWidthIn ?? i.product?.packageWidthIn ?? 0),
              localDeliveryEligible: i.product?.localDeliveryEligible ?? true,
            },
          })),
          shippingAddress: { zip },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success && Array.isArray(data.methods)) {
        setShippingMethods(data.methods);
        if (data.oversizedDetails) {
          setOversizedDetails(data.oversizedDetails);
        } else {
          setOversizedDetails(null);
        }
        const hasLocal = data.methods.some((m) => m.type === 'local_delivery');
        const localDeliveryAvailable = data.methods.some(
          (m) => m.type === 'local_delivery' && m.available !== false
        );
        console.log(
          "[ZIP VERIFY]",
          {
            backendMethods: data.methods,
            localDeliveryMethod: data.methods.find((m) => m.type === "local_delivery"),
            localDeliveryAvailable,
            zipCheckStatusBeforeSet: zipCheckStatus,
            zipCheckResultBeforeSet: zipCheckResult,
          }
        );
        setZipCheckStatus('success');
        console.log(
          "[SET ZIP RESULT]",
          {
            available: localDeliveryAvailable,
            cost: data.methods.find((m) => m.type === "local_delivery")?.cost || 0,
            deliveryWindow: data.methods.find((m) => m.type === "local_delivery")?.deliveryWindow || null,
          }
        );
        setZipCheckResult({
          available: localDeliveryAvailable,
          cost: data.methods.find((m) => m.type === 'local_delivery')?.cost || 0,
          deliveryWindow: data.methods.find((m) => m.type === 'local_delivery')?.deliveryWindow || null,
        });
        if (hasLocal) {
          setFormData((prev) => ({ ...prev, shippingZip: zip }));
        }
      } else {
        setZipCheckStatus('error');
        setZipCheckResult(null);
        setPayError('Unable to verify ZIP code. Please try again.');
      }
    } catch {
      setZipCheckStatus('error');
      setZipCheckResult(null);
      setPayError('Unable to verify ZIP code. Please try again.');
    }
  };

  useEffect(() => {
    if (
      shippingMethods.length > 0 &&
      selectedMethod !== null &&
      !shippingMethods.some((m) => m.type === selectedMethod) &&
      shippingMethods.some((m) => m.type === 'pickup')
    ) {
      setSelectedMethod('pickup');
      setFormData((prev) => ({ ...prev, deliveryMethod: 'pickup' }));
    }
  }, [shippingMethods, selectedMethod]);

  useEffect(() => {
    if (
      shippingMethods.length > 0 &&
      selectedMethod === null &&
      shippingMethods.some((m) => m.type === 'pickup')
    ) {
      setSelectedMethod('pickup');
      setFormData((prev) => ({ ...prev, deliveryMethod: 'pickup' }));
    }
  }, [shippingMethods, selectedMethod]);

const handleApplyCoupon = (e) => {
    e.preventDefault();
    const code = (couponCode || '').trim().toUpperCase();
    if (!code) {
      setAppliedCoupon('');
      setCouponMessage('');
      return;
    }
    if (!couponLookup[code]) {
      setAppliedCoupon('');
      setCouponMessage('Coupon not recognized. Please check the code.');
      return;
    }
    setAppliedCoupon(code);
    setCouponMessage(`Coupon "${code}" applied.`);
  };

  const handleContinueToPayment = async (e) => {
    e.preventDefault();
    setPayError('');
    if (!isAuthenticated) {
      requireLoginForCheckout(router, isBuyNow ? '/checkout?mode=buyNow' : '/checkout');
      return;
    }
    const zipRegex = /^\d{5}$/;
    if (!selectedMethod) {
      setPayError('Please select a shipping method.');
      return;
    }
    if (selectedMethod === 'standard_shipping') {
      if (!formData.shippingAddress || !formData.shippingCity || !formData.shippingState || !formData.shippingZip) {
        setPayError('Please complete the shipping address (street, city, state, and ZIP).');
        return;
      }
      if (!zipRegex.test(String(formData.shippingZip || '').trim())) {
        setPayError('Shipping ZIP code must be exactly 5 digits.');
        return;
      }
    }
    if (selectedMethod === 'local_delivery') {
      if (zipCheckStatus !== 'success' || !zipCheckResult?.available) {
        setPayError('Please verify your ZIP code is eligible for local delivery.');
        return;
      }
      if (!formData.shippingAddress || !formData.shippingCity || !formData.shippingState) {
        setPayError('Please complete the shipping address (street, city, and state).');
        return;
      }
    }
    if (
      selectedMethod === 'review_required' &&
      (!formData.shippingAddress.trim() || !formData.shippingCity.trim() || !formData.shippingZip.trim())
    ) {
      setPayError('Please enter a complete shipping address for shipping review.');
      return;
    }
    
    // We can't access finalTotal directly from state because it's calculated on render,
    // so we re-calculate or just rely on the form submit triggering AFTER render.
    // In React, variables calculated in the component body are captured in the closure of this function!
    // But wait, to be perfectly safe we can calculate them again or pass them.
    // We will just let the backend recalculate? No, our backend takes the finalized totals.
    
    // It's safe to use the closure variables because they are updated on every render.
    
    // Verify billing address if needed
    if ((!needsShippingAddress || !formData.sameAsShipping) && (!formData.billingAddress || !formData.billingCity || !formData.billingState || !formData.billingZip)) {
      setPayError('Please complete the billing address.');
      return;
    }

    setIsPaying(true);
    try {
      // Prepare final form data
      const finalFormData = { ...formData };
      if (needsShippingAddress && formData.sameAsShipping) {
        finalFormData.billingAddress = formData.shippingAddress;
        finalFormData.billingApt = formData.shippingApt;
        finalFormData.billingCity = formData.shippingCity;
        finalFormData.billingState = formData.shippingState;
        finalFormData.billingZip = formData.shippingZip;
      }
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: checkoutItems.map((i) => {
            const itemTotal = computeLineTotal(i);
            return {
              id: i.id,
              name: i.name || 'Custom Product',
              price: itemTotal / Math.max(1, i.quantity || 1),
              quantity: i.quantity,
              options: i.options,
            };
          }),
          formData: finalFormData,
          shippingMethod: selectedMethod,
          shippingAmount,
          taxAmount,
          discountAmount: discount,
          finalTotal,
          couponCode: isAutoDiscountApplied ? (bestAutoDiscountConfig?.description || 'Auto Discount') : (appliedCoupon || undefined),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Payment initialization failed');
      if (!data?.clientSecret) throw new Error('Missing client secret');
      
      setClientSecret(data.clientSecret);
      setIsPaying(false);
    } catch (err) {
      setPayError(err?.message || 'Payment initialization failed');
      setIsPaying(false);
    }
  };

  console.log("[CHECKOUT-LIFECYCLE][L2]", {
    sessionReady,
    checkoutItemsCount: checkoutItems.length,
    isBuyNow,
    cartItemsCount: cartItems?.length,
    isAuthenticated
  });
  const subtotal = computeItemsMerchandiseSubtotal(checkoutItems);
  
  const subtotalCents = Math.round((subtotal || 0) * 100);
  
  const manualDiscountCents = appliedCoupon
    ? Math.round(subtotalCents * ((couponLookup[appliedCoupon] || 0) / 100))
    : 0;

  let bestAutoDiscountCents = 0;
  let bestAutoDiscountConfig = null;

  if (autoDiscounts && autoDiscounts.length > 0) {
    for (const autoDiscountConfig of autoDiscounts) {
      let calculatedCents = 0;
      if (autoDiscountConfig.type === 'percentage') {
        calculatedCents = Math.round(subtotalCents * (autoDiscountConfig.value / 100));
      } else if (autoDiscountConfig.type === 'fixed') {
        calculatedCents = Math.round(autoDiscountConfig.value * 100);
      }
      
      if (calculatedCents > bestAutoDiscountCents) {
        bestAutoDiscountCents = calculatedCents;
        bestAutoDiscountConfig = autoDiscountConfig;
      }
    }
  }

  const discountCents = Math.max(manualDiscountCents, bestAutoDiscountCents);
  const isAutoDiscountApplied = discountCents === bestAutoDiscountCents && bestAutoDiscountCents > 0 && manualDiscountCents < bestAutoDiscountCents;
  const appliedDiscountDescription = isAutoDiscountApplied ? bestAutoDiscountConfig?.description : appliedCoupon;
  
  const taxableBaseCents = Math.max(0, subtotalCents - discountCents);
  
  const shippingAmount =
    selectedMethod && selectedMethod !== 'pickup'
      ? Number(shippingMethods.find((m) => m.type === selectedMethod)?.cost || 0)
      : 0;
  const shippingCents = Math.round(shippingAmount * 100);
  
  const taxRatePercentNum = Number(taxRatePercent) || 0;
  const taxRate = taxRatePercentNum / 100;
  const taxCents = Math.round((taxableBaseCents + shippingCents) * taxRate);
  
  const totalCents = taxableBaseCents + shippingCents + taxCents;

  const discount = discountCents / 100;
  const taxAmount = taxCents / 100;
  const finalTotal = totalCents / 100;

  const needsShippingAddress =
    selectedMethod === 'standard_shipping' ||
    selectedMethod === 'review_required' ||
    (selectedMethod === 'local_delivery' && zipCheckStatus === 'success' && zipCheckResult?.available);

  console.log("[CHECKOUT-LIFECYCLE][L3] sessionReady =", sessionReady);
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading checkout…</p>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Checkout</h1>
          <p className="text-gray-600 text-lg mb-8">
            {isBuyNow
              ? 'Your checkout session expired or has no items. Customize the product again and choose Proceed to Payment.'
              : 'Your cart is empty.'}
          </p>
          <Link href={isBuyNow ? '/products' : '/cart'}>
            <Button className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold">
              {isBuyNow ? 'Browse products' : 'View cart'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  console.log(
    "[CHECKOUT-LIFECYCLE][L4] Rendering full checkout page",
    {
      checkoutItemsCount: checkoutItems.length
    }
  );
  console.log("[CHECKOUT-LIFECYCLE][L5] Rendering Order Summary sidebar");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
        {isBuyNow ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-8">
            Paying for this product only — your cart is not included in this checkout.
          </p>
        ) : (
          <p className="text-sm text-gray-600 mb-8">All items in your shopping cart are included below.</p>
        )}

        {/* Mobile-first: 1 col, desktop: 3-col with form left, summary right */}
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-6">
          {/* LEFT: Checkout form — on mobile shows BELOW summary (flex-col-reverse) */}
          <div className="lg:col-span-2 space-y-5">


            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Methods</h2>
              <ShippingSelector
                selectedMethod={selectedMethod}
                onMethodChange={handleMethodSelect}
                decision={oversizedDetails ? { isOversized: true, details: oversizedDetails } : null}
                zipCheckStatus={zipCheckStatus}
                zipCheckResult={zipCheckResult}
                onZipCheck={handleZipCheck}
                methods={shippingMethods}
                zipValue={formData.shippingZip}
                commitLocalDeliveryOnVerify
              />
            </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                    <input name="firstName" value={formData.firstName} onChange={handleInputChange} required className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                    <input name="lastName" value={formData.lastName} onChange={handleInputChange} required className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      required 
                      className={`${inputClass} ${isAuthenticated ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                      readOnly={isAuthenticated}
                    />
                    {isAuthenticated && (
                      <p className="text-xs text-gray-500 mt-1">Locked to your logged-in account.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={inputClass} />
                  </div>
                </div>
              </div>

              {needsShippingAddress && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Address</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
                      <input name="shippingAddress" value={formData.shippingAddress} onChange={handleInputChange} required className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apartment (optional)</label>
                      <input name="shippingApt" value={formData.shippingApt} onChange={handleInputChange} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input name="shippingCity" value={formData.shippingCity} onChange={handleInputChange} required className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input name="shippingState" value={formData.shippingState} onChange={handleInputChange} required className={inputClass} />
                    </div>
                    {(selectedMethod === 'standard_shipping' || selectedMethod === 'review_required') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                        <input name="shippingZip" value={formData.shippingZip} onChange={handleInputChange} required className={inputClass} maxLength={5} />
                      </div>
                    )}
                    {selectedMethod === 'local_delivery' && (
                      <div className="sm:col-span-2 text-sm text-gray-600">
                        ✓ Delivery ZIP verified: {formData.shippingZip}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing Address</h2>
                {needsShippingAddress && (
                  <label className="flex items-center gap-2 mb-4 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="sameAsShipping" 
                      checked={formData.sameAsShipping} 
                      onChange={(e) => setFormData(p => ({ ...p, sameAsShipping: e.target.checked }))} 
                      className="w-4 h-4 text-[#29b6f6] rounded border-gray-300 focus:ring-[#29b6f6]"
                    />
                    <span className="text-sm font-medium text-gray-700">Same as shipping address</span>
                  </label>
                )}
                
                {(!needsShippingAddress || !formData.sameAsShipping) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
                      <input name="billingAddress" value={formData.billingAddress} onChange={handleInputChange} required className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apartment (optional)</label>
                      <input name="billingApt" value={formData.billingApt} onChange={handleInputChange} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input name="billingCity" value={formData.billingCity} onChange={handleInputChange} required className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input name="billingState" value={formData.billingState} onChange={handleInputChange} required className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                      <input name="billingZip" value={formData.billingZip} onChange={handleInputChange} required className={inputClass} maxLength={5} />
                    </div>
                  </div>
                )}
              </div>


            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Order notes (optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className={inputClass}
                placeholder="Special instructions..."
              />
            </div>

            {payError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{payError}</div>
            )}

            {!clientSecret ? (
              <button
                type="button"
                onClick={handleContinueToPayment}
                disabled={isPaying}
                className="w-full bg-[#29b6f6] hover:bg-[#0288d1] text-white font-bold py-3.5 text-base rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isPaying ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Please wait...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Continue to Payment
                  </>
                )}
              </button>
            ) : (
              <div className="pt-4 border-t border-gray-200">
                {!stripePromise ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <strong>Configuration Error:</strong> Stripe is not configured. Please contact support.
                  </div>
                ) : (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <StripePaymentForm 
                      clientSecret={clientSecret} 
                      amount={finalTotal} 
                      onCancel={() => setClientSecret('')} 
                    />
                  </Elements>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Order Summary — on mobile shows FIRST (top) due to flex-col-reverse */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:sticky lg:top-20">
              {/* Summary header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <svg className="w-5 h-5 text-[#29b6f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <h2 className="text-base font-bold text-gray-900">Order Summary</h2>
                <span className="ml-auto text-xs text-gray-400">{checkoutItems.length} item{checkoutItems.length !== 1 ? 's' : ''}</span>
              </div>
              {/* Item list */}
              <div className="space-y-3 mb-4 pb-4 border-b border-gray-100 max-h-48 overflow-y-auto">
                {checkoutItems.map((item, idx) => {
                  const itemTotal = computeLineTotal(item);
                  const itemSize = getItemSizeLabel(item);
                  return (
                    <div key={idx} className="flex justify-between text-sm gap-2">
                      <span className="text-gray-600 leading-snug">
                        <span className="font-medium text-gray-800">{item.name}</span>
                        <span className="text-gray-500"> × {item.quantity}</span>
                        {itemSize ? (
                          <span className="block text-xs text-gray-400">Size: {itemSize}</span>
                        ) : null}
                      </span>
                      <span className="font-semibold text-gray-900 shrink-0">${itemTotal.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              {/* Totals */}
              <div className="space-y-2.5 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>${(subtotal || 0).toFixed(2)}</span>
                </div>
                {/* Coupon */}
                <div className="pt-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Coupon code"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 uppercase text-xs focus:outline-none focus:ring-2 focus:ring-[#29b6f6] min-w-0"
                    />
                    <button type="button" onClick={handleApplyCoupon} className="text-xs whitespace-nowrap px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors">
                      Apply
                    </button>
                  </div>
                  {couponMessage && <p className="mt-1 text-[11px] text-gray-500">{couponMessage}</p>}
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>Discount ({appliedDiscountDescription || 'Auto Discount'})</span>
                    <span>−${(discount || 0).toFixed(2)}</span>
                  </div>
                )}
                {selectedMethod && selectedMethod !== 'pickup' && (
                  <div className="flex justify-between items-center text-sm text-gray-600 gap-2">
                    <span className="min-w-0 truncate">
                      {shippingMethods.find((m) => m.type === selectedMethod)
                        ? `Shipping (${shippingMethods.find((m) => m.type === selectedMethod)?.label})`
                        : 'Shipping'}
                    </span>
                    {shippingMethods.find((m) => m.type === selectedMethod) ? (
                      <span className="shrink-0 font-medium">
                        {selectedMethod === 'review_required' ? 'Under review' : shippingAmount === 0 ? 'FREE' : `$${shippingAmount.toFixed(2)}`}
                      </span>
                    ) : (
                      <span className="shrink-0 text-amber-600">Pending</span>
                    )}
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span>${(taxAmount || 0).toFixed(2)}</span>
                </div>
                {/* Total */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-[#29b6f6]">${(finalTotal || 0).toFixed(2)}</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Payments secured by Stripe
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
