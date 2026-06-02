'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { scrollCustomizationSectionIntoView } from '../../lib/scrollCustomizationSection';

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function normalizeSelectionType(value) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'single' || raw === 'one' || raw === 'radio' || raw === 'single_select') return 'single';
  if (raw === 'multi' || raw === 'multiple' || raw === 'checkbox' || raw === 'multi_select') return 'multi';
  if (raw === 'quantity' || raw === 'qty') return 'quantity';
  if (raw === 'dimension' || raw === 'dimensions' || raw === 'size') return 'dimension';
  return 'unknown';
}

export function DynamicQuoteBuilder({
  productId,
  productName,
  minQuantity: productMin = null,
  maxQuantity: productMax = null,
  prefillQuote = null,
  onQuoteReady,
}) {
   const [loading, setLoading] = useState(true);
   const [schema, setSchema] = useState(null);
   const [pools, setPools] = useState([]);
   const [shipping, setShipping] = useState(null);
   const [dimensionConfig, setDimensionConfig] = useState(null);
   const [allowCustomDimensions, setAllowCustomDimensions] = useState(false);
   const [step, setStep] = useState(0);
  const customizationSectionRef = useRef(null);
  const skipStepScrollRef = useRef(true);
  const [error, setError] = useState('');
  const [quoteSummary, setQuoteSummary] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [selections, setSelections] = useState({});
  const [widthIn, setWidthIn] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  // Shipping address is collected at checkout (not in quote builder)
  const [hasCalculated, setHasCalculated] = useState(false);
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
const artworkFileRef = useRef(null);

  const [artworkReadyChoice, setArtworkReadyChoice] = useState('');
  const [tempArtworkFiles, setTempArtworkFiles] = useState([]);
  const [artworkFiles, setArtworkFiles] = useState([]);
  const [customSizeNote, setCustomSizeNote] = useState('');
  const [artworkUploading, setArtworkUploading] = useState(false);
  const [artworkError, setArtworkError] = useState('');

  const latestCalcRequestIdRef = useRef(0);

  const poolKeySet = useMemo(
    () => new Set((pools || []).map((p) => String(p.key))),
    [pools],
  );

  const activeGroups = useMemo(() => {
    const raw = schema?.groups || [];
    return raw.filter((g) => poolKeySet.has(String(g.poolKey)));
  }, [schema, poolKeySet]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setStep(0);
        setArtworkReadyChoice('');
        setTempArtworkFiles([]);
        setArtworkFiles([]);
        setCustomSizeNote('');
        setArtworkError('');
        const res = await fetch(`/api/quote-config/${productId}`);
        if (!res.ok) throw new Error('Failed to load quote configuration');
        const json = await res.json();
        if (cancelled) return;
        if (json.mode !== 'print_product') {
          setError('This product does not support dynamic configuration.');
          setLoading(false);
          return;
        }
        setSchema(json.schema);
        setPools(json.pools || []);
        setShipping(json.shipping || { enabled: true, defaultFlatRate: 0, rules: [] });
         setDimensionConfig(json.dimensionPricing || null);
         setAllowCustomDimensions(json.allowCustomDimensions ?? false);

        // Initialize selections with first option from each pool
        const initial = {};
        for (const group of json.schema?.groups || []) {
          const pool = (json.pools || []).find((p) => p.key === group.poolKey);
          if (!pool) {
            continue;
          }
          
          // Start with no defaults; user must select.
          const selectionType = normalizeSelectionType(pool.selectionType);
          if (selectionType === 'quantity') {
            initial[group.poolKey] = '';
          } else if (selectionType === 'single') {
            initial[group.poolKey] = null;
          } else if (selectionType === 'multi') {
            initial[group.poolKey] = [];
          } else if (selectionType === 'dimension') {
            initial[group.poolKey] = null; // Dimensions are handled separately
          }
        }
        const prefillPayload = prefillQuote?.payload;
        if (prefillPayload?.selections && typeof prefillPayload.selections === 'object') {
          setSelections({ ...initial, ...prefillPayload.selections });
          if (prefillPayload.selections.width_in != null) {
            setWidthIn(String(prefillPayload.selections.width_in));
          }
          if (prefillPayload.selections.height_in != null) {
            setHeightIn(String(prefillPayload.selections.height_in));
          }
        } else {
          setSelections(initial);
        }
        if (prefillPayload?.deliveryMethod) setDeliveryMethod(prefillPayload.deliveryMethod);
        if (prefillPayload?.artworkReady) setArtworkReadyChoice('ready');
        if (Array.isArray(prefillPayload?.tempArtworkFiles)) {
          setTempArtworkFiles(prefillPayload.tempArtworkFiles);
        }
        if (Array.isArray(prefillQuote?.artworkFiles)) {
          setArtworkFiles(prefillQuote.artworkFiles);
          if (!artworkReadyChoice) setArtworkReadyChoice('ready');
        }
        if (typeof prefillQuote?.customSizeNote === 'string') {
          setCustomSizeNote(prefillQuote.customSizeNote);
        }
        if (prefillQuote?.summary) {
          setQuoteSummary(prefillQuote.summary);
          setHasCalculated(true);
          setStep((json.schema?.groups || []).length + 2);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load configuration');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [productId, prefillQuote]);

  const poolMap = useMemo(() => new Map(pools.map((p) => [p.key, p])), [pools]);

  const stepTitles = useMemo(() => {
    const g = activeGroups.length;
    const titles = [
      ...activeGroups.map((gr, index) => {
        const pool = poolMap.get(gr.poolKey);
        const title = pool?.name || gr.label;
        return `Step ${index + 1}: ${title}`;
      }),
      `Step ${g + 1}: Upload Artwork`,
      `Step ${g + 2}: Delivery Option`,
      `Step ${g + 3}: Quote Summary`,
    ];
    return titles;
  }, [activeGroups, poolMap]);

  const quantityPoolKey = useMemo(() => {
    // Prefer active schema groups so we only use pools visible for this product.
    for (const g of activeGroups) {
      const pool = poolMap.get(g.poolKey);
      if (!pool) continue;
      const key = String(pool?.key || g?.poolKey || '').toLowerCase();
      const name = String(pool?.name || '').toLowerCase();
      const normalized = normalizeSelectionType(pool.selectionType);
      if (
        normalized === 'quantity' ||
        g.useTiers ||
        key === 'quantity' ||
        key === 'qty' ||
        key.includes('quantity') ||
        name === 'quantity' ||
        name.includes('quantity')
      ) {
        return g.poolKey;
      }
    }
    // Backward-compatible fallback for older data.
    const legacy = pools.find((p) => {
      const key = String(p?.key || '').toLowerCase();
      const name = String(p?.name || '').toLowerCase();
      return (
        normalizeSelectionType(p.selectionType) === 'quantity' ||
        key === 'quantity' ||
        key === 'qty' ||
        key.includes('quantity') ||
        name === 'quantity' ||
        name.includes('quantity')
      );
    });
    return legacy?.key || null;
  }, [activeGroups, poolMap, pools]);

  const totalQuantity = useMemo(() => {
    if (!quantityPoolKey) return 0;
    const q = selections[quantityPoolKey];
    return typeof q === 'number' ? q : 0;
  }, [quantityPoolKey, selections]);

  useEffect(() => {
    if (skipStepScrollRef.current) {
      skipStepScrollRef.current = false;
      return;
    }
    scrollCustomizationSectionIntoView(customizationSectionRef);
  }, [step]);

  const handleSelectionChange = (poolKey, value) => {
    setSelections((prev) => ({ ...prev, [poolKey]: value }));
    scheduleRecalculation();
  };

  const scheduleRecalculation = debounce(() => {
    if (!hasCalculated) return;
    handleCalculate();
  }, 300);

  const handleArtworkReadyChange = (value) => {
    setArtworkReadyChoice(value);
    scheduleRecalculation();
  };

  const handleTempArtworkFilesChange = (newFiles) => {
    setTempArtworkFiles(newFiles);
    scheduleRecalculation();
  };

  const handleArtworkFilesChange = (files) => {
    setArtworkFiles(files);
    scheduleRecalculation();
  };

  const handleCustomSizeNoteChange = (note) => {
    setCustomSizeNote(note);
    scheduleRecalculation();
  };

  const getPrintSizePoolKey = () => {
    for (const g of activeGroups) {
      const pool = poolMap.get(g.poolKey);
      const poolName = String(pool?.name || '').toLowerCase();
      const poolKeyLower = String(g.poolKey || pool?.key || '').toLowerCase();
      const isPrintSizePool =
        poolKeyLower === 'print_sizes' ||
        poolKeyLower.includes('print_sizes') ||
        poolName === 'print size' ||
        poolName.includes('print size');
      if (isPrintSizePool) return g.poolKey;
    }
    return null;
  };

  const handleCalculate = async () => {
    setError('');
    setQuoteSummary(null);

    if (!artworkReadyChoice) {
      setError('Please indicate whether your artwork is ready.');
      setHasCalculated(false);
      return;
    }
    if (artworkReadyChoice === 'ready' && tempArtworkFiles.length === 0) {
      setError('Please upload at least one artwork file, or choose “I don’t have my artwork ready”.');
      setHasCalculated(false);
      return;
    }

    const qtyPool = quantityPoolKey ? poolMap.get(quantityPoolKey) : null;
    const qty = quantityPoolKey ? selections[quantityPoolKey] : null;
    if (!qtyPool || typeof qty !== 'number' || qty <= 0) {
      setError('Please enter a valid quantity.');
      setHasCalculated(false);
      return;
    }
    if (productMin != null && qty < productMin) {
      setError(`Quantity must be at least ${productMin}.`);
      setHasCalculated(false);
      return;
    }
    if (productMax != null && qty > productMax) {
      setError(`Quantity may not exceed ${productMax}.`);
      setHasCalculated(false);
      return;
    }

    const printSizePoolKey = getPrintSizePoolKey();
    const selectedPrintSize = printSizePoolKey ? selections[printSizePoolKey] : null;
    const hasPresetPrintSize =
      selectedPrintSize !== undefined &&
      selectedPrintSize !== null &&
      selectedPrintSize !== '' &&
      (!Array.isArray(selectedPrintSize) || selectedPrintSize.length > 0);
    const hasAreaPricing = dimensionConfig?.pricePerSqInch != null;
    const shouldUseCustomDimensions = hasAreaPricing && !hasPresetPrintSize;

    // Validate custom dimensions only when no preset print size is selected.
    if (shouldUseCustomDimensions) {
      const w = parseFloat(widthIn);
      const h = parseFloat(heightIn);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
        setError('Please enter a valid width and height in inches.');
        setHasCalculated(false);
        return;
      }
      if (dimensionConfig.minWidthIn != null && w < dimensionConfig.minWidthIn) {
        setError(`Width must be at least ${dimensionConfig.minWidthIn}"`);
        setHasCalculated(false);
        return;
      }
      if (dimensionConfig.maxWidthIn != null && w > dimensionConfig.maxWidthIn) {
        setError(`Width must be at most ${dimensionConfig.maxWidthIn}"`);
        setHasCalculated(false);
        return;
      }
      if (dimensionConfig.minHeightIn != null && h < dimensionConfig.minHeightIn) {
        setError(`Height must be at least ${dimensionConfig.minHeightIn}"`);
        setHasCalculated(false);
        return;
      }
      if (dimensionConfig.maxHeightIn != null && h > dimensionConfig.maxHeightIn) {
        setError(`Height must be at most ${dimensionConfig.maxHeightIn}"`);
        setHasCalculated(false);
        return;
      }
    }

    // Check if ALL active pool groups have selections (not just required ones)
    for (const g of activeGroups) {
      const pool = poolMap.get(g.poolKey);
      const val = selections[g.poolKey];

      const isEmpty =
        val === undefined ||
        val === null ||
        val === '' ||
        (Array.isArray(val) && val.length === 0);

      const poolName = String(pool?.name || '').toLowerCase();
      const poolKeyLower = String(g.poolKey || pool?.key || '').toLowerCase();
      const isPrintSizePool =
        poolKeyLower === 'print_sizes' ||
        poolKeyLower.includes('print_sizes') ||
        poolName === 'print size' ||
        poolName.includes('print size');

      // Signs & Banners: if user didn't click a preset print size, allow custom width/height
      // but show "No print size found" only if BOTH preset and custom dimensions are missing.
      if (isPrintSizePool) {
        if (isEmpty) {
          const w = parseFloat(widthIn);
          const h = parseFloat(heightIn);
          const hasValidDimensions =
            Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
          if (!hasValidDimensions) {
            setError('No print size found.');
            setHasCalculated(false);
            return;
          }
        }
        // either preset selected or dimensions provided — OK
        continue;
      }

      if (isEmpty) {
        setError(`Please select ${pool?.name || g.label}.`);
        setHasCalculated(false);
        return;
      }
    }

    // Check if delivery method is selected
    if (!deliveryMethod) {
      setError('Please select a delivery method.');
      setHasCalculated(false);
      return;
    }

    // Determine the size to use based on width and height
    let finalSize = '';
    if (shouldUseCustomDimensions) {
      const w = parseFloat(widthIn);
      const h = parseFloat(heightIn);
      if (Number.isFinite(w) && Number.isFinite(h)) {
        finalSize = `${w}" × ${h}"`;
      }
    } else {
      // Use selected size from options for non-area-based products
      // Find the first group that has size options
      for (const g of activeGroups) {
        const pool = poolMap.get(g.poolKey);
        if (!pool) continue;
        
        const val = selections[g.poolKey];
        if (val === undefined || val === null) continue;
        
        if (g.selectionType === 'quantity' || g.useTiers) {
          // For quantity groups, we don't have size options
          continue;
        } else if (Array.isArray(val)) {
          // Multi-select: get the first selected option's label
          const firstSelectedId = val[0];
          const option = pool.options?.find((o) => o.id === firstSelectedId);
          if (option) {
            finalSize = option.label;
            break;
          }
        } else {
          // Single-select: get the selected option's label
          const option = pool.options?.find((o) => o.id === val);
          if (option) {
            finalSize = option.label;
            break;
          }
        }
      }
    }

try {
      setCalculating(true);
      const requestId = ++latestCalcRequestIdRef.current;
    const dimensionSelections =
      shouldUseCustomDimensions
          ? {
              width_in: parseFloat(widthIn),
              height_in: parseFloat(heightIn),
            }
          : {};

      const payload = {
        productId,
        mode: 'print_product',
        selections: { ...selections, ...dimensionSelections },
        size: finalSize,
        deliveryMethod,
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
      if (!res.ok) throw new Error(json.error || 'Failed to calculate quote');
      if (requestId !== latestCalcRequestIdRef.current) return;
      setQuoteSummary(json);
      setStep(stepTitles.length - 1);
      setHasCalculated(true);
      if (onQuoteReady && json) {
        const customizationsDisplay = {};
        for (const g of activeGroups) {
          const pool = poolMap.get(g.poolKey);
          if (!pool) continue;
          const val = selections[g.poolKey];
          if (val === undefined || val === null) continue;
          
          const selectionType = normalizeSelectionType(pool.selectionType);
          if (selectionType === 'quantity') {
            customizationsDisplay[g.label] = String(val);
          } else if (selectionType === 'single') {
            customizationsDisplay[g.label] = pool.options?.find((o) => o.id === val)?.label ?? String(val);
          } else if (selectionType === 'multi') {
            const labels = val.map((id) => pool.options?.find((o) => o.id === id)?.label ?? id).filter(Boolean);
            customizationsDisplay[g.label] = labels.join(', ');
          } else if (selectionType === 'dimension') {
            // Dimensions are handled separately below
          }
        }
        
        // Display the size based on width and height for area-based products
        if (dimensionConfig && dimensionConfig.pricePerSqInch && widthIn && heightIn) {
          const w = parseFloat(widthIn);
          const h = parseFloat(heightIn);
          if (Number.isFinite(w) && Number.isFinite(h)) {
            customizationsDisplay['Dimensions'] = `${w}" × ${h}"`;
            customizationsDisplay['Area'] = `${(w * h).toFixed(2)} sq. in`;
          }
        }

        customizationsDisplay.Delivery =
          deliveryMethod === 'pickup' ? 'Store Pickup FREE' : 'Shipping';
        customizationsDisplay.Artwork =
          artworkReadyChoice === 'ready' ? 'Upload file now' : 'Upload file later';
        onQuoteReady({
          mode: 'print_product',
          payload,
          summary: json,
          customizationsDisplay,
        });
      }
    } catch (err) {
      if (++latestCalcRequestIdRef.current === requestId) {
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
      const qty = quoteSummary?.totalQuantity || totalQuantity || 1;
      const selections = {};
      const w = parseFloat(widthIn);
      const h = parseFloat(heightIn);
      if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
        selections.width_in = w;
        selections.height_in = h;
      }
      const res = await fetch('/api/fedex/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryMethod: 'shipping',
          items: [
            {
              id: productId,
              quantity: qty,
              quotePayload: { mode: 'print_product', selections },
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

  if (error && !schema) {
    return (
      <div className="mt-10 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (activeGroups.length === 0) {
    return (
      <div className="mt-10 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <p className="text-gray-600">No customization options configured for this product.</p>
      </div>
    );
  }

  const renderGroupStep = (group, index) => {
    const pool = poolMap.get(group.poolKey);
    if (!pool) {
      return null;
    }

    const value = selections[group.poolKey];

    const groupPoolKey = String(group?.poolKey || '').toLowerCase();
    const poolName = String(pool?.name || '').toLowerCase();
    const poolKey = String(pool?.key || '').toLowerCase();
    const isPrintSizeStep =
      poolName.includes('print size') ||
      groupPoolKey === 'print_sizes' ||
      poolKey.includes('print_size') ||
      poolKey.includes('print_sizes');
    const normalizedType = normalizeSelectionType(pool.selectionType);
    const shouldShowInlineDimensions =
      isPrintSizeStep && normalizedType !== 'dimension';

    let content;
    switch (normalizedType) {
      case 'quantity':
        content = renderQuantityStep(group, pool, value);
        break;
      case 'single':
        content = renderSingleSelectStep(group, pool, value);
        break;
      case 'multi':
        content = renderMultiSelectStep(group, pool, value);
        break;
      case 'dimension':
        content = renderDimensionStep(group, pool, value);
        break;
      default:
        content = (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{pool.name || group.label}</h3>
            <p className="text-sm text-gray-600">
              Unsupported selection type: {String(pool.selectionType || '(empty)')}. Use one of:
              single, multi, quantity, or dimension.
            </p>
          </div>
        );
    }

     if (!shouldShowInlineDimensions) return content;
     // Only show custom dimensions if allowed
     if (!allowCustomDimensions) return content;
     return (
       <div className="space-y-4">
         {content}
         <div>
           <div className="text-sm font-semibold text-gray-900 mb-2">Enter custom width and height</div>
           {renderDimensionFields()}
         </div>
       </div>
     );
  };

  const renderQuantityStep = (group, pool, value) => {
    const tiers = pool.quantityTiers || [];
    const tierFloor =
      tiers.length > 0
        ? Math.min(...tiers.map((t) => (Number.isFinite(t.minQty) ? t.minQty : 1)))
        : 1;
    const inputMin = productMin != null ? Math.max(tierFloor, productMin) : tierFloor;
    const inputMax = productMax != null ? Math.min(999999, productMax) : 999999;
    const selectedTier = Number.isFinite(value)
      ? tiers.find(
          (t) => value >= t.minQty && (t.maxQty ? value <= t.maxQty : true),
        ) || null
      : null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{pool.name || group.label}</h3>
        <p className="text-sm text-gray-600">{pool.description || 'Select the quantity you need.'}</p>
        {(productMin != null || productMax != null) && (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {productMin != null && <span>Minimum order: {productMin} pieces. </span>}
            {productMax != null && <span>Maximum order: {productMax} pieces.</span>}
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Quantity:</label>
            <input
              type="number"
              min={inputMin}
              max={inputMax}
              value={typeof value === 'number' && value > 0 ? value : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  handleSelectionChange(group.poolKey, '');
                  return;
                }
                const parsed = parseInt(raw, 10);
                if (!Number.isFinite(parsed)) return;
                const newValue = Math.min(inputMax, Math.max(inputMin, parsed));
                handleSelectionChange(group.poolKey, newValue);
              }}
              className="w-28 px-4 py-2 border border-gray-300 rounded-lg text-lg font-medium"
            />
          </div>
          
          {selectedTier && (
            <div className="text-sm text-gray-600">
              Unit Price: ${selectedTier.unitPrice.toFixed(2)} per item
              {selectedTier.maxQty && ` (${selectedTier.minQty}-${selectedTier.maxQty} items)`}
              {!selectedTier.maxQty && ` (${selectedTier.minQty}+ items)`}
            </div>
          )}
        </div>

      </div>
    );
  };

  const renderSingleSelectStep = (group, pool, value) => {
    const poolName = String(pool?.name || '').toLowerCase();
    const poolKeyLower = String(pool?.key || group?.poolKey || '').toLowerCase();
    const isPrintSizePool =
      poolName.includes('print size') ||
      poolKeyLower.includes('print_size') ||
      poolKeyLower.includes('print_sizes');
    const customDimensionEntered = (() => {
      const w = parseFloat(widthIn);
      const h = parseFloat(heightIn);
      return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
    })();
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{pool.name || group.label}</h3>
        <p className="text-sm text-gray-600">{pool.description || 'Select one option.'}</p>
        {isPrintSizePool && customDimensionEntered && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Custom width/height is active. Clicking a predefined size switches back to preset sizing.
          </p>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {pool.options?.map((opt) => {
            const selected = value === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  if (isPrintSizePool) {
                    setWidthIn('');
                    setHeightIn('');
                  }
                  handleSelectionChange(group.poolKey, opt.id);
                }}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  selected
                    ? 'border-[#29b6f6] bg-[#29b6f6]/5'
                    : 'border-gray-200 hover:border-[#29b6f6]/60'
                }`}
              >
                <div className="font-semibold text-gray-900">{opt.label}</div>
                {opt.priceModifier !== 0 && (
                  <div className="text-sm text-gray-600">
                    {opt.priceModifier > 0 ? '+' : ''}${opt.priceModifier.toFixed(2)} {pool.priceType === 'per_unit' ? 'per piece' : 'per order'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMultiSelectStep = (group, pool, value) => {
    const selectedValues = Array.isArray(value) ? value : [];
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{pool.name || group.label}</h3>
        <p className="text-sm text-gray-600">{pool.description || 'Select one or more options.'}</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {pool.options?.map((opt) => {
            const selected = selectedValues.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  const newValues = selected
                    ? selectedValues.filter(v => v !== opt.id)
                    : [...selectedValues, opt.id];
                  handleSelectionChange(group.poolKey, newValues);
                }}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  selected
                    ? 'border-[#29b6f6] bg-[#29b6f6]/5'
                    : 'border-gray-200 hover:border-[#29b6f6]/60'
                }`}
              >
                <div className="font-semibold text-gray-900">{opt.label}</div>
                {opt.priceModifier !== 0 && (
                  <div className="text-sm text-gray-600">
                    {opt.priceModifier > 0 ? '+' : ''}${opt.priceModifier.toFixed(2)} {pool.priceType === 'per_unit' ? 'per piece' : 'per order'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDimensionStep = (group, pool, value) => {
     return (
       <div className="space-y-4">
         <h3 className="text-lg font-semibold text-gray-900">{pool.name || group.label}</h3>
         <p className="text-sm text-gray-600">{pool.description || 'Enter your custom dimensions.'}</p>
         
         {allowCustomDimensions && renderDimensionFields()}
       </div>
     );
  };

  const renderDimensionFields = () => {
    const printSizePoolKey = getPrintSizePoolKey();
    const selectedPrintSize = printSizePoolKey ? selections[printSizePoolKey] : null;
    const hasPredefinedPrintSize =
      selectedPrintSize !== undefined &&
      selectedPrintSize !== null &&
      selectedPrintSize !== '' &&
      (!Array.isArray(selectedPrintSize) || selectedPrintSize.length > 0);

    if (!dimensionConfig) {
      return (
        <div className="space-y-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
          <div className="text-sm font-semibold text-gray-900">Custom Dimensions (inches)</div>
          <div className="text-xs text-gray-600">Custom size pricing is not configured for this product.</div>
        </div>
      );
    }

    const w = parseFloat(widthIn);
    const h = parseFloat(heightIn);
    const widthTooLow =
      Number.isFinite(w) && dimensionConfig?.minWidthIn != null && w < Number(dimensionConfig.minWidthIn);
    const widthTooHigh =
      Number.isFinite(w) && dimensionConfig?.maxWidthIn != null && w > Number(dimensionConfig.maxWidthIn);
    const heightTooLow =
      Number.isFinite(h) && dimensionConfig?.minHeightIn != null && h < Number(dimensionConfig.minHeightIn);
    const heightTooHigh =
      Number.isFinite(h) && dimensionConfig?.maxHeightIn != null && h > Number(dimensionConfig.maxHeightIn);

    return (
      <div className="space-y-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold text-gray-900">Custom Dimensions (inches)</div>
            <p className="text-xs text-gray-500">
              Enter your required width and height. Price is calculated by area (width × height).
            </p>
          </div>
          <div className="text-xs text-gray-600">
            {dimensionConfig.minWidthIn != null && dimensionConfig.maxWidthIn != null && (
              <div>
                Width: {dimensionConfig.minWidthIn}" – {dimensionConfig.maxWidthIn}"
              </div>
            )}
            {dimensionConfig.minHeightIn != null && dimensionConfig.maxHeightIn != null && (
              <div>
                Height: {dimensionConfig.minHeightIn}" – {dimensionConfig.maxHeightIn}"
              </div>
            )}
            {dimensionConfig.pricePerSqInch != null && (
              <div>
                Rate: ${dimensionConfig.pricePerSqInch.toFixed(4)} per sq. in
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Width (inches)</label>
            <input
              type="number"
              step="0.01"
              min={dimensionConfig.minWidthIn || 0.01}
              max={dimensionConfig.maxWidthIn || undefined}
              value={widthIn}
              onChange={(e) => {
                const next = e.target.value;
                setWidthIn(next);
                if (next !== '' || heightIn !== '') {
                  const printSizePoolKey = getPrintSizePoolKey();
                  if (printSizePoolKey) handleSelectionChange(printSizePoolKey, null);
                }
                scheduleRecalculation();
              }}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g., 24"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Height (inches)</label>
            <input
              type="number"
              step="0.01"
              min={dimensionConfig.minHeightIn || 0.01}
              max={dimensionConfig.maxHeightIn || undefined}
              value={heightIn}
              onChange={(e) => {
                const next = e.target.value;
                setHeightIn(next);
                if (next !== '' || widthIn !== '') {
                  const printSizePoolKey = getPrintSizePoolKey();
                  if (printSizePoolKey) handleSelectionChange(printSizePoolKey, null);
                }
                scheduleRecalculation();
              }}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g., 36"
            />
          </div>
        </div>
        {hasPredefinedPrintSize && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Predefined print size is selected. Start typing width/height to switch to custom size.
          </div>
        )}
        
        {/* Area Calculation Display */}
        {widthIn && heightIn && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs font-medium text-blue-900">
              Area: {(parseFloat(widthIn) * parseFloat(heightIn)).toFixed(2)} sq. inches
            </div>
            {dimensionConfig.pricePerSqInch != null ? (
              <div className="text-xs text-blue-700">
                Area price: ${(
                  parseFloat(widthIn) * parseFloat(heightIn) * dimensionConfig.pricePerSqInch
                ).toFixed(2)}
                <span className="ml-2 text-[11px] text-blue-800">
                  Rate: ${Number(dimensionConfig.pricePerSqInch).toFixed(2)} per sq. in · $
                  {(Number(dimensionConfig.pricePerSqInch) * 144).toFixed(2)} per sq. ft
                </span>
              </div>
            ) : (
              <div className="text-xs text-blue-700">Price per sq. inch not configured.</div>
            )}
          </div>
        )}
        {(widthTooLow || widthTooHigh || heightTooLow || heightTooHigh) && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {widthTooLow && <div>Width is below minimum ({dimensionConfig.minWidthIn} in).</div>}
            {widthTooHigh && <div>Width exceeds maximum ({dimensionConfig.maxWidthIn} in).</div>}
            {heightTooLow && <div>Height is below minimum ({dimensionConfig.minHeightIn} in).</div>}
            {heightTooHigh && <div>Height exceeds maximum ({dimensionConfig.maxHeightIn} in).</div>}
          </div>
        )}
      </div>
    );
  };

const handleDeliveryMethodChange = (method) => {
    setDeliveryMethod(method);
    scheduleRecalculation();
  };

  const renderDeliveryStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Delivery Option</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleDeliveryMethodChange('pickup')}
          className={`rounded-xl border px-4 py-3 text-left transition ${
            deliveryMethod === 'pickup'
              ? 'border-[#29b6f6] bg-[#29b6f6]/5'
              : 'border-gray-200 hover:border-[#29b6f6]/60'
          }`}
        >
          <div className="font-semibold text-gray-900">Store Pickup FREE</div>
          <div className="text-sm text-gray-600">Pickup at our Fair Oaks store location.</div>
        </button>
        <button
          type="button"
          onClick={() => handleDeliveryMethodChange('shipping')}
          className={`rounded-xl border px-4 py-3 text-left transition ${
            deliveryMethod === 'shipping'
              ? 'border-[#29b6f6] bg-[#29b6f6]/5'
              : 'border-gray-200 hover:border-[#29b6f6]/60'
          }`}
        >
          <div className="font-semibold text-gray-900">Shipping</div>
          <div className="text-sm text-gray-600">
            We'll ship your order to your address.
          </div>
        </button>
      </div>
      {deliveryMethod === 'pickup' && (
        <div className="space-y-1 text-sm text-gray-600">
          <a
            href="https://www.google.com/maps/search/?api=1&query=8506+Madison+Ave,+Fair+Oaks,+CA+95628"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#29b6f6] hover:underline font-medium"
          >
            📍 View store location on Google Maps
          </a>
          <p>The location of the store will appear in your orders page.</p>
        </div>
      )}
    </div>
  );

  const renderSummaryStep = () => {
    if (!quoteSummary) return null;
    const selectionLines = [];
    for (const g of activeGroups) {
      const pool = poolMap.get(g.poolKey);
      if (!pool) continue;
      const val = selections[g.poolKey];
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) continue;
      if (pool.selectionType === 'quantity') {
        selectionLines.push(`- ${g.label}: ${String(val)}`);
      } else if (pool.selectionType === 'single') {
        selectionLines.push(
          `- ${g.label}: ${pool.options?.find((o) => o.id === val)?.label ?? String(val)}`,
        );
      } else if (pool.selectionType === 'multi') {
        const labels = val.map((id) => pool.options?.find((o) => o.id === id)?.label ?? id).filter(Boolean);
        selectionLines.push(`- ${g.label}: ${labels.join(', ')}`);
      }
    }
    if (widthIn && heightIn) {
      const w = parseFloat(widthIn);
      const h = parseFloat(heightIn);
      if (Number.isFinite(w) && Number.isFinite(h)) {
        selectionLines.push(`- Dimensions: ${w}" × ${h}"`);
      }
    }
    selectionLines.push(`- Delivery: ${deliveryMethod === 'pickup' ? 'Store Pickup FREE' : 'Shipping'}`);
    selectionLines.push(
      `- Artwork: ${artworkReadyChoice === 'ready' ? 'Upload file now' : artworkReadyChoice === 'not_ready' ? 'Upload file later' : '—'}`,
    );

    const quoteLines = [
      `Quote for: ${productName}`,
      `Total Quantity: ${quoteSummary.totalQuantity} pcs`,
      `Unit Price: $${quoteSummary.unitPrice.toFixed(2)}`,
      `Subtotal: $${quoteSummary.subtotal.toFixed(2)}`,
      `Shipping: $${quoteSummary.shipping.toFixed(2)}`,
      `Grand Total: $${quoteSummary.grandTotal.toFixed(2)}`,
      '',
      'Selections:',
      ...selectionLines,
      '',
      'Charges Breakdown:',
      ...quoteSummary.lineItems.map((item) => `- ${item.label}: $${item.amount.toFixed(2)}`),
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
        <h3 className="text-lg font-semibold text-gray-900">Quote Summary</h3>
        <div ref={printableQuoteRef} id="printable-quote" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">Quote Summary</div>
              <div className="text-lg font-bold text-gray-900">{productName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">${quoteSummary.grandTotal.toFixed(2)}</div>
              <div className="text-xs text-gray-500">
                {quoteSummary.totalQuantity} pcs · ${quoteSummary.unitPrice.toFixed(2)} per piece
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-4">
            <div className="text-xs font-semibold uppercase text-gray-500 mb-2">Charges Breakdown</div>
            <ul className="space-y-1 text-sm text-gray-900">
              {quoteSummary.lineItems.map((item, idx) => (
                <li key={`${item.label}-${idx}`} className="flex justify-between">
                  <span>{item.label}</span>
                  <span>${item.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-4 sm:px-6 py-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${quoteSummary.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>${quoteSummary.shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Grand Total</span>
              <span>${quoteSummary.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
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
            <Button type="button" variant="outline" onClick={handleEstimateShipping} disabled={estimatingShipping}>
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

  const renderArtworkStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Upload Artwork</h3>
      <p className="text-sm text-gray-600">
        Share your print-ready art, or tell us you need design help later.
      </p>
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name="dq-artwork-ready"
            checked={artworkReadyChoice === 'ready'}
            onChange={() => handleArtworkReadyChange('ready')}
          />
          Upload file now
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name="dq-artwork-ready"
            checked={artworkReadyChoice === 'not_ready'}
            onChange={() => handleArtworkReadyChange('not_ready')}
          />
          Upload file later
        </label>
      </div>
      {artworkReadyChoice === 'ready' && (
        <div className="space-y-2">
          <button
            type="button"
            disabled={artworkUploading}
            aria-label="Upload artwork image"
            onClick={() => artworkFileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {artworkUploading ? 'Uploading...' : 'Upload artwork image'}
          </button>
          <input
            ref={artworkFileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            tabIndex={-1}
            aria-hidden={true}
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
                 if (data?.tempId) handleTempArtworkFilesChange([...tempArtworkFiles, data.tempId]);
               } catch (err) {
                 setArtworkError(err.message || 'Failed to upload artwork');
               } finally {
                 setArtworkUploading(false);
                 if (e.target) e.target.value = '';
               }
             }}
          />
          {artworkError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {artworkError}
            </div>
          )}
          {tempArtworkFiles.length > 0 && (
            <div className="text-xs text-gray-600">{tempArtworkFiles.length} artwork file(s) uploaded.</div>
          )}
          {artworkFiles.length > 0 && (
            <div className="text-xs text-gray-600">{artworkFiles.length} existing artwork file(s) will be reused.</div>
          )}
        </div>
      )}
      <div className="mt-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">Custom size / notes (optional)</label>
        <textarea
          value={customSizeNote}
          onChange={(e) => handleCustomSizeNoteChange(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
          placeholder="e.g., 24in x 36in, bleed on all sides..."
        />
      </div>
    </div>
  );

  const artworkStepIndex = activeGroups.length;
  const deliveryStepIndex = activeGroups.length + 1;

  const renderStepContent = () => {
    if (step < activeGroups.length) {
      return renderGroupStep(activeGroups[step], step);
    }
    if (step === artworkStepIndex) return renderArtworkStep();
    if (step === deliveryStepIndex) return renderDeliveryStep();
    return renderSummaryStep();
  };

  const canGoNext = () => {
    if (step < activeGroups.length) {
      const currentGroup = activeGroups[step];
      const pool = poolMap.get(currentGroup.poolKey);
      const currentValue = selections[currentGroup.poolKey];

      if (!pool) return false;

      const poolName = String(pool?.name || '').toLowerCase();
      const poolKeyLower = String(pool?.key || '').toLowerCase();
      const isPrintSizePool =
        poolName.includes('print size') || poolKeyLower.includes('print_sizes');

      const selectionType = normalizeSelectionType(pool.selectionType);
      if (selectionType === 'quantity') {
        const qty = typeof currentValue === 'number' ? currentValue : 0;
        if (qty <= 0) return false;
      } else if (selectionType === 'dimension') {
        if (dimensionConfig && dimensionConfig.pricePerSqInch && isPrintSizePool) {
          const w = parseFloat(widthIn);
          const h = parseFloat(heightIn);
          if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return false;
        }
      } else if (selectionType === 'single') {
        const hasPresetSelection =
          currentValue !== undefined && currentValue !== null && currentValue !== '';

        if (isPrintSizePool) {
          const w = parseFloat(widthIn);
          const h = parseFloat(heightIn);
          const hasValidDimensions =
            Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
          if (!hasPresetSelection && !hasValidDimensions) return false;
        } else {
          if (!hasPresetSelection) return false;
        }
      } else if (selectionType === 'multi') {
        if (!Array.isArray(currentValue) || currentValue.length === 0) {
          return false;
        }
      }
    }

    if (step === artworkStepIndex) {
      return (
        Boolean(artworkReadyChoice) &&
        (artworkReadyChoice === 'not_ready' || tempArtworkFiles.length > 0 || artworkFiles.length > 0)
      );
    }

    if (step === deliveryStepIndex) {
      return Boolean(deliveryMethod);
    }

    return true;
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
    if (!canGoNext()) return;
    setStep((s) => Math.min(stepTitles.length - 1, s + 1));
  };

  return (
    <section ref={customizationSectionRef} className="mt-6 sm:mt-10">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6 md:p-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Customize & Get Instant Quote</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure your {productName} and generate a detailed quote.
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
              {step < stepTitles.length - 1 && (
                <Button
                  type="button"
                  className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white w-full sm:w-auto"
                  onClick={handleNextStep}
                  disabled={!canGoNext()}
                >
                  Next Step
                </Button>
              )}
              {!hasCalculated && step === stepTitles.length - 1 && (
                <Button
                  type="button"
                  className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white w-full sm:w-auto"
                  onClick={handleCalculate}
                  disabled={calculating || !canGoNext()}
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
