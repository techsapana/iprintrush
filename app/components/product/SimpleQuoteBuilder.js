'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ShippingSelector, getShippingDisplayLabel } from '../shared/ShippingSelector';

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function SimpleQuoteBuilder({
  productId,
  productName,
  minQuantity: productMin = null,
  maxQuantity: productMax = null,
  prefillQuote = null,
  onQuoteReady,
  weightLb = null,
  packageWidthIn = null,
  localDeliveryEligible = null,
}) {
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [shippingZip, setShippingZip] = useState('');
  const [quoteSummary, setQuoteSummary] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [error, setError] = useState('');
  const [availableMethods, setAvailableMethods] = useState([]);
  const [zipCheckStatus, setZipCheckStatus] = useState('idle');
  const [zipCheckResult, setZipCheckResult] = useState(null);
  const [oversizedDetails, setOversizedDetails] = useState(null);

  useEffect(() => {
    const stored = prefillQuote?.payload;
    if (stored) {
      if (typeof stored.quantity === 'number') {
        setQuantity(stored.quantity);
      }
      if (stored.deliveryMethod) {
        setDeliveryMethod(stored.deliveryMethod);
      }
      if (stored.shippingZip) {
        setShippingZip(stored.shippingZip);
      }
      if (prefillQuote.summary) {
        setQuoteSummary(prefillQuote.summary);
        setHasCalculated(true);
      }
      if (prefillQuote.summary?.shippingDecision) {
        const decision = prefillQuote.summary.shippingDecision;
        if (decision.isOversized && decision.details) {
          setOversizedDetails({
            anyOversized: decision.isOversized,
            widthExceeded: decision.details.widthExceeded,
            weightExceeded: decision.details.weightExceeded,
          });
        }
      }
    }
  }, [prefillQuote]);

  const quantityMin = useMemo(() => {
    if (productMin == null || productMin === '') return null;
    const n = Number(productMin);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [productMin]);

  const quantityMax = useMemo(() => {
    if (productMax == null || productMax === '') return null;
    const n = Number(productMax);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [productMax]);

  const invalidateQuote = () => {
    if (!hasCalculated) return;
    setQuoteSummary(null);
    setHasCalculated(false);
    setZipCheckStatus('idle');
    setZipCheckResult(null);
    setAvailableMethods([]);
    setOversizedDetails(null);
  };

  const hasCalculatedRef = useRef(hasCalculated);
  useEffect(() => {
    hasCalculatedRef.current = hasCalculated;
  }, [hasCalculated]);

  const scheduleRecalculation = debounce(() => {
    if (hasCalculatedRef.current) {
      handleCalculate();
    }
  }, 300);

  const handleZipCheck = async (zip) => {
    if (!zip || zip.length !== 5) return;
    setZipCheckStatus('checking');
    setZipCheckResult(null);
    try {
      const res = await fetch('/api/shipping/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: productId,
            quantity: quantity > 0 ? quantity : 1,
            quotePayload: { mode: 'simple' },
            product: {
              weight_lb: Number(weightLb) || 0,
              package_width_in: Number(packageWidthIn) || 0,
              localDeliveryEligible: localDeliveryEligible ?? true,
            },
          }],
          shippingAddress: { zip },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success && Array.isArray(data.methods)) {
        setAvailableMethods(data.methods);
        if (data.oversizedDetails) {
          setOversizedDetails(data.oversizedDetails);
        }
        setZipCheckResult({
          available: data.methods.some(m => m.type === 'local_delivery' && m.available !== false) || false,
          cost: data.methods.find(m => m.type === 'local_delivery')?.cost || 0,
          deliveryWindow: data.methods.find(m => m.type === 'local_delivery')?.deliveryWindow || null,
        });
        setZipCheckStatus('success');
      } else {
        setZipCheckStatus('unavailable');
        setZipCheckResult({ available: false, cost: 0, deliveryWindow: null });
      }
    } catch {
      setZipCheckStatus('error');
      setZipCheckResult(null);
    }
  };

  const handleQuantityInput = (value) => {
    invalidateQuote();
    const numValue = parseInt(value, 10) || 1;
    let next = Math.max(1, numValue);
    if (quantityMax != null) {
      next = Math.min(next, quantityMax);
    }
    if (quantityMin != null) {
      next = Math.max(next, quantityMin);
    }
    setQuantity(next);
    scheduleRecalculation();
  };

  const handleDeliveryMethodChange = (method) => {
    invalidateQuote();
    setDeliveryMethod(method);
    if (method !== 'local_delivery') {
      setShippingZip('');
    }
  };

  const handleCalculate = async () => {
    if (!quantity || quantity < 1) {
      setError('Please enter a valid quantity.');
      return;
    }
    if (quantityMin != null && quantity < quantityMin) {
      setError(`Minimum quantity is ${quantityMin}.`);
      return;
    }
    if (quantityMax != null && quantity > quantityMax) {
      setError(`Maximum quantity is ${quantityMax}.`);
      return;
    }

    setError('');
    setCalculating(true);

    const payload = {
      productId,
      mode: 'simple',
      quantity,
      deliveryMethod,
      shippingZip: shippingZip.trim(),
    };

    try {
      const res = await fetch('/api/quote/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to calculate quote');
      }
      setQuoteSummary(json);
      setHasCalculated(true);
      if (json.shippingDecision) {
        const shippingDecision = json.shippingDecision;
        if (shippingDecision.isOversized && shippingDecision.details) {
          setOversizedDetails({
            anyOversized: shippingDecision.isOversized,
            widthExceeded: shippingDecision.details.widthExceeded,
            weightExceeded: shippingDecision.details.weightExceeded,
          });
        } else {
          setOversizedDetails(null);
        }
      }
      if (onQuoteReady && json) {
        onQuoteReady({
          mode: 'simple',
          payload,
          summary: json,
          customizationsDisplay: {
            Quantity: String(quantity),
            Delivery: getShippingDisplayLabel(deliveryMethod),
          },
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to calculate quote');
    } finally {
      setCalculating(false);
    }
  };

  // Auto-calculate on initial load
  useEffect(() => {
    if (!hasCalculated && quantity && quantity >= 1) {
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canProceedToPayment = Boolean(
    quoteSummary?.grandTotal != null,
  );

  const shippingDecision = oversizedDetails ? {
    isOversized: oversizedDetails.anyOversized || false,
    details: oversizedDetails,
  } : null;

  // Only pass methods if we have them; otherwise fallback to default render
  const shippingMethods = availableMethods.length > 0 ? availableMethods : undefined;

  return (
    <div className="space-y-6">
      {/* Delivery Method Selector */}
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Delivery Method</h3>
        <ShippingSelector
          selectedMethod={deliveryMethod}
          onMethodChange={handleDeliveryMethodChange}
          decision={shippingDecision}
          shippingEnabled={true}
          zipCheckStatus={zipCheckStatus}
          zipCheckResult={zipCheckResult}
          onZipCheck={handleZipCheck}
          deliveryMethod={deliveryMethod}
          methods={shippingMethods}
        />
      </div>

      {/* Quantity & Quote */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-gray-700">
            Quantity
            <div className="mt-1">
              <input
                type="number"
                min={quantityMin || 1}
                max={quantityMax || undefined}
                value={quantity}
                onChange={(e) => handleQuantityInput(e.target.value)}
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-xl font-bold text-[#29b6f6]">
              ${(typeof quoteSummary?.grandTotal === 'number' ? quoteSummary.grandTotal : 0).toFixed(2)}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={handleCalculate}
            disabled={calculating}
            className="w-full bg-[#0f172a] hover:bg-[#020617] text-white font-semibold py-2 text-sm rounded-lg transition disabled:opacity-60"
          >
            {calculating ? 'Calculating...' : 'Calculate Price'}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {!quoteSummary && (
        <div className="text-sm text-gray-600">
          <p>Minimum order: {quantityMin || 1} piece(s)</p>
          {quantityMax && <p>Maximum order: {quantityMax} pieces</p>}
        </div>
      )}

      {quoteSummary && (
        <div className="border rounded-lg p-4 bg-white">
          <div className="text-sm font-semibold text-gray-500 mb-2">Quote Summary</div>
          <div className="space-y-1 text-sm">
            {quoteSummary.lineItems?.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.label}</span>
                <span>{item.amount < 0 ? '-' : ''}${Math.abs(item.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${quoteSummary.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>{quoteSummary.shipping === 0 ? 'FREE' : `$${quoteSummary.shipping?.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg">
              <span>Grand Total</span>
              <span>${quoteSummary.grandTotal?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}