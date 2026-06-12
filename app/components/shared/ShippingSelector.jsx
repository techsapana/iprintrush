'use client';

import { useEffect, useState } from 'react';
import {
  getShippingMethodLabel,
  getAvailableShippingMethods,
  getShippingTierSubtotalFromCartItems,
} from '../../lib/shippingEngine';

export function ShippingSelector({ selectedMethod, onMethodChange, showOversizedWarning = false, className = '', shippingEnabled = true, items = [], config: shippingConfig }) {
  const [shippingMethods, setShippingMethods] = useState([]);

  // Get methods from unified function when config is provided
  useEffect(() => {
    if (shippingConfig) {
      const shippingTierSubtotal = getShippingTierSubtotalFromCartItems(items);
      const methods = getAvailableShippingMethods(items, shippingConfig, shippingTierSubtotal);
      setShippingMethods(methods);
    } else {
      // Fallback to API call for backwards compatibility
      fetch('/api/shipping/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.methods)) {
            setShippingMethods(data.methods);
          }
        })
        .catch(() => {});
    }
  }, [shippingConfig, items]);

  const localDeliveryMethod = shippingMethods.find((m) => m.type === 'local_delivery');
  const standardShippingMethod = shippingMethods.find((m) => m.type === 'standard_shipping');
  const reviewRequiredMethod = shippingMethods.find((m) => m.type === 'review_required');

  return (
    <div className={`space-y-4 ${className}`}>
      {showOversizedWarning && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Shipping Review Required for oversized items (width exceeds 44"). Our team will contact you with shipping options.
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