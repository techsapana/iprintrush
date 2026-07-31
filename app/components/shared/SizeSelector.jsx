'use client';

import { useState } from 'react';

export function SizeSelector({ sizes, quantities, onQuantityChange, minQuantity = null, maxQuantity = null, stepNumber = null }) {
  const [selectedSizeId, setSelectedSizeId] = useState(sizes.length > 0 ? sizes[0].id : null);

  const adultSizes = sizes.filter(
    (size) => !String(size.id).toLowerCase().startsWith('youth-'),
  );
  const youthSizes = sizes.filter((size) =>
    String(size.id).toLowerCase().startsWith('youth-'),
  );

  const useDropdown = sizes.length > 5;
  const activeSizes = sizes.filter(s => (quantities[s.id] || 0) > 0);
  const selectedSize = sizes.find(s => s.id === selectedSizeId) || sizes[0];

  const renderSizeGrid = (sizesList) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {sizesList.map((size) => {
        const qty = quantities[size.id] || 0;
        return (
          <div
            key={size.id}
            className="flex flex-col items-center rounded-xl border border-gray-200 bg-white px-3 py-3"
          >
            <div className="text-base font-semibold text-gray-900">
              {size.label}
            </div>

            {typeof size.priceAddon === 'number' && size.priceAddon !== 0 && (
              <div className="text-xs text-gray-500">
                +${size.priceAddon.toFixed(2)} each
              </div>
            )}

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onQuantityChange(size.id, -1)}
                className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                −
              </button>

              <input
                type="number"
                min="0"
                value={qty}
                onChange={(e) => onQuantityChange(size.id, 0, e.target.value)}
                className="w-16 text-center text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
              />

              <button
                type="button"
                onClick={() => onQuantityChange(size.id, 1)}
                className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const title = stepNumber != null 
    ? `Step ${stepNumber} – Select Sizes & Quantities` 
    : 'Select Sizes & Quantities';

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {(minQuantity != null || maxQuantity != null) && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {minQuantity != null && <span>Minimum order: {minQuantity} pieces. </span>}
          {maxQuantity != null && <span>Maximum order: {maxQuantity} pieces.</span>}
        </p>
      )}

      {!useDropdown ? (
        <>
          {adultSizes.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Adult Sizes</div>
              {renderSizeGrid(adultSizes)}
            </div>
          )}
          {youthSizes.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Youth Sizes</div>
              {renderSizeGrid(youthSizes)}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-end gap-4 p-5 border border-gray-200 rounded-xl bg-gray-50 shadow-sm">
            <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Size to Add</label>
              <select 
                value={selectedSizeId || ''} 
                onChange={(e) => setSelectedSizeId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#29b6f6] focus:border-transparent outline-none"
              >
                {adultSizes.length > 0 && (
                  <optgroup label="Adult Sizes">
                    {adultSizes.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.label} {s.priceAddon ? `(+$${s.priceAddon.toFixed(2)} each)` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {youthSizes.length > 0 && (
                  <optgroup label="Youth Sizes">
                    {youthSizes.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.label} {s.priceAddon ? `(+$${s.priceAddon.toFixed(2)} each)` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {selectedSize && (
              <div className="w-full sm:w-auto flex flex-col">
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-center sm:text-left">Quantity</label>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => onQuantityChange(selectedSize.id, -1)}
                    className="h-12 w-12 flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 bg-white font-bold text-lg transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={quantities[selectedSize.id] || 0}
                    onChange={(e) => onQuantityChange(selectedSize.id, 0, e.target.value)}
                    className="w-24 h-12 text-center text-lg font-bold text-gray-900 border border-gray-300 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                  />
                  <button
                    type="button"
                    onClick={() => onQuantityChange(selectedSize.id, 1)}
                    className="h-12 w-12 flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 bg-white font-bold text-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {activeSizes.length > 0 && (
            <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-sm font-bold text-gray-900">Your Selected Sizes</h4>
              </div>
              <div className="divide-y divide-gray-100">
                {activeSizes.map(size => (
                  <div key={size.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 text-lg">{size.label}</span>
                      {typeof size.priceAddon === 'number' && size.priceAddon !== 0 && (
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                          +${size.priceAddon.toFixed(2)} each
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onQuantityChange(size.id, -1)}
                        className="h-10 w-10 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center justify-center font-bold transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={quantities[size.id] || 0}
                        onChange={(e) => onQuantityChange(size.id, 0, e.target.value)}
                        className="w-16 h-10 text-center text-base font-bold text-gray-900 border border-gray-300 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                      />
                      <button
                        type="button"
                        onClick={() => onQuantityChange(size.id, 1)}
                        className="h-10 w-10 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center justify-center font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}