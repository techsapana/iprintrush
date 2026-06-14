'use client';

import { useEffect, useState } from 'react';

const SHIPPING_METHOD_LABELS = {
  pickup: 'Store Pickup',
  local_delivery: 'Local Delivery',
  standard_shipping: 'Standard Shipping',
  review_required: 'Shipping Review Required',
};

function getShippingMethodLabel(method) {
  if (!method) return 'Unknown';
  return SHIPPING_METHOD_LABELS[method] || 'Unknown';
}

export function ShippingSelector({ selectedMethod, onMethodChange, showOversizedWarning = false, className = '', shippingEnabled = true, items = [], config: shippingConfig }) {
  const [shippingMethods, setShippingMethods] = useState([]);

  useEffect(() => {
    if (!shippingConfig) {
      setShippingMethods([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/shipping/methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, shippingConfig }),
        });
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (data?.success && Array.isArray(data.methods)) {
          setShippingMethods(data.methods);
        } else {
          setShippingMethods([]);
        }
      } catch {
        if (!cancelled) setShippingMethods([]);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [shippingConfig, items]);

  const localDeliveryMethod = shippingMethods.find((m) => m.type === 'local_delivery');
  const standardShippingMethod = shippingMethods.find((m) => m.type === 'standard_shipping');
  const reviewRequiredMethod = shippingMethods.find((m) => m.type === 'review_required');

  const isOversizedScenario = reviewRequiredMethod && !standardShippingMethod;
  const shouldShowWarning = showOversizedWarning || isOversizedScenario;

  return (
    <div className={`space-y-4 ${className}`}>
      {shouldShowWarning && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Oversized product detected. Standard shipping is unavailable. Our team will review shipping options and contact you.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onMethodChange('pickup')}
          className={`rounded-xl border px-4 py-3 text-left transition ${
            selectedMethod === 'pickup'
              ? 'border-[#29b6f6] bg-[#29b6f6]/5 shadow-sm'
              : 'border-gray-200 hover:border-[#29b6f6]/60 hover:bg-gray-50'
          }`}
        >
          <div className="font-semibold text-gray-900">Store Pickup FREE</div>
          <div className="text-sm text-gray-600">Pickup at our Fair Oaks store location.</div>
        </button>
        {shippingEnabled !== false && localDeliveryMethod && (
          <button
            type="button"
            onClick={() => onMethodChange('local_delivery')}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              selectedMethod === 'local_delivery'
                ? 'border-[#29b6f6] bg-[#29b6f6]/5 shadow-sm'
                : 'border-gray-200 hover:border-[#29b6f6]/60 hover:bg-gray-50'
            }`}
          >
            <div className="font-semibold text-gray-900">Local Delivery</div>
            <div className="text-sm text-gray-600">
              ${localDeliveryMethod.cost.toFixed(2)} delivery fee
              {localDeliveryMethod.cost === 0 && ' (Free for 200+ items)'}
            </div>
          </button>
        )}
        {shippingEnabled !== false && standardShippingMethod && (
          <button
            type="button"
            onClick={() => onMethodChange('standard_shipping')}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              selectedMethod === 'standard_shipping'
                ? 'border-[#29b6f6] bg-[#29b6f6]/5 shadow-sm'
                : 'border-gray-200 hover:border-[#29b6f6]/60 hover:bg-gray-50'
            }`}
          >
            <div className="font-semibold text-gray-900">Standard Shipping</div>
            <div className="text-sm text-gray-600">
              ${standardShippingMethod.cost.toFixed(2)} shipping fee
              {standardShippingMethod.cost === 0 && ' (Free for 200+ items)'}
            </div>
          </button>
        )}
        {reviewRequiredMethod && (
          <button
            type="button"
            onClick={() => onMethodChange('review_required')}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              selectedMethod === 'review_required'
                ? 'border-[#29b6f6] bg-[#29b6f6]/5 shadow-sm'
                : 'border-gray-200 hover:border-[#29b6f6]/60 hover:bg-gray-50'
            }`}
          >
            <div className="font-semibold text-gray-900">Shipping Review Required</div>
            <div className="text-sm text-gray-600">Oversized items require manual shipping review.</div>
          </button>
        )}
      </div>
    </div>
  );
}

export function getShippingDisplayLabel(method) {
  if (!method) return 'Unknown';
  return getShippingMethodLabel(method);
}