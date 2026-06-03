'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DynamicQuoteBuilder } from './DynamicQuoteBuilder';
import { scrollCustomizationSectionIntoView } from '../../lib/scrollCustomizationSection';

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function QuoteBuilder({
  productId,
  productName,
  productCategory,
  minQuantity: minQuantityProp,
  maxQuantity: maxQuantityProp,
  prefillQuote = null,
  onQuoteReady,
}) {
  const [loading, setLoading] = useState(true);
  const [configMode, setConfigMode] = useState(null);
  const [config, setConfig] = useState(null);
  const [productSettings, setProductSettings] = useState(null);
  const [step, setStep] = useState(0);
  const customizationSectionRef = useRef(null);
  const skipStepScrollRef = useRef(true);
  const [error, setError] = useState('');
  const [quoteSummary, setQuoteSummary] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [artworkReadyChoice, setArtworkReadyChoice] = useState('');
  const [tempArtworkFiles, setTempArtworkFiles] = useState([]);
  const [artworkFiles, setArtworkFiles] = useState([]);
  const [customSizeNote, setCustomSizeNote] = useState('');
  const [artworkUploading, setArtworkUploading] = useState(false);
  const [artworkError, setArtworkError] = useState('');
  const [estimateZip, setEstimateZip] = useState('');
  const [estimatingShipping, setEstimatingShipping] = useState(false);
  const [estimatedShipping, setEstimatedShipping] = useState(null);
  const [estimateError, setEstimateError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [showTextForm, setShowTextForm] = useState(false);
  const [countryCode, setCountryCode] = useState('');
const [phoneNumber, setPhoneNumber] = useState('');
const [shareFeedback, setShareFeedback] = useState('');
const printableQuoteRef = useRef(null);

  const [decorationId, setDecorationId] = useState(null);
  const [colorId, setColorId] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [printLocationIds, setPrintLocationIds] = useState([]);
  const [turnaroundId, setTurnaroundId] = useState(null);
  const [designerHelpId, setDesignerHelpId] = useState(null);
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  // Shipping address is collected at checkout (not in quote builder)
  const [useMyCloth, setUseMyCloth] = useState(false);
  const [fabricChoice, setFabricChoice] = useState('');
  const isCustomApparels = /custom\s*apparel/i.test(String(productCategory || ''));

  const latestCalcRequestIdRef = useRef(0);
  const hasEverCalculatedRef = useRef(false);

  useEffect(() => {
    if (hasCalculated) hasEverCalculatedRef.current = true;
  }, [hasCalculated]);

  const quantityMin = useMemo(() => {
    if (minQuantityProp == null || minQuantityProp === '') return null;
    const n = Number(minQuantityProp);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [minQuantityProp]);

  const quantityMax = useMemo(() => {
    if (maxQuantityProp == null || maxQuantityProp === '') return null;
    const n = Number(maxQuantityProp);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [maxQuantityProp]);

  const stepTitles = useMemo(
    () =>
      isCustomApparels
        ? [
            'Step 1: Fabric Availability',
            'Step 2: Select Decoration Option',
            'Step 3: Select Color',
            'Step 4: Select Sizes & Quantities',
            'Step 5: Select Printing Location',
            'Step 6: Select Turnaround Time',
            'Step 7: Upload Artwork',
            'Step 8: Need Designer Help?',
            'Step 9: Delivery Option',
            'Step 10: Quote Summary',
          ]
        : [
            'Step 1: Select Decoration Option',
            'Step 2: Select Color',
            'Step 3: Select Sizes & Quantities',
            'Step 4: Select Printing Location',
            'Step 5: Select Turnaround Time',
            'Step 6: Upload Artwork',
            'Step 7: Need Designer Help?',
            'Step 8: Delivery Option',
            'Step 9: Quote Summary',
          ],
    [isCustomApparels],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/quote-config/${productId}`);
        if (!res.ok) throw new Error('Failed to load quote configuration');
        const json = await res.json();
        if (cancelled) return;

        if (json.mode === 'print_product') {
          setConfigMode('print_product');
          setLoading(false);
          return;
        }

        setConfigMode('apparel');
        setConfig(json.config);
        setProductSettings(json.productSettings);
        // Don't auto-select any options by default; user must choose.
        setDecorationId(null);
        setColorId(null);
        setTurnaroundId(null);
        setDesignerHelpId(null);

        const initialQuantities = {};
        (json.productSettings?.sizeOptionIds || []).forEach((id) => {
          initialQuantities[id] = 0;
        });
        setQuantities(initialQuantities);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load quote configuration');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    const p = prefillQuote?.payload;
    if (!p || !config) return;
    if (p.decorationOptionId) setDecorationId(p.decorationOptionId);
    if (p.colorOptionId) setColorId(p.colorOptionId);
    if (p.turnaroundOptionId) setTurnaroundId(p.turnaroundOptionId);
    if (p.designerHelpOptionId) setDesignerHelpId(p.designerHelpId);
    if (Array.isArray(p.printLocationIds)) setPrintLocationIds(p.printLocationIds);
    if (p.deliveryMethod) setDeliveryMethod(p.deliveryMethod);
    if (p.isCustomApparels) setFabricChoice(p.useMyCloth ? 'own' : 'shop');
    if (Array.isArray(p.quantities)) {
      const next = {};
      p.quantities.forEach(({ sizeId, quantity }) => {
        if (sizeId) next[sizeId] = Number(quantity || 0);
      });
      setQuantities(next);
    }
    if (p.artworkReady) setArtworkReadyChoice('ready');
    else if (p.artworkReady === false) setArtworkReadyChoice('later');
    if (Array.isArray(p.tempArtworkFiles)) setTempArtworkFiles(p.tempArtworkFiles);
    // Restore artworkFiles and customSizeNote
    if (Array.isArray(p.artworkFiles)) setArtworkFiles(p.artworkFiles);
    if (p.customSizeNote) setCustomSizeNote(p.customSizeNote);
    // If we have restored artworkFiles, treat artwork as already available
    if (Array.isArray(p.artworkFiles) && p.artworkFiles.length > 0) {
      setArtworkReadyChoice('ready');
    }
    if (prefillQuote.summary) {
      setQuoteSummary(prefillQuote.summary);
      setHasCalculated(true);
    }
  }, [prefillQuote, config]);

  const availableSizes = useMemo(() => {
    if (!config || !productSettings) return [];
    return config.sizes
      .filter((s) => productSettings.sizeOptionIds.includes(s.id))
      .map((s) => ({
        ...s,
        // Use custom price if available, otherwise use global
        priceAddon: productSettings.customPrices?.sizes?.[s.id] ?? s.priceAddon,
      }));
  }, [config, productSettings]);

  // Helper to get effective price for an option (custom or global)
  const getEffectivePrice = (type, id, globalPrice) => {
    if (!productSettings?.customPrices?.[type]) return globalPrice;
    const customPrice = productSettings.customPrices[type][id];
    return customPrice !== null && customPrice !== undefined ? customPrice : globalPrice;
  };

  const totalQuantity = useMemo(
    () => Object.values(quantities).reduce((sum, v) => sum + (v || 0), 0),
    [quantities],
  );

  useEffect(() => {
    if (skipStepScrollRef.current) {
      skipStepScrollRef.current = false;
      return;
    }
    scrollCustomizationSectionIntoView(customizationSectionRef);
  }, [step]);

  const handleSizeQtyChange = (sizeId, delta) => {
    invalidateQuote();
    setQuantities((prev) => {
      const current = prev[sizeId] || 0;
      const proposed = Math.max(0, current + delta);
      const next = { ...prev, [sizeId]: proposed };
      const newTotal = Object.values(next).reduce((sum, v) => sum + (v || 0), 0);
      if (quantityMax != null && newTotal > quantityMax) {
        const excess = newTotal - quantityMax;
        const capped = Math.max(0, proposed - excess);
        return { ...prev, [sizeId]: capped };
      }
      if (quantityMin != null && newTotal < quantityMin && delta < 0) {
        return prev;
      }
      return next;
    });
    scheduleRecalculation();
  };

  const handleSizeQtyInput = (sizeId, value) => {
    invalidateQuote();
    const numValue = parseInt(value, 10) || 0;
    setQuantities((prev) => {
      const others = Object.entries(prev)
        .filter(([id]) => id !== sizeId)
        .reduce((sum, [, v]) => sum + (v || 0), 0);
      let nextVal = Math.max(0, numValue);
      if (quantityMax != null) {
        nextVal = Math.min(nextVal, Math.max(0, quantityMax - others));
      }
      return { ...prev, [sizeId]: nextVal };
    });
    scheduleRecalculation();
  };

// Helper function to recalculate quote with new quantities
  const recalculateQuote = async (newQuantities) => {
    invalidateQuote();
    // Check if total quantity is still valid
    const newTotal = Object.values(newQuantities).reduce((sum, v) => sum + (v || 0), 0);
    if (newTotal <= 0) {
      setError('Total quantity must be at least 1.');
      return false;
    }
    if (quantityMin != null && newTotal < quantityMin) {
      setError(`Total quantity must be at least ${quantityMin}.`);
      return false;
    }
    if (quantityMax != null && newTotal > quantityMax) {
      setError(`Total quantity may not exceed ${quantityMax}.`);
      return false;
    }

    // Recalculate the quote
    setError('');
    const requestId = ++latestCalcRequestIdRef.current;
    try {
      setCalculating(true);
      const payload = {
        productId,
        decorationOptionId: decorationId,
        colorOptionId: colorId,
        quantities: Object.entries(newQuantities)
          .filter(([, qty]) => (qty || 0) > 0)
          .map(([sizeId, qty]) => ({ sizeId, quantity: qty })),
        printLocationIds,
        turnaroundOptionId: turnaroundId,
        designerHelpOptionId: designerHelpId,
        deliveryMethod,
        isCustomApparels,
        useMyCloth: fabricChoice === 'own',
        artworkReady: artworkReadyChoice === 'ready',
        tempArtworkFiles,
        artworkFiles,
        customSizeNote,
      };

      const res = await fetch('/api/quote/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to recalculate quote');
      }
      if (requestId !== latestCalcRequestIdRef.current) return false;
      setQuoteSummary(json);
      setQuantities(newQuantities);
      if (onQuoteReady && json) {
        const customizationsDisplay = config
          ? {
              Color: config.colors.find((c) => c.id === colorId)?.name ?? '—',
              Decoration: config.decorations.find((d) => d.id === decorationId)?.name ?? '—',
              Turnaround: config.turnarounds.find((t) => t.id === turnaroundId)?.name ?? '—',
              'Designer Help': config.designerHelp.find((d) => d.id === designerHelpId)?.name ?? '—',
              'Print Locations': printLocationIds.length
                ? printLocationIds
                    .map((id) => config.printLocations.find((p) => p.id === id)?.label)
                    .filter(Boolean)
                    .join(', ')
                : '—',
              'Size Breakdown': availableSizes
                .filter((s) => (newQuantities[s.id] || 0) > 0)
                .map((s) => `${s.label}×${newQuantities[s.id]}`)
                .join(', '),
              Delivery: deliveryMethod === 'pickup' ? 'Store Pickup FREE' : 'Shipping',
              ...(isCustomApparels
                ? {
                    Fabric:
                      fabricChoice === 'own'
                        ? 'I have my own fabric'
                        : "I don't have my own fabric",
                  }
                : {}),
              Artwork: artworkReadyChoice === 'ready' ? 'Upload file now' : 'Upload file later',
            }
          : {};
        onQuoteReady({ mode: 'apparel', payload, summary: json, customizationsDisplay });
      }
      return true;
    } catch (err) {
      if (requestId === latestCalcRequestIdRef.current) {
        setError(err.message || 'Failed to recalculate quote');
      }
      return false;
    } finally {
      setCalculating(false);
    }
  };

  const hasEverCalculatedRef = useRef(false);

  const invalidateQuote = () => {
    if (!hasCalculated) return;
    setQuoteSummary(null);
    setHasCalculated(false);
  };

  const scheduleRecalculation = debounce(() => {
    if (!hasCalculated && !hasEverCalculatedRef.current) return;
    handleCalculate();
  }, 300);

  // Handler for changing quantity in the summary step - triggers recalculation
  const handleSummaryQtyChange = async (sizeId, delta) => {
    const current = quantities[sizeId] || 0;
    const proposed = Math.max(0, current + delta);
    const next = { ...quantities, [sizeId]: proposed };
    const newTotal = Object.values(next).reduce((sum, v) => sum + (v || 0), 0);
    let newQuantities = next;
    if (quantityMax != null && newTotal > quantityMax) {
      const excess = newTotal - quantityMax;
      newQuantities = { ...quantities, [sizeId]: Math.max(0, proposed - excess) };
    } else if (quantityMin != null && newTotal < quantityMin && delta < 0) {
      return;
    }
    await recalculateQuote(newQuantities);
  };

  // Handler for direct input in summary step - triggers recalculation
  const handleSummaryQtyInput = async (sizeId, value) => {
    const numValue = parseInt(value, 10) || 0;
    const others = Object.entries(quantities)
      .filter(([id]) => id !== sizeId)
      .reduce((sum, [, v]) => sum + (v || 0), 0);
    let nextVal = Math.max(0, numValue);
    if (quantityMax != null) {
      nextVal = Math.min(nextVal, Math.max(0, quantityMax - others));
    }
    const newQuantities = { ...quantities, [sizeId]: nextVal };
    await recalculateQuote(newQuantities);
  };

  const togglePrintLocation = (id) => {
    invalidateQuote();
    setPrintLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    scheduleRecalculation();
  };

  const handleDecorationChange = (id) => {
    invalidateQuote();
    setDecorationId(id);
    scheduleRecalculation();
  };

  const handleColorChange = (id) => {
    invalidateQuote();
    setColorId(id);
    scheduleRecalculation();
  };

  const handleTurnaroundChange = (id) => {
    invalidateQuote();
    setTurnaroundId(id);
    scheduleRecalculation();
  };

  const handleDesignerHelpChange = (id) => {
    invalidateQuote();
    setDesignerHelpId(id);
    scheduleRecalculation();
  };

  const handleDeliveryMethodChange = (method) => {
    invalidateQuote();
    setDeliveryMethod(method);
    scheduleRecalculation();
  };

  const handleArtworkReadyChange = (value) => {
    invalidateQuote();
    setArtworkReadyChoice(value);
    scheduleRecalculation();
  };

  const handleTempArtworkFilesChange = (files) => {
    invalidateQuote();
    setTempArtworkFiles(files);
    scheduleRecalculation();
  };

  const handleArtworkFilesChange = (files) => {
    invalidateQuote();
    setArtworkFiles(files);
    scheduleRecalculation();
  };

  const handleCustomSizeNoteChange = (note) => {
    invalidateQuote();
    setCustomSizeNote(note);
    scheduleRecalculation();
  };

  const handleFabricChoiceChange = (choice) => {
    invalidateQuote();
    setFabricChoice(choice);
    setUseMyCloth(choice === 'own');
    scheduleRecalculation();
  };

  const isReadyForCalculation = () => {
    const finalStepIndex = stepTitles.length - 2; // Delivery step index
    if (step < finalStepIndex) return false;
    if (isCustomApparels && !fabricChoice) return false;
    if (!decorationId) return false;
    if (!colorId) return false;
    if (totalQuantity <= 0) return false;
    if (!turnaroundId) return false;
    if (!designerHelpId) return false;
    if (quantityMin != null && totalQuantity < quantityMin) return false;
    if (quantityMax != null && totalQuantity > quantityMax) return false;
    if (!deliveryMethod) return false;
    if (!artworkReadyChoice) return false;
    if (artworkReadyChoice === 'ready' && tempArtworkFiles.length === 0 && artworkFiles.length === 0) return false;
    return true;
  };

 const handleCalculate = async () => {
    invalidateQuote();
    setError('');

    if (!isReadyForCalculation()) {
      setError('Please complete all customization steps before calculating your price.');
      return;
    }

    try {
      setCalculating(true);
      const requestId = ++latestCalcRequestIdRef.current;

      // Add dimension data if available
      const payload = {
        productId,
        decorationOptionId: decorationId,
        colorOptionId: colorId,
        quantities: Object.entries(quantities)
          .filter(([, qty]) => (qty || 0) > 0)
          .map(([sizeId, qty]) => ({ sizeId, quantity: qty })),
        printLocationIds,
        turnaroundOptionId: turnaroundId,
        designerHelpOptionId: designerHelpId,
        deliveryMethod,
        isCustomApparels,
        useMyCloth: fabricChoice === 'own',
        artworkReady: artworkReadyChoice === 'ready',
        tempArtworkFiles,
        artworkFiles,
        customSizeNote,
      };

      const res = await fetch('/api/quote/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to calculate quote');
      }
      if (requestId !== latestCalcRequestIdRef.current) return;
      setQuoteSummary(json);
      setStep(stepTitles.length - 1);
      setHasCalculated(true);
      if (onQuoteReady && json) {
        const customizationsDisplay = config
          ? {
              Color: config.colors.find((c) => c.id === colorId)?.name ?? '—',
              Decoration: config.decorations.find((d) => d.id === decorationId)?.name ?? '—',
              Turnaround: config.turnarounds.find((t) => t.id === turnaroundId)?.name ?? '—',
              'Designer Help': config.designerHelp.find((d) => d.id === designerHelpId)?.name ?? '—',
              'Print Locations': printLocationIds.length
                ? printLocationIds
                    .map((id) => config.printLocations.find((p) => p.id === id)?.name)
                    .filter(Boolean)
                    .join(', ')
                : '—',
              'Size Breakdown': availableSizes
                .filter((s) => (quantities[s.id] || 0) > 0)
                .map((s) => `${s.label}×${quantities[s.id]}`)
                .join(', '),
              Delivery: deliveryMethod === 'pickup' ? 'Store Pickup FREE' : 'Shipping',
              ...(isCustomApparels
                ? {
                    Fabric:
                      fabricChoice === 'own'
                        ? 'I have my own fabric'
                        : "I don't have my own fabric",
                  }
                : {}),
              Artwork: artworkReadyChoice === 'ready' ? 'Upload file now' : 'Upload file later',
            }
          : {};
        onQuoteReady({ mode: 'apparel', payload, summary: json, customizationsDisplay });
      }
    } catch (err) {
      if (requestId === latestCalcRequestIdRef.current) {
        setError(err.message || 'Failed to calculate quote');
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleEstimateShipping = async () => {
    const zip = estimateZip.trim();
    if (!zip) {
      setEstimateError('Please enter ZIP code.');
      return;
    }
    if (!/^\d{5}$/.test(zip)) {
      setEstimateError('ZIP code must be exactly 5 digits.');
      return;
    }
    try {
      setEstimatingShipping(true);
      setEstimateError('');
      const res = await fetch('/api/fedex/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryMethod: 'shipping',
          items: [
            {
              id: productId,
              quantity: totalQuantity || 1,
              quotePayload: { mode: 'apparel', selections: {} },
            },
          ],
          shippingAddress: { zip },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!json.success || !Array.isArray(json.rates) || json.rates.length === 0) {
        throw new Error(json.message || json.error || 'Failed to estimate shipping');
      }
      const amount = Number(json.amount ?? json.rates[0]?.cost);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('No FedEx rates found for this ZIP.');
      }
      setEstimatedShipping(amount);
    } catch (err) {
      setEstimateError(err.message || 'Failed to estimate shipping');
    } finally {
      setEstimatingShipping(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-10 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <p className="text-gray-600">Loading quote options...</p>
      </div>
    );
  }

  if (configMode === 'print_product') {
    return (
      <DynamicQuoteBuilder
        productId={productId}
        productName={productName}
        minQuantity={quantityMin}
        maxQuantity={quantityMax}
        prefillQuote={prefillQuote}
        onQuoteReady={onQuoteReady}
      />
    );
  }

  if (!productSettings?.enabled) {
    return null;
  }

  const renderFabricStep = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Step 1 - Fabric Availability</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="fabricChoice"
              checked={fabricChoice === 'own'}
              onChange={() => handleFabricChoiceChange('own')}
            />
            I have my own fabric
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="fabricChoice"
              checked={fabricChoice === 'need'}
              onChange={() => handleFabricChoiceChange('need')}
            />
            I don&apos;t have my own fabric
          </label>
        </div>
      </div>
    );
  };

  const renderDecorationStep = () => {
    const options = config.decorations.filter((d) =>
      productSettings.decorationOptionIds.includes(d.id),
    );
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Step 2 – Select Decoration Option</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {options.map((opt) => {
            const effectivePrice = getEffectivePrice('decorations', opt.id, opt.priceModifier);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleDecorationChange(opt.id)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  decorationId === opt.id
                    ? 'border-[#29b6f6] bg-[#29b6f6]/5 shadow-sm'
                    : 'border-gray-200 hover:border-[#29b6f6]/60 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-gray-900">{opt.name}</div>
                {effectivePrice !== 0 && (
                  <div className="text-sm text-gray-600">
                    +${effectivePrice.toFixed(2)} per piece
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderColorStep = () => {
    const options = config.colors.filter((c) =>
      productSettings.colorOptionIds.includes(c.id),
    );
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Step 3 – Select Color</h3>
        <div className="flex flex-wrap gap-4">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleColorChange(opt.id)}
              className={`flex flex-col items-center gap-2 ${
                colorId === opt.id ? 'text-gray-900' : 'text-gray-600'
              }`}
            >
              <span
                className={`w-10 h-10 rounded-full border-2 ${
                  colorId === opt.id ? 'border-[#29b6f6]' : 'border-gray-300'
                }`}
                style={{ backgroundColor: opt.hex || '#f3f4f6' }}
              />
              <span className="text-sm font-medium">{opt.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderSizesStep = () => {
    const adultSizes = availableSizes.filter(
      (size) => !String(size.id).toLowerCase().startsWith('youth-'),
    );
    const youthSizes = availableSizes.filter((size) =>
      String(size.id).toLowerCase().startsWith('youth-'),
    );

    const renderSizeGrid = (sizes) => (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {sizes.map((size) => {
          const qty = quantities[size.id] || 0;
          return (
            <div
              key={size.id}
              className="flex flex-col items-center rounded-xl border border-gray-200 bg-white px-3 py-3"
            >
              <div className="text-base font-semibold text-gray-900">{size.label}</div>
              {size.priceAddon !== 0 && (
                <div className="text-xs text-gray-500">
                  +${size.priceAddon.toFixed(2)} each
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSizeQtyChange(size.id, -1)}
                  className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  value={qty}
                  onChange={(e) => handleSizeQtyInput(size.id, e.target.value)}
                  className="w-16 text-center text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                />
                <button
                  type="button"
                  onClick={() => handleSizeQtyChange(size.id, 1)}
                  className="h-8 w-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  +
                </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTurnaroundStep = () => {
    const options = config.turnarounds.filter((t) =>
      productSettings.turnaroundOptionIds.includes(t.id),
    );
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Step 6 – Select Turnaround Time
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {options.map((opt) => {
            const active = turnaroundId === opt.id;
            const effectivePrice = getEffectivePrice('turnarounds', opt.id, opt.priceModifier);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleTurnaroundChange(opt.id)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? 'border-[#29b6f6] bg-[#29b6f6]/5 shadow-sm'
                    : 'border-gray-200 hover:border-[#29b6f6]/60 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-gray-900">{opt.name}</div>
                {effectivePrice !== 0 && (
                  <div className="text-sm text-gray-600">
                    {effectivePrice > 0 ? '+' : '-'}$
                    {Math.abs(effectivePrice).toFixed(2)} per order
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDesignerHelpStep = () => {
    const options = config.designerHelp.filter((d) =>
      productSettings.designerHelpOptionIds.includes(d.id),
    );
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Step 8 – Need Designer Help?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {options.map((opt) => {
            const active = designerHelpId === opt.id;
            const effectivePrice = getEffectivePrice('designerHelp', opt.id, opt.priceModifier);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleDesignerHelpChange(opt.id)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? 'border-[#29b6f6] bg-[#29b6f6]/5 shadow-sm'
                    : 'border-gray-200 hover:border-[#29b6f6]/60 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-gray-900">{opt.name}</div>
                {effectivePrice !== 0 && (
                  <div className="text-sm text-gray-600">
                    {effectivePrice > 0 ? '+' : '-'}$
                    {Math.abs(effectivePrice).toFixed(2)} per order
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDeliveryStep = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Step 9 – Delivery Option</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleDeliveryMethodChange('pickup')}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              deliveryMethod === 'pickup'
                ? 'border-[#29b6f6] bg-[#29b6f6]/5 shadow-sm'
                : 'border-gray-200 hover:border-[#29b6f6]/60 hover:bg-gray-50'
            }`}
          >
            <div className="font-semibold text-gray-900">Store Pickup FREE</div>
            <div className="text-sm text-gray-600">Pickup at our Fair Oaks store location.</div>
          </button>
        </div>



      </div>
    );
  };

  const getLineItemType = (item) => {
    const label = (item.label || "").toLowerCase();
    if (item.amount < 0) return "discount";
    if (
      label.includes("rush") ||
      label.includes("2 hour") ||
      label.includes("turnaround")
    )
      return "rush";
    return "normal";
  };

  const formatAmount = (amount) => {
    const abs = Math.abs(amount).toFixed(2);
    return amount < 0 ? `- $${abs}` : `$${abs}`;
  };

  const renderSummaryStep = () => {
    if (!quoteSummary) return null;
    const quoteLines = [
      `Quote for: ${productName}`,
      `Total Quantity: ${quoteSummary.totalQuantity} pcs`,
      `Unit Price: $${quoteSummary.unitPrice.toFixed(2)}`,
      `Subtotal: $${quoteSummary.subtotal.toFixed(2)}`,
      `Shipping: $${quoteSummary.shipping.toFixed(2)}`,
      `Grand Total: $${quoteSummary.grandTotal.toFixed(2)}`,
      "",
      "Selections:",
      `- Color: ${config.colors.find((c) => c.id === colorId)?.name ?? '—'}`,
      `- Decoration: ${config.decorations.find((d) => d.id === decorationId)?.name ?? '—'}`,
      `- Turnaround: ${config.turnarounds.find((t) => t.id === turnaroundId)?.name ?? '—'}`,
      `- Designer Help: ${config.designerHelp.find((d) => d.id === designerHelpId)?.name ?? '—'}`,
      `- Print Locations: ${
        printLocationIds.length === 0
          ? 'Not selected'
          : printLocationIds
              .map((id) => config.printLocations.find((p) => p.id === id)?.name)
              .filter(Boolean)
              .join(', ')
      }`,
      `- Delivery: ${deliveryMethod === 'pickup' ? 'Store Pickup FREE' : 'Shipping'}`,
      '',
      'Size Breakdown:',
      ...availableSizes
        .filter((size) => (quantities[size.id] || 0) > 0)
        .map((size) => `- ${size.label}: ${quantities[size.id] || 0}`),
      '',
      'Charges Breakdown:',
      ...quoteSummary.lineItems.map((item) => {
        const formatted = formatAmount(item.amount);
        return `- ${item.label}: ${formatted}`;
      }),
    ];
    const quoteText = quoteLines.join('\n');
    const emailSubject = `Quote - ${productName}`;

    const handleEmailQuote = () => {
      const to = emailTo.trim();
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        setError('Please enter a valid email address.');
        return;
      }
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        to,
      )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(quoteText)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleTextQuote = () => {
      const cc = countryCode.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
      const num = phoneNumber.replace(/\D/g, '');
      if (!cc || !num) {
        setError('Please enter both country code and phone number.');
        return;
      }
      const fullNumber = `${cc.startsWith('+') ? cc.slice(1) : cc}${num}`;
      const url = `https://wa.me/${encodeURIComponent(fullNumber)}?text=${encodeURIComponent(quoteText)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handlePrintQuote = () => {
      if (!printableQuoteRef.current) return;
      const printWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (!printWindow) {
        setError('Unable to open print window. Please allow pop-ups and try again.');
        return;
      }
      const headHtml = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((el) => el.outerHTML)
        .join('\n');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <base href="${window.location.origin}/" />
            <title>Quote - ${productName}</title>
            ${headHtml}
            <style>
              @page {
                size: 8.5in 11in;
                margin: 0.5in;
              }
              * {
                box-shadow: none !important;
                border-radius: 0 !important;
                text-shadow: none !important;
              }
              body {
                padding: 0 !important;
                margin: 0 !important;
                background: #fff !important;
                color: #000 !important;
              }
              #printable-quote {
                overflow: visible !important;
                box-shadow: none !important;
                border: none !important;
                background: #fff !important;
                max-width: 100% !important;
                width: 100% !important;
                page-break-inside: auto;
              }
              #printable-quote > div {
                break-inside: avoid;
              }
              #printable-quote p,
              #printable-quote li,
              #printable-quote span,
              #printable-quote div {
                orphans: 4;
                widows: 4;
              }
              #printable-quote button {
                display: none !important;
              }
              #printable-quote input {
                border: none !important;
                background: transparent !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
                -moz-appearance: textfield !important;
                -webkit-appearance: none !important;
                appearance: none !important;
              }
              #printable-quote h3,
              #printable-quote h4 {
                page-break-after: avoid;
              }
            </style>
          </head>
          <body>
            ${printableQuoteRef.current.outerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      const tryPrint = async () => {
        try {
          const doc = printWindow.document;
          if (doc?.fonts?.ready) {
            await doc.fonts.ready;
          }
          const imgs = Array.from(doc.images || []);
          await Promise.all(
            imgs.map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              });
            }),
          );
        } catch {
          // ignore
        }
        printWindow.print();
      };
      // Ensure stylesheets have a moment to apply.
      setTimeout(() => {
        tryPrint();
      }, 350);
    };

    const generateShareQuoteText = () => {
      const shareQuoteLines = [
        ...quoteLines,
        '',
        `Store Location: ${deliveryMethod === 'pickup' ? 'Fair Oaks, CA' : '—'}`,
        '',
        'Generated from Print & Shipping System',
      ];
      return shareQuoteLines.join('\n');
    };

    const handleShareQuote = async () => {
      if (!quoteSummary) return;
      const shareText = generateShareQuoteText();
      try {
        if (navigator.share) {
          await navigator.share({
            title: 'Your Quote from Print Shop',
            text: shareText,
            url: typeof window !== 'undefined' ? window.location.href : '',
          });
        } else {
          throw new Error('Web Share API not supported');
        }
      } catch {
        try {
          await navigator.clipboard.writeText(shareText);
          setShareFeedback('Quote copied to clipboard');
          setTimeout(() => setShareFeedback(''), 3000);
        } catch {
          setError('Unable to share quote. Please try again.');
        }
      }
    };

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Step 10 – Quote Summary</h3>

        <div ref={printableQuoteRef} id="printable-quote" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Quote Summary
              </div>
              <div className="text-lg font-bold text-gray-900">{productName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                ${quoteSummary.grandTotal.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                {quoteSummary.totalQuantity} pcs · $
                {quoteSummary.unitPrice.toFixed(2)} per piece
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100">
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500 mb-1">
                Color
              </div>
              <div className="text-sm text-gray-900">
                {config.colors.find((c) => c.id === colorId)?.name ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500 mb-1">
                Decoration
              </div>
              <div className="text-sm text-gray-900">
                {config.decorations.find((d) => d.id === decorationId)?.name ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500 mb-1">
                Turnaround
              </div>
              <div className="text-sm text-gray-900">
                {config.turnarounds.find((t) => t.id === turnaroundId)?.name ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500 mb-1">
                Designer Help
              </div>
              <div className="text-sm text-gray-900">
                {config.designerHelp.find((d) => d.id === designerHelpId)?.name ?? '—'}
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100">
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500 mb-2">
                Size &amp; Quantity
              </div>
              <div className="space-y-2">
                {availableSizes
                  .filter((size) => (quantities[size.id] || 0) > 0)
                  .map((size) => {
                    const qty = quantities[size.id] || 0;
                    return (
                      <div
                        key={size.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <span className="text-sm font-medium text-gray-900">{size.label}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSummaryQtyChange(size.id, -1)}
                            disabled={calculating}
                            className="h-7 w-7 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) => handleSummaryQtyInput(size.id, e.target.value)}
                            disabled={calculating}
                            className="w-16 text-center text-sm font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#29b6f6] disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={() => handleSummaryQtyChange(size.id, 1)}
                            disabled={calculating}
                            className="h-7 w-7 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Use +/− buttons or type directly in the input field to adjust quantities. Price updates automatically.
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500 mb-1">
                Print Locations
              </div>
              <div className="text-sm text-gray-900">
                {printLocationIds.length === 0
                  ? 'Not selected'
                  : printLocationIds
                      .map((id) => config.printLocations.find((p) => p.id === id)?.name)
                      .filter(Boolean)
                      .join(', ')}
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="text-xs font-semibold uppercase text-gray-500 mb-2">
              Charges Breakdown
            </div>
            <ul className="space-y-1 text-sm text-gray-900">
              {quoteSummary.lineItems.map((item) => {
                const type = getLineItemType(item);
                const colorClass =
                  type === "discount"
                    ? "text-emerald-700 font-medium"
                    : type === "rush"
                    ? "text-amber-700 font-medium"
                    : "text-gray-900";
                return (
                  <li key={item.label} className="flex justify-between">
                    <span className={colorClass}>{item.label}</span>
                    <span className={colorClass}>{formatAmount(item.amount)}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="px-4 sm:px-6 py-4 space-y-2">
            {!quoteSummary.lineItems.some((it) => it.amount < 0) && (
              <div className="flex justify-between text-sm text-gray-900">
                <span>Subtotal</span>
                <span>${quoteSummary.subtotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-900">
              <span>Shipping</span>
              <span>${quoteSummary.shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-gray-900">
              <span>Grand Total</span>
              <span>${quoteSummary.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEmailForm((v) => !v);
                setShowTextForm(false);
              }}
            >
              Email Quote
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTextForm((v) => !v);
                setShowEmailForm(false);
              }}
            >
              Text Quote
            </Button>
            <Button type="button" variant="outline" onClick={handlePrintQuote}>
              Print Quote
            </Button>
            <Button type="button" variant="outline" onClick={handleShareQuote}>
              {shareFeedback || 'Share Quote'}
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            {deliveryMethod === 'pickup' ? (
              <span>
                <span className="font-semibold">Pickup:</span> Pickup available at 8506 Madison Ave, Fair Oaks, CA 95628
              </span>
            ) : (
              <span>
                <span className="font-semibold">Shipping:</span> Estimated delivery details based on
                your location.
              </span>
            )}
          </div>
        </div>
        {showEmailForm && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-medium text-gray-900 mb-2">Send quote by email</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="Enter recipient email"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <Button type="button" onClick={handleEmailQuote} className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white">
                Open Gmail
              </Button>
            </div>
          </div>
        )}
        {showTextForm && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-medium text-gray-900 mb-2">Send quote by WhatsApp</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                placeholder="Country code (e.g. +1)"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <Button type="button" onClick={handleTextQuote} className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white">
                Open WhatsApp
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Estimated FedEx Price</h4>
          <p className="text-xs text-gray-600 mb-3">Enter ZIP code to get estimated shipping price.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={estimateZip}
              onChange={(e) => setEstimateZip(e.target.value)}
              placeholder="ZIP code"
              className="w-full sm:w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleEstimateShipping}
              disabled={estimatingShipping}
            >
              {estimatingShipping ? 'Estimating...' : 'Estimate'}
            </Button>
          </div>
          {estimateError && <div className="mt-2 text-xs text-red-700">{estimateError}</div>}
          {estimatedShipping != null && estimatedShipping > 0 && !estimateError && (
            <div className="mt-2 text-sm text-gray-900">
              Estimated shipping: <span className="font-semibold">${Number(estimatedShipping).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
  const artworkStep = (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Upload Artwork</h3>
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name="quote-artwork-ready"
            checked={artworkReadyChoice === 'ready'}
            onChange={() => setArtworkReadyChoice('ready')}
          />
          Upload file now
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name="quote-artwork-ready"
            checked={artworkReadyChoice === 'not_ready'}
            onChange={() => {
              setArtworkReadyChoice('not_ready');
              setTempArtworkFiles([]);
            }}
          />
          Upload file later
        </label>
      </div>
      {artworkFiles.length > 0 && (
        <div className="text-xs text-gray-600">
          {artworkFiles.length} existing artwork file(s) will be reused.
        </div>
      )}
      {artworkReadyChoice === 'ready' && (
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100">
            <span>{artworkUploading ? 'Uploading...' : 'Upload artwork image'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              disabled={artworkUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setArtworkUploading(true);
                  setArtworkError('');
                  const fd = new FormData();
                  fd.append('file', file);
                  const res = await fetch('/api/artwork/temp-upload', { method: 'POST', body: fd });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || 'Upload failed');
                  if (data?.tempId) setTempArtworkFiles((prev) => [...prev, data.tempId]);
                } catch (err) {
                  setArtworkError(err.message || 'Failed to upload artwork');
                } finally {
                  setArtworkUploading(false);
                  if (e.target) e.target.value = '';
                }
              }}
            />
          </label>
          {artworkError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {artworkError}
            </div>
          )}
          {tempArtworkFiles.length > 0 && (
            <div className="text-xs text-gray-600">{tempArtworkFiles.length} artwork file(s) uploaded.</div>
          )}
        </div>
      )}
    </div>
  );

    const steps = isCustomApparels
      ? [
          renderFabricStep(),
          renderDecorationStep(),
          renderColorStep(),
          renderSizesStep(),
          renderPrintLocationsStep(),
          renderTurnaroundStep(),
          artworkStep,
          renderDesignerHelpStep(),
          renderDeliveryStep(),
          renderSummaryStep(),
        ]
      : [
          renderDecorationStep(),
          renderColorStep(),
          renderSizesStep(),
          renderPrintLocationsStep(),
          renderTurnaroundStep(),
          artworkStep,
          renderDesignerHelpStep(),
          renderDeliveryStep(),
          renderSummaryStep(),
        ];

    return steps[step] || null;
  };

  const showNextStep = step < stepTitles.length - 1;

  const isStepValid = () => {
    // Validate only the current interactive step (not Quote Summary)
    const summaryStepIndex = stepTitles.length - 1;
    if (step >= summaryStepIndex) return true;

    if (isCustomApparels) {
      // Custom Apparels order:
      // 0 Fabric, 1 Decoration, 2 Color, 3 Sizes/Qty, 4 Print Locations, 5 Turnaround,
      // 6 Artwork, 7 Designer Help, 8 Delivery
      switch (step) {
        case 0:
          return Boolean(fabricChoice);
        case 1:
          return Boolean(decorationId);
        case 2:
          return Boolean(colorId);
        case 3:
          return totalQuantity > 0;
        case 4:
          return printLocationIds.length > 0;
        case 5:
          return Boolean(turnaroundId);
         case 6:
           return (
             Boolean(artworkReadyChoice) &&
             (artworkReadyChoice === 'not_ready' || tempArtworkFiles.length > 0 || artworkFiles.length > 0)
           );
        case 7:
          return Boolean(designerHelpId);
        case 8:
          return Boolean(deliveryMethod);
        default:
          return true;
      }
    }

    // Default Apparel order:
    // 0 Decoration, 1 Color, 2 Sizes/Qty, 3 Print Locations, 4 Turnaround,
    // 5 Artwork, 6 Designer Help, 7 Delivery
    switch (step) {
      case 0:
        return Boolean(decorationId);
      case 1:
        return Boolean(colorId);
      case 2:
        return totalQuantity > 0;
      case 3:
        return printLocationIds.length > 0;
      case 4:
        return Boolean(turnaroundId);
       case 5:
         return (
           Boolean(artworkReadyChoice) &&
           (artworkReadyChoice === 'not_ready' || tempArtworkFiles.length > 0 || artworkFiles.length > 0)
         );
      case 6:
        return Boolean(designerHelpId);
      case 7:
        return Boolean(deliveryMethod);
      default:
        return true;
    }
  };

  const canGoBack = () => {
    return step > 0;
  };

  const handleBack = () => {
    if (canGoBack()) {
      setStep(step - 1);
    }
  };

  const handleNextStep = () => {
    if (!isStepValid()) return;
    setStep((s) => Math.min(stepTitles.length - 1, s + 1));
  };

  return (
    <section ref={customizationSectionRef} className="mt-10">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8">
        <div className="mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customize &amp; Get Instant Quote</h2>
            <p className="text-sm text-gray-600 mt-1">
              Follow the steps below to configure your {productName} and generate a detailed quote.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="text-sm font-medium text-gray-700">
                Step {step + 1} of {stepTitles.length}: {stepTitles[step]?.replace(/^Step \d+: /, '') || 'Loading...'}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#29b6f6] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((step + 1) / stepTitles.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {renderStepContent()}

          <div className="mt-4 flex flex-col sm:flex-row justify-between border-t border-gray-100 pt-4 gap-3">
            <div className="flex gap-3 w-full sm:w-auto flex-wrap">
              {canGoBack() && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
                  onClick={handleBack}
                >
                  ← Back
                </Button>
              )}
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              {showNextStep && (
                <Button
                  type="button"
                  className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white w-full sm:w-auto"
                  onClick={handleNextStep}
                  disabled={!isStepValid()}
                >
                  Next Step
                </Button>
              )}
              {!hasCalculated && step === stepTitles.length - 1 && (
                <Button
                  type="button"
                  className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white w-full sm:w-auto"
                  onClick={handleCalculate}
                  disabled={calculating || !isReadyForCalculation()}
                >
                  {calculating ? 'Calculating...' : 'Calculate My Price'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

