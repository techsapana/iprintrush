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

export function ShippingSelector({ selectedMethod, onMethodChange, decision, shippingEnabled = true, className = '', items = [], config: shippingConfig }) {
  const [shippingMethods, setShippingMethods] = useState([]);
  const [oversizedDetails, setOversizedDetails] = useState(null);

  useEffect(() => {
    // Use decision prop if provided (SDL mode), otherwise fetch legacy way
    if (decision) {
      setShippingMethods(decision.allowedMethods.map(type => ({
        type,
        id: type,
        label: SHIPPING_METHOD_LABELS[type],
        cost: 0,
      })));
      setOversizedDetails(decision.details || null);
      return;
    }
    
    if (!shippingConfig) {
      setShippingMethods([]);
      setOversizedDetails(null);
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
          setOversizedDetails(data.oversizedDetails || null);
        } else {
          setShippingMethods([]);
          setOversizedDetails(null);
        }
      } catch {
        if (!cancelled) {
          setShippingMethods([]);
          setOversizedDetails(null);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [decision, shippingConfig, items]);

  // Determine oversized scenario from decision or methods
  const isOversizedScenario = decision?.isOversized ?? (shippingMethods.find(m => m.type === 'review_required') && !shippingMethods.find(m => m.type === 'standard_shipping'));
  const shouldShowWarning = isOversizedScenario;

  // Helper to get method from shippingMethods array
  const getMethod = (type) => shippingMethods.find(m => m.type === type);

  return (
    <div className={`space-y-4 ${className}`}>
      {shouldShowWarning && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <span className="font-semibold">Shipping Requires Manual Review</span>
          {oversizedDetails?.widthExceeded && (
            <div className="mt-1">
              Width: {oversizedDetails.widthExceeded.selectedWidth}" exceeds {oversizedDetails.widthExceeded.maxAllowedWidth}" limit
            </div>
          )}
          {oversizedDetails?.weightExceeded && (
            <div className="mt-1">
              Weight: {oversizedDetails.weightExceeded.productWeight} lbs exceeds {oversizedDetails.weightExceeded.maxAllowedWeight} lbs limit
            </div>
          )}
          <div className="mt-2">Our team will contact you with shipping options.</div>
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
          <div className="font-semibold text-gray-900">Store Pickup</div>
          <div className="text-sm text-gray-600">Pickup at our Fair Oaks store location.</div>
        </button>
        {shippingEnabled !== false && getMethod('local_delivery') && (
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
              ${getMethod('local_delivery').cost.toFixed(2)} delivery fee
              {getMethod('local_delivery').cost === 0 && ' (Free for 200+ items)'}
            </div>
          </button>
        )}
        {shippingEnabled !== false && getMethod('standard_shipping') && (
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
              ${getMethod('standard_shipping').cost.toFixed(2)} shipping fee
              {getMethod('standard_shipping').cost === 0 && ' (Free for 200+ items)'}
            </div>
          </button>
        )}
        {getMethod('review_required') && (
          <button
            type="button"
            onClick={() => onMethodChange('review_required')}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              selectedMethod === 'review_required'
                ? 'border-[#29b6f6] bg-[#29b6f6]/5 shadow-sm'
                : 'border-gray-200 hover:border-[#29b6f6]/60 hover:bg-gray-50'
            }`}
          >
            <div className="font-semibold text-gray-900">Shipping Under Review</div>
            <div className="text-sm text-gray-600">Oversized items require manual review. Cost pending.</div>
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