'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { SameDayNotice } from '../components/shared/SameDayNotice';
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

const inputClass =
  'w-full border border-gray-300 rounded-md px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#29b6f6]';

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
const [oversizedDetails, setOversizedDetails] = useState(null);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [zipCheckStatus, setZipCheckStatus] = useState('idle');
  const [zipCheckResult, setZipCheckResult] = useState(null);
  const [fileUploadMode, setFileUploadMode] = useState('later');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [isFinalConfirmed, setIsFinalConfirmed] = useState(false);

  const checkoutItems = useMemo(() => {
    const source = isBuyNow ? buyNowItems : cartItems;
    return Array.isArray(source) ? source : [];
  }, [isBuyNow, buyNowItems, cartItems]);

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

  const handleMethodSelect = (methodType) => {
    setSelectedMethod(methodType);
    setZipCheckStatus('idle');
    setZipCheckResult(null);
    setFormData((prev) => ({
      ...prev,
      shippingZip: '',
      deliveryMethod: methodType === 'pickup' ? 'pickup' : 'shipping',
    }));
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
    if (isBuyNow) {
      setBuyNowItems(readBuyNowItems());
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
        setZipCheckStatus(hasLocal ? 'success' : 'unavailable');
        setZipCheckResult({
          available: hasLocal,
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

  const handleStripeCheckout = async (e) => {
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
            customizationsDisplay: i.options?.customizationsDisplay,
            splitQuote: i.options?.splitQuote === true,
            splitGroupId: i.options?.splitGroupId,
            splitSizeLabel: i.options?.splitSizeLabel,
            artworkReady: i.options?.artworkReady === true,
            tempArtworkFiles: i.options?.tempArtworkFiles || [],
            artworkFiles: i.options?.artworkFiles || [],
            customSizeNote: i.options?.customSizeNote || '',
          })),
          customer: {
            ...formData,
            selectedMethod:
              formData.deliveryMethod === 'shipping'
                ? selectedMethod
                : undefined,
            shippingMethodsData:
              formData.deliveryMethod === 'shipping'
                ? shippingMethods.find((m) => m.type === selectedMethod) || null
                : undefined,
          },
          couponCode: appliedCoupon || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Payment initialization failed');
      if (!data?.url) throw new Error('Missing Stripe redirect URL');
      if (isBuyNow) clearBuyNowItems();
      clearAllQuoteDrafts();
      window.location.href = data.url;
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
  const discount = appliedCoupon
    ? (subtotal || 0) * ((couponLookup[appliedCoupon] || 0) / 100)
    : 0;
  const taxableBase = Math.max(0, (subtotal || 0) - discount);
  const shippingAmount =
    selectedMethod && selectedMethod !== 'pickup'
      ? Number(shippingMethods.find((m) => m.type === selectedMethod)?.cost || 0)
      : 0;
  const taxAmount = (taxableBase + shippingAmount) * ((Number(taxRatePercent) || 0) / 100);
  const finalTotal = taxableBase + shippingAmount + taxAmount;
  const canProceed =
    fileUploadMode === 'later' ||
    (fileUploadMode === 'now' && uploadedFile && isFinalConfirmed);

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleStripeCheckout} className="lg:col-span-2 space-y-8">
            <SameDayNotice />

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Method</h2>
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
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className={inputClass} />
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
                {selectedMethod && selectedMethod !== 'pickup' && (
                  <div className="flex justify-between items-center text-sm text-gray-700 gap-2">
                    <span className="min-w-0">
                      {shippingMethods.find((m) => m.type === selectedMethod)
                        ? `Shipping (${shippingMethods.find((m) => m.type === selectedMethod)?.label}):`
                        : 'Shipping:'}
                    </span>
                    {shippingMethods.find((m) => m.type === selectedMethod) ? (
                      <span className="shrink-0 font-medium">
                        {selectedMethod === 'review_required' ? 'Under review' : shippingAmount === 0 ? 'FREE' : `$${shippingAmount.toFixed(2)}`}
                      </span>
                    ) : (
                      <span className="shrink-0 font-medium text-amber-600">Shipping methods pending</span>
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
