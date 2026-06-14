'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { SameDayNotice } from '../components/shared/SameDayNotice';
import {
  readBuyNowItems,
  clearBuyNowItems,
  computeItemsSubtotal,
  computeLineTotal,
  requireLoginForCheckout,
} from '../lib/checkoutFlow';

const inputClass =
  'w-full border border-gray-300 rounded-md px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#29b6f6]';

const fileModeButtonClass = (active) =>
  active
    ? 'bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold'
    : 'border-gray-300 text-gray-700 hover:bg-gray-50';

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBuyNow = searchParams.get('mode') === 'buyNow';
  const { items: cartItems } = useCart();
  const { isAuthenticated } = useAuth();

  const [sessionReady, setSessionReady] = useState(false);
  const [buyNowItems, setBuyNowItems] = useState([]);
  const [taxRatePercent, setTaxRatePercent] = useState(0);
  const [couponLookup, setCouponLookup] = useState({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
    deliveryMethod: 'pickup',
    shippingAddress: '',
    shippingApt: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
  });
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [fedexRates, setFedexRates] = useState({
    options: [],
    loading: false,
    unavailable: false,
    message: '',
  });
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [useRuleBased, setUseRuleBased] = useState(
    process.env.NEXT_PUBLIC_USE_RULE_BASED_SHIPPING === 'true'
  );
  const [shippingAddressKey, setShippingAddressKey] = useState('');
  const [fileUploadMode, setFileUploadMode] = useState('later');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [isFinalConfirmed, setIsFinalConfirmed] = useState(false);

  async function fetchShippingMethods() {
    if (!useRuleBased) return;
    try {
      const res = await fetch('/api/shipping/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: checkoutItems.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            quotePayload: i.options?.quotePayload || null,
          })),
          shippingAddress: {
            address: formData.shippingAddress.trim(),
            city: formData.shippingCity.trim(),
            state: formData.shippingState.trim(),
            zip: formData.shippingZip.trim(),
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success && Array.isArray(data.methods)) {
        setShippingMethods(data.methods);
      } else {
        setShippingMethods([]);
      }
    } catch {
      setShippingMethods([]);
    }
  }

  useEffect(() => {
    if (isBuyNow) {
      setBuyNowItems(readBuyNowItems());
    } else {
      clearBuyNowItems();
    }
    setSessionReady(true);
  }, [isBuyNow]);

  useEffect(() => {
    if (!useRuleBased) return;
    if (!canCalculateShipping()) return;
    fetchShippingMethods();
  }, [useRuleBased, checkoutItems, formData.shippingAddress, formData.shippingCity, formData.shippingState, formData.shippingZip]);

  const checkoutItems = isBuyNow ? buyNowItems : cartItems;

  const buildShippingItems = useCallback(
    () =>
      checkoutItems.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        quotePayload: i.options?.quotePayload || null,
      })),
    [checkoutItems],
  );

  const canCalculateShipping = useCallback(() => {
    const zipRegex = /^\d{5}$/;
    return (
      formData.shippingAddress?.trim() &&
      formData.shippingCity?.trim() &&
      formData.shippingState?.trim() &&
      zipRegex.test(String(formData.shippingZip || '').trim())
    );
  }, [
    formData.shippingAddress,
    formData.shippingCity,
    formData.shippingState,
    formData.shippingZip,
  ]);

  const handleCalculateShipping = async () => {
    if (!canCalculateShipping()) {
      setPayError('Enter street, city, state, and a 5-digit ZIP in Shipping Address first.');
      return;
    }
    // Skip rate calculation when rule-based shipping is active
    if (useRuleBased) {
      return;
    }
    setPayError('');
    setFedexRates({ options: [], loading: true, unavailable: false, message: '' });
    setSelectedShipping(null);
    try {
      const res = await fetch('/api/fedex/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: buildShippingItems(),
          shippingAddress: {
            address: formData.shippingAddress.trim(),
            city: formData.shippingCity.trim(),
            state: formData.shippingState.trim(),
            zip: formData.shippingZip.trim(),
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.success || !Array.isArray(data.rates) || data.rates.length === 0) {
        setSelectedShipping(null);
        setFedexRates({
          options: [],
          loading: false,
          unavailable: true,
          message:
            data.message || data.error || 'Unable to retrieve shipping rates. Check your address and try again.',
        });
        return;
      }
      setFedexRates({
        options: data.rates,
        loading: false,
        unavailable: false,
        message: '',
      });
      const cheapest = [...data.rates].sort(
        (a, b) => Number(a.cost || 0) - Number(b.cost || 0),
      )[0];
      setSelectedShipping(cheapest || null);
      setShippingAddressKey(
        `${formData.shippingAddress}|${formData.shippingCity}|${formData.shippingState}|${formData.shippingZip}`,
      );
    } catch {
      setSelectedShipping(null);
      setFedexRates({
        options: [],
        loading: false,
        unavailable: true,
        message: 'Unable to retrieve shipping rates. Please try again.',
      });
    }
  };

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

  const handleDesignFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadedPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    setIsFinalConfirmed(false);
    if (e.target) e.target.value = '';
  };

  const handleUploadLater = () => {
    setFileUploadMode('later');
    setUploadedFile(null);
    setUploadedPreview(null);
    setIsFinalConfirmed(false);
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

  useEffect(() => {
    return () => {
      if (uploadedPreview) {
        URL.revokeObjectURL(uploadedPreview);
      }
    };
  }, [uploadedPreview]);

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
    if (formData.deliveryMethod !== 'shipping') {
      setFedexRates({ options: [], loading: false, unavailable: false, message: '' });
      setSelectedShipping(null);
      setShippingMethods([]);
      setSelectedMethod(null);
      setShippingAddressKey('');
      return;
    }
    const currentKey = `${formData.shippingAddress}|${formData.shippingCity}|${formData.shippingState}|${formData.shippingZip}`;
    if (shippingAddressKey && currentKey !== shippingAddressKey) {
      setFedexRates({ options: [], loading: false, unavailable: false, message: '' });
      setSelectedShipping(null);
      setShippingMethods([]);
      setSelectedMethod(null);
      setShippingAddressKey('');
    }
  }, [
    formData.deliveryMethod,
    formData.shippingAddress,
    formData.shippingCity,
    formData.shippingState,
    formData.shippingZip,
    shippingAddressKey,
    useRuleBased,
  ]);

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

  const handleStripeCheckout = async (e) => {
    e.preventDefault();
    setPayError('');
    if (!isAuthenticated) {
      requireLoginForCheckout(router, isBuyNow ? '/checkout?mode=buyNow' : '/checkout');
      return;
    }
    const zipRegex = /^\d{5}$/;
    if (!zipRegex.test(String(formData.zip || '').trim())) {
      setPayError('Billing ZIP code must be exactly 5 digits.');
      return;
    }
    if (
      formData.deliveryMethod === 'shipping' &&
      (!formData.shippingAddress || !formData.shippingCity || !formData.shippingZip)
    ) {
      setPayError('Please fill shipping address, city, and ZIP code for shipping delivery.');
      return;
    }
    if (
      formData.deliveryMethod === 'shipping' &&
      !zipRegex.test(String(formData.shippingZip || '').trim())
    ) {
      setPayError('Shipping ZIP code must be exactly 5 digits.');
      return;
    }
    if (
      formData.deliveryMethod === 'shipping' &&
      !useRuleBased &&
      !selectedShipping
    ) {
      setPayError('Calculate shipping and select a shipping option before checkout.');
      return;
    }
    if (
      formData.deliveryMethod === 'shipping' &&
      useRuleBased &&
      !selectedMethod
    ) {
      setPayError('Please select a shipping method.');
      return;
    }
    if (
      formData.deliveryMethod === 'shipping' &&
      useRuleBased &&
      selectedMethod === 'review_required' &&
      !formData.shippingAddress.trim()
    ) {
      setPayError('Please enter a shipping address for oversized items.');
      return;
    }
    setIsPaying(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: checkoutItems.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            quotePayload: i.options?.quotePayload,
            quoteSummary: i.options?.quoteSummary,
            customizationsDisplay: i.options?.customizationsDisplay,
            splitQuote: i.options?.splitQuote === true,
            customLineTotal: i.options?.customLineTotal,
            customUnitPrice: i.options?.customUnitPrice,
            artworkReady: i.options?.artworkReady === true,
            tempArtworkFiles: i.options?.tempArtworkFiles || [],
            artworkFiles: i.options?.artworkFiles || [],
            customSizeNote: i.options?.customSizeNote || '',
          })),
          customer: {
            ...formData,
            selectedShipping:
              formData.deliveryMethod === 'shipping' && !useRuleBased && selectedShipping
                ? selectedShipping
                : undefined,
            selectedMethod:
              formData.deliveryMethod === 'shipping' && useRuleBased
                ? selectedMethod
                : undefined,
            shippingMethodsData:
              formData.deliveryMethod === 'shipping' && useRuleBased
                ? shippingMethods.find((m) => m.type === selectedMethod) || null
                : undefined,
            useRuleBasedShipping: useRuleBased,
            shippingRatesUnavailable: false,
          },
          couponCode: appliedCoupon || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Payment initialization failed');
      if (!data?.url) throw new Error('Missing Stripe redirect URL');
      if (isBuyNow) clearBuyNowItems();
      window.location.href = data.url;
    } catch (err) {
      setPayError(err?.message || 'Payment initialization failed');
      setIsPaying(false);
    }
  };

  const subtotal = computeItemsSubtotal(checkoutItems);
  const discount = appliedCoupon
    ? (subtotal || 0) * ((couponLookup[appliedCoupon] || 0) / 100)
    : 0;
  const taxableBase = Math.max(0, (subtotal || 0) - discount);
  const shippingAmount =
    formData.deliveryMethod === 'shipping'
      ? useRuleBased
        ? Number(shippingMethods.find((m) => m.type === selectedMethod)?.cost || 0)
        : Number(selectedShipping?.cost || 0)
      : 0;
  const taxAmount = (taxableBase + shippingAmount) * ((Number(taxRatePercent) || 0) / 100);
  const finalTotal = taxableBase + shippingAmount + taxAmount;
  const canProceed =
    fileUploadMode === 'later' ||
    (fileUploadMode === 'now' && uploadedFile && isFinalConfirmed);

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleStripeCheckout} className="lg:col-span-2 space-y-8">
            <SameDayNotice />

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Method</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="deliveryMethod" value="pickup" checked={formData.deliveryMethod === 'pickup'} onChange={handleInputChange} />
                  <span>Store pickup</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="deliveryMethod" value="shipping" checked={formData.deliveryMethod === 'shipping'} onChange={handleInputChange} />
                  <span>Ship to address</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact &amp; Billing</h2>
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
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
                  <input name="address" value={formData.address} onChange={handleInputChange} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input name="city" value={formData.city} onChange={handleInputChange} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input name="state" value={formData.state} onChange={handleInputChange} required className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input name="zip" value={formData.zip} onChange={handleInputChange} required className={inputClass} maxLength={5} />
                </div>
              </div>
            </div>

{formData.deliveryMethod === 'shipping' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Address</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                    <input name="shippingAddress" value={formData.shippingAddress} onChange={handleInputChange} required className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apt (optional)</label>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                    <input name="shippingZip" value={formData.shippingZip} onChange={handleInputChange} required className={inputClass} maxLength={5} />
                  </div>
                </div>
              </div>
            )}

            {formData.deliveryMethod === 'shipping' && !useRuleBased && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Shipping Options</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Fill in the shipping address above, then calculate shipping rates for your order.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCalculateShipping}
                  disabled={!canCalculateShipping() || fedexRates.loading}
                  className="mb-4"
                >
                  {fedexRates.loading ? 'Calculating shipping…' : 'Calculate shipping'}
                </Button>
                {!canCalculateShipping() && (
                  <p className="text-sm text-gray-500 mb-4">
                    Enter street, city, state, and ZIP in Shipping Address to calculate rates.
                  </p>
                )}
{!fedexRates.loading && fedexRates.unavailable && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                    {fedexRates.message || 'Unable to retrieve shipping rates. Check your address and try again.'}
                  </p>
                )}
                {!fedexRates.loading && !fedexRates.unavailable && fedexRates.options.length > 0 && (
                  <div className="space-y-3">
                    {fedexRates.options.map((rate) => {
                      const deliveryLabel =
                        rate.estimatedDeliveryLabel || rate.transitTime || 'Delivery date pending';
                      const label = `${rate.serviceName} — Delivery ${deliveryLabel} — $${Number(rate.cost).toFixed(2)}`;
                      const checked = selectedShipping?.serviceType === rate.serviceType;
                      return (
                        <label
                          key={rate.serviceType}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                            checked
                              ? 'border-[#29b6f6] bg-sky-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="fedexShippingOption"
                            checked={checked}
                            onChange={() => setSelectedShipping(rate)}
                            className="mt-1"
                          />
                          <span className="text-sm text-gray-900">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

{formData.deliveryMethod === 'shipping' && useRuleBased && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Methods</h2>
                {/* Check if review_required method exists without standard_shipping */}
                {shippingMethods.some((m) => m.type === 'review_required') &&
                  !shippingMethods.some((m) => m.type === 'standard_shipping') && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-4">
                      Oversized product detected. Standard shipping is unavailable. Our team will review shipping options and contact you.
                    </div>
                  )}
                {shippingMethods.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Enter street, city, state, and ZIP in Shipping Address to load shipping methods.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {shippingMethods.map((method) => {
                      const checked = selectedMethod === method.type;
                      return (
                        <label
                          key={method.type}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                            checked
                              ? 'border-[#29b6f6] bg-sky-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="ruleBasedShippingOption"
                            checked={checked}
                            onChange={() => setSelectedMethod(method.type)}
                            className="mt-1"
                          />
                          <span className="text-sm text-gray-900">
                            {method.label} — ${Number(method.cost || 0).toFixed(2)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Your Design (Optional but recommended)</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload your final design now, or continue and upload it later from dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Button
                  type="button"
                  onClick={() => setFileUploadMode('now')}
                  className={`w-full sm:w-auto ${fileModeButtonClass(fileUploadMode === 'now')}`}
                >
                  Upload Now
                </Button>
                <Button
                  type="button"
                  onClick={handleUploadLater}
                  className={`w-full sm:w-auto ${fileModeButtonClass(fileUploadMode === 'later')}`}
                >
                  Upload Later
                </Button>
              </div>

              {fileUploadMode === 'later' && (
                <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  You can upload your file later from dashboard.
                </p>
              )}

              {fileUploadMode === 'now' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Design file</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleDesignFileChange}
                    className={inputClass}
                  />

                  {uploadedFile && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      {uploadedPreview ? (
                        <img
                          src={uploadedPreview}
                          alt="Uploaded design preview"
                          className="max-h-64 rounded-md border border-gray-200 bg-white object-contain mb-3"
                        />
                      ) : (
                        <div className="rounded-md border border-gray-200 bg-white px-4 py-3 mb-3">
                          <p className="text-sm font-medium text-gray-900">PDF preview unavailable</p>
                          <p className="text-xs text-gray-600 mt-1">File selected: {uploadedFile.name}</p>
                        </div>
                      )}
                      {!uploadedPreview && (
                        <p className="text-xs text-gray-600">
                          Selected file: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
                        </p>
                      )}
                    </div>
                  )}

                  {uploadedFile && (
                    <label className="flex items-start gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={isFinalConfirmed}
                        onChange={(e) => setIsFinalConfirmed(e.target.checked)}
                        className="mt-1"
                      />
                      <span>Yes, this is my final design and I confirm it is correct</span>
                    </label>
                  )}
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

            <Button
              type="submit"
              disabled={isPaying || !canProceed}
              className="w-full bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold py-4 text-lg rounded-lg disabled:opacity-60"
            >
              {isPaying ? 'Redirecting to secure payment...' : 'Checkout'}
            </Button>
          </form>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
              <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                {checkoutItems.map((item, idx) => {
                  const itemTotal = computeLineTotal(item);
                  const itemSize = getItemSizeLabel(item);
                  return (
                    <div key={idx} className="flex justify-between text-sm gap-2">
                      <span className="text-gray-700">
                        {item.name} × {item.quantity}
                        {itemSize ? (
                          <span className="block text-xs text-gray-500">Size: {itemSize}</span>
                        ) : null}
                      </span>
                      <span className="font-medium text-gray-900 shrink-0">${itemTotal.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span>${(subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="pt-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Coupon code"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-700 uppercase text-xs"
                    />
                    <Button type="button" onClick={handleApplyCoupon} variant="outline" className="text-xs whitespace-nowrap">
                      Apply Coupon
                    </Button>
                  </div>
                  {couponMessage && <p className="mt-1 text-[11px] text-gray-600">{couponMessage}</p>}
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-700">
                    <span>Discount ({appliedCoupon}):</span>
                    <span>- ${(discount || 0).toFixed(2)}</span>
                  </div>
                )}
{formData.deliveryMethod === 'shipping' && (
                   <div className="flex justify-between items-center text-sm text-gray-700 gap-2">
                     <span className="min-w-0">
                       {useRuleBased && shippingMethods.find((m) => m.type === selectedMethod)
                         ? `Shipping (${shippingMethods.find((m) => m.type === selectedMethod)?.label}):`
                         : !useRuleBased && selectedShipping
                         ? `Shipping (${selectedShipping.serviceName}):`
                         : 'Shipping:'}
                     </span>
                     {useRuleBased && shippingMethods.find((m) => m.type === selectedMethod) ? (
                       <span className="shrink-0 font-medium">${shippingAmount.toFixed(2)}</span>
                     ) : selectedShipping ? (
                       <span className="shrink-0 font-medium">${shippingAmount.toFixed(2)}</span>
                     ) : useRuleBased ? (
                       <span className="shrink-0 font-medium">$0.00</span>
                     ) : (
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         className="shrink-0 text-xs h-8"
                         onClick={handleCalculateShipping}
                         disabled={!canCalculateShipping() || fedexRates.loading}
                       >
                         {fedexRates.loading ? 'Calculating…' : 'Calculate shipping'}
                       </Button>
                     )}
                   </div>
                 )}
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Tax:</span>
                  <span>${(taxAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-[#29b6f6]">${(finalTotal || 0).toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">Payments are processed securely by Stripe.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
