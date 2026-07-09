'use client';

import { useState, useEffect } from 'react';

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

export function ShippingSelector({
  selectedMethod,
  onMethodChange,
  decision,
  shippingEnabled = true,
  className = '',
  zipCheckStatus = 'idle',
  zipCheckResult = null,
  onZipCheck,
  deliveryMethod,
  methods,
  zipValue,
  hideMethods = false,
  commitLocalDeliveryOnVerify = false,
}) {
  const [zipInputValue, setZipInputValue] = useState('');
  const [localDeliveryArmed, setLocalDeliveryArmed] = useState(false);

  const isLocalDeliverySelected = selectedMethod === 'local_delivery';
  const isZipChecking = zipCheckStatus === 'checking';
  const isZipAvailable = zipCheckStatus === 'success' && zipCheckResult?.available;
  const isZipError = zipCheckStatus === 'error';

  const activeZip = zipValue || zipInputValue;

  const handleZipInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setZipInputValue(value);
  };

  const handleCheckClick = () => {
    if (activeZip.length === 5 && onZipCheck) {
      onZipCheck(activeZip);
    }
  };

  // When commitLocalDeliveryOnVerify is enabled (checkout), clicking Local
  // Delivery only arms the ZIP entry and does NOT select the method. The method
  // is committed via onMethodChange only after ZIP verification succeeds.
  const handleMethodButtonClick = (methodType) => {
    if (methodType === 'local_delivery' && commitLocalDeliveryOnVerify) {
      setLocalDeliveryArmed(true);
      return;
    }
    setLocalDeliveryArmed(false);
    onMethodChange(methodType);
  };

  useEffect(() => {
    if (commitLocalDeliveryOnVerify && localDeliveryArmed && zipCheckStatus === 'success' && isZipAvailable) {
      setLocalDeliveryArmed(false);
      onMethodChange('local_delivery', { preserveZipVerification: true });
    }
  }, [commitLocalDeliveryOnVerify, localDeliveryArmed, zipCheckStatus, isZipAvailable, zipCheckResult, onMethodChange]);

  const showZipInput = isLocalDeliverySelected || localDeliveryArmed;
  const canCheckZip = activeZip.length === 5 && zipCheckStatus !== 'success';
  const showZipCheckButton = isLocalDeliverySelected && activeZip.length >= 5;

  const localDeliveryDisabled = isLocalDeliverySelected && !isZipAvailable && zipCheckStatus !== 'idle';

  const renderMethodButton = (method, idx) => {
    const methodType = method.type || method.id || method;
    const methodLabel = method.label || SHIPPING_METHOD_LABELS[methodType] || 'Unknown';
    const methodCost = method.cost;
    const methodWindow = method.deliveryWindow;

    const disabled = methodType === 'local_delivery' && localDeliveryDisabled && !isZipAvailable;

    return (
      <button
        key={methodType || idx}
        type="button"
        onClick={() => handleMethodButtonClick(methodType)}
        disabled={disabled}
        className={`rounded-xl border px-4 py-3 text-left transition relative ${
          selectedMethod === methodType
            ? 'border-[#29b6f6] bg-[#29b6f6]/5 shadow-sm'
            : 'border-gray-200 hover:border-[#29b6f6]/60 hover:bg-gray-50'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="font-semibold text-gray-900">{methodLabel}</div>
        {methodType === 'local_delivery' && isZipAvailable && zipCheckResult && (
          <div className="text-sm text-gray-600">
            ${Number(zipCheckResult.cost || methodCost || 0).toFixed(2)} delivery fee
            {zipCheckResult.deliveryWindow || methodWindow ? ` • Delivery: ${zipCheckResult.deliveryWindow || methodWindow}` : ''}
          </div>
        )}
        {methodType === 'local_delivery' && isZipChecking && (
          <div className="text-sm text-gray-600">Checking availability…</div>
        )}
        {methodType === 'local_delivery' && isZipError && (
          <div className="text-sm text-gray-600">Check failed - try again</div>
        )}
        {methodType === 'local_delivery' && zipCheckStatus === 'success' && !isZipAvailable && (
          <div className="text-sm text-gray-600">Not available in your area</div>
        )}
        {methodType === 'local_delivery' && zipCheckStatus === 'idle' && !isZipAvailable && (
          <div className="text-sm text-gray-600">Enter ZIP to check availability</div>
        )}
        {disabled && methodType === 'local_delivery' && !isZipAvailable && (
          <div className="absolute top-2 right-2" title="ZIP must be checked first">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0h4a5 5 0 0 1 0 4v4"></path>
            </svg>
          </div>
        )}
      </button>
    );
  };

  const renderFallbackMethods = () => (
    <>
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
      <button
        type="button"
        onClick={() => handleMethodButtonClick('local_delivery')}
        disabled={localDeliveryDisabled && !isZipAvailable}
        className={`rounded-xl border px-4 py-3 text-left transition relative ${
          selectedMethod === 'local_delivery'
            ? 'border-[#29b6f6] bg-[#29b6f6]/5 shadow-sm'
            : 'border-gray-200 hover:border-[#29b6f6]/60 hover:bg-gray-50'
        } ${localDeliveryDisabled && !isZipAvailable ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="font-semibold text-gray-900">Local Delivery</div>
        {isZipChecking && (
          <div className="text-sm text-gray-600">Checking availability…</div>
        )}
        {isZipError && (
          <div className="text-sm text-gray-600">Check failed - try again</div>
        )}
        {zipCheckStatus === 'success' && !isZipAvailable && (
          <div className="text-sm text-gray-600">Not available in your area</div>
        )}
        {zipCheckStatus === 'idle' && !isZipAvailable && (
          <div className="text-sm text-gray-600">Enter ZIP to check availability</div>
        )}
        {localDeliveryDisabled && !isZipAvailable && (
          <div className="absolute top-2 right-2" title="ZIP must be checked first">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0h4a5 5 0 0 1 0 4v4"></path>
            </svg>
          </div>
        )}
      </button>
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
        <div className="text-sm text-gray-600">Shipped via carrier</div>
      </button>
    </>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {decision?.isOversized && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <span className="font-semibold">Shipping Requires Manual Review</span>
          {decision.details?.widthExceeded && (
            <div className="mt-1">
              Width: {decision.details.widthExceeded.selectedWidth}" exceeds {decision.details.widthExceeded.maxAllowedWidth}" limit
            </div>
          )}
          {decision.details?.weightExceeded && (
            <div className="mt-1">
              Weight: {decision.details.weightExceeded.productWeight} lbs exceeds {decision.details.weightExceeded.maxAllowedWeight} lbs limit
            </div>
          )}
          <div className="mt-2">Our team will contact you with shipping options.</div>
        </div>
      )}

      {!hideMethods && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {methods ? methods.map(renderMethodButton) : renderFallbackMethods()}
        </div>
      )}

      {(isLocalDeliverySelected || localDeliveryArmed) && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          {!zipValue && (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={zipInputValue}
                onChange={handleZipInputChange}
                placeholder="Enter ZIP code"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                maxLength={5}
              />
              <button
                type="button"
                onClick={handleCheckClick}
                disabled={!canCheckZip}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  canCheckZip
                    ? 'bg-[#29b6f6] text-white hover:bg-[#1e8fc4]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isZipChecking ? 'Checking...' : 'Check Availability'}
              </button>
            </div>
          )}
          {zipValue && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">ZIP: {zipValue}</span>
              {zipCheckStatus !== 'success' && (
                <button
                  type="button"
                  onClick={handleCheckClick}
                  disabled={isZipChecking}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isZipChecking
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#29b6f6] text-white hover:bg-[#1e8fc4]'
                  }`}
                >
                  {isZipChecking ? 'Checking...' : 'Check Availability'}
                </button>
              )}
            </div>
          )}

          {zipCheckStatus === 'success' && (
            <div className={`text-sm px-3 py-2 rounded-lg ${
              isZipAvailable
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {isZipAvailable
                ? `✓ Available in your area${zipCheckResult?.deliveryWindow ? ` • Delivery window: ${zipCheckResult.deliveryWindow}` : ''}`
                : '✗ Not available in your area'}
            </div>
          )}

          {zipCheckStatus === 'error' && (
            <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ✗ Unable to verify ZIP - please try again
            </div>
          )}

          {!isZipAvailable && zipCheckStatus === 'success' && (
            <div className="text-xs text-gray-600">
              Pickup or Standard Shipping may be available instead.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function getShippingDisplayLabel(method) {
  if (!method) return 'Unknown';
  return getShippingMethodLabel(method);
}