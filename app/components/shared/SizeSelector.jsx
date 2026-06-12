'use client';

export function SizeSelector({ sizes, quantities, onQuantityChange, minQuantity = null, maxQuantity = null, stepNumber = null }) {
  const adultSizes = sizes.filter(
    (size) => !String(size.id).toLowerCase().startsWith('youth-'),
  );
  const youthSizes = sizes.filter((size) =>
    String(size.id).toLowerCase().startsWith('youth-'),
  );

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
    </div>
  );
}