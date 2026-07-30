'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { scrollCustomizationSectionIntoView } from '../../lib/scrollCustomizationSection';
import { buildInvoiceHTML, buildInvoiceSharePayload, buildInvoiceText } from '../../lib/invoiceBuilder';
import { ShippingSelector, getShippingDisplayLabel } from '../shared/ShippingSelector';
import { saveQuoteDraft, readQuoteDraft, clearQuoteDraft } from '../../lib/quoteDraft';
import { parseDimensionsFromValue } from '../../lib/quoteEngine';

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
  minOrderValue: productMinValue = null,
  maxOrderValue: productMaxValue = null,
  prefillQuote = null,
  onQuoteReady,
  weightLb = null,
  packageWidthIn = null,
  localDeliveryEligible = null,
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
const [shippingZip, setShippingZip] = useState('');
  const [hasCalculated, setHasCalculated] = useState(false);
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
  const [artworkConfirmed, setArtworkConfirmed] = useState(false);

   const latestCalcRequestIdRef = useRef(0);
   const hasEverCalculatedRef = useRef(false);
   const hydratedRef = useRef(false);
   const latestDraftRef = useRef(null);

const [zipCheckStatus, setZipCheckStatus] = useState('idle');
    const [zipCheckResult, setZipCheckResult] = useState(null);
    const [availableMethods, setAvailableMethods] = useState([]);
    const [shippingMethodsLoading, setShippingMethodsLoading] = useState(false);
    const [oversizedDetails, setOversizedDetails] = useState(null);

   useEffect(() => {
     if (hasCalculated) hasEverCalculatedRef.current = true;
   }, [hasCalculated]);

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
        if (Array.isArray(prefillPayload?.artworkFiles)) {
          setArtworkFiles(prefillPayload.artworkFiles);
          if (!artworkReadyChoice) setArtworkReadyChoice('ready');
        }
        if (
          (Array.isArray(prefillPayload?.tempArtworkFiles) && prefillPayload.tempArtworkFiles.length > 0) ||
          (Array.isArray(prefillPayload?.artworkFiles) && prefillPayload.artworkFiles.length > 0)
        ) {
          setArtworkConfirmed(true);
        }
        if (typeof prefillPayload?.customSizeNote === 'string') {
          setCustomSizeNote(prefillPayload.customSizeNote);
        }
        if (prefillQuote?.summary) {
          setQuoteSummary(prefillQuote.summary);
          setHasCalculated(true);
          setStep((json.schema?.groups || []).length + 2);
        }

        // Restore product draft (independent of the Edit-Product prefill flow).
        // Only when there is no active Edit-Product prefill, and only after
        // schema/pools have loaded (so selections can be validated).
        if (!prefillPayload) {
          const draft = readQuoteDraft(productId);
          if (draft?.payload) {
            const sanitized = sanitizeDynamicDraft(draft.payload, json.pools);
            if (sanitized) {
              applyQuotePrefill(sanitized, draft.summary, json.schema, json.pools);
            } else {
              clearQuoteDraft(productId);
            }
          }
        }
        hydratedRef.current = true;
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load configuration');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [productId, prefillQuote]);

  const applyQuotePrefill = (p, summary, schema, pools) => {
    if (p.selections && typeof p.selections === 'object') {
      setSelections({ ...p.selections });
      if (p.selections.width_in != null) setWidthIn(String(p.selections.width_in));
      if (p.selections.height_in != null) setHeightIn(String(p.selections.height_in));
    }
    if (p.deliveryMethod) setDeliveryMethod(p.deliveryMethod);
    if (p.artworkReady) setArtworkReadyChoice('ready');
    if (Array.isArray(p.tempArtworkFiles)) setTempArtworkFiles(p.tempArtworkFiles);
    if (Array.isArray(p.artworkFiles)) {
      setArtworkFiles(p.artworkFiles);
      if (!artworkReadyChoice) setArtworkReadyChoice('ready');
    }
    if (
      (Array.isArray(p.tempArtworkFiles) && p.tempArtworkFiles.length > 0) ||
      (Array.isArray(p.artworkFiles) && p.artworkFiles.length > 0)
    ) {
      setArtworkConfirmed(true);
    }
    if (typeof p.customSizeNote === 'string') setCustomSizeNote(p.customSizeNote);
    if (summary) {
      setQuoteSummary(summary);
      setHasCalculated(true);
      const groups = (schema?.groups || []).filter((g) => (pools || []).some((pl) => pl.key === g.poolKey));
      setStep(groups.length + 2);
    }
  };

  // Drop any selection whose pool no longer exists. If no valid selections
  // remain, return null so the caller clears the draft and continues with defaults.
  const sanitizeDynamicDraft = (p, pools) => {
    if (!p || typeof p.selections !== 'object' || !p.selections) return null;
    const poolKeys = new Set((pools || []).map((pl) => String(pl.key)));
    if (!poolKeys.size) return null;
    const sanitizedSelections = {};
    for (const [k, v] of Object.entries(p.selections)) {
      if (poolKeys.has(k)) sanitizedSelections[k] = v;
    }
    if (Object.keys(sanitizedSelections).length === 0) return null;
    return { ...p, selections: sanitizedSelections };
  };

  const buildDraftPayload = () => {
    const dimensionSelections =
      widthIn && heightIn && parseFloat(widthIn) > 0 && parseFloat(heightIn) > 0
        ? { width_in: parseFloat(widthIn), height_in: parseFloat(heightIn) }
        : {};
    return {
      mode: 'print_product',
      selections: { ...selections, ...dimensionSelections },
      deliveryMethod,
      shippingZip: shippingZip.trim(),
      artworkReady: artworkReadyChoice === 'ready',
      tempArtworkFiles,
      artworkFiles,
      customSizeNote,
    };
  };

  // Debounced autosave of the serializable quote payload.
  // Gated on hydration so it never overwrites a draft with empty defaults.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => {
      const draft = { payload: buildDraftPayload(), summary: quoteSummary ?? null };
      latestDraftRef.current = draft;
      saveQuoteDraft(productId, draft);
    }, 500);
    return () => clearTimeout(t);
  }, [
    selections, widthIn, heightIn, deliveryMethod, shippingZip,
    artworkReadyChoice, tempArtworkFiles, artworkFiles, customSizeNote, quoteSummary,
  ]);

  // Flush pending edits on tab hide / unload so the last <500ms changes survive.
  useEffect(() => {
    const flush = () => {
      if (!hydratedRef.current) return;
      saveQuoteDraft(productId, { payload: buildDraftPayload(), summary: quoteSummary ?? null });
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [
    productId, selections, widthIn, heightIn, deliveryMethod, shippingZip,
    artworkReadyChoice, tempArtworkFiles, artworkFiles, customSizeNote, quoteSummary,
  ]);

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

  // Track previous step to detect navigation to summary
  const prevStepRef = useRef(step);
  const summaryStepRef = useRef(null);
  const handleCalculateRef = useRef(null);
  
  // Calculate summary step index and detect when we navigate to it
  useEffect(() => {
    if (stepTitles.length > 0) {
      const summaryIndex = stepTitles.length - 1;
      summaryStepRef.current = summaryIndex;
      
      // If we just navigated to summary step (not initial load) and have no quoteSummary but have quantity
      if (prevStepRef.current !== step && step === summaryIndex && !quoteSummary && totalQuantity > 0) {
        // Trigger immediate recalculation when reaching summary with updated selections
        handleCalculateRef.current();
      }
      prevStepRef.current = step;
    }
  }, [step, stepTitles.length, quoteSummary, totalQuantity]);

  const handleSelectionChange = (poolKey, value) => {
    invalidateQuote();
    setSelections((prev) => ({ ...prev, [poolKey]: value }));
    scheduleRecalculation();
  };

const fetchShippingMethods = async (items, zip = '') => {
    setShippingMethodsLoading(true);
    try {
      const res = await fetch('/api/shipping/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shippingAddress: zip ? { zip } : {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success && Array.isArray(data.methods)) {
        setAvailableMethods(data.methods);
        if (data.oversizedDetails) {
          setOversizedDetails(data.oversizedDetails);
        }
        setShippingMethodsLoading(false);
        return data;
      }
      setAvailableMethods([]);
      setShippingMethodsLoading(false);
      return null;
    } catch {
      setAvailableMethods([]);
      setShippingMethodsLoading(false);
      return null;
    }
  };

  useEffect(() => {
    if (
      availableMethods.length > 0 &&
      !availableMethods.some((m) => m.type === deliveryMethod) &&
      availableMethods.some((m) => m.type === 'pickup')
    ) {
      setDeliveryMethod('pickup');
      setShippingZip('');
      setZipCheckStatus('idle');
      setZipCheckResult(null);
    }
  }, [availableMethods, deliveryMethod]);

const handleZipCheck = async (zip) => {
      if (!zip || zip.length !== 5) return;
      setZipCheckStatus('checking');
      setZipCheckResult(null);
      try {
        const items = [{
         id: productId,
         quantity: totalQuantity > 0 ? totalQuantity : 1,
         quotePayload: {
           mode: 'print_product',
           selections: { ...selections, ...(widthIn ? { width_in: parseFloat(widthIn), height_in: parseFloat(heightIn) } : {}) },
         },
         product: {
           weight_lb: Number(weightLb) || 0,
           package_width_in: Number(packageWidthIn) || 0,
           localDeliveryEligible: localDeliveryEligible,
         },
        }];
        const data = await fetchShippingMethods(items, zip);
        if (data) {
          setZipCheckStatus('success');
          setShippingZip(zip);
          setZipCheckResult({
            available: data.methods.some(m => m.type === 'local_delivery' && m.available !== false) || false,
            cost: data.methods.find(m => m.type === 'local_delivery')?.cost || 0,
            deliveryWindow: data.methods.find(m => m.type === 'local_delivery')?.deliveryWindow || null,
          });
        } else {
         setZipCheckStatus('unavailable');
         setZipCheckResult({ available: false, cost: 0, deliveryWindow: null });
       }
     } catch {
       setZipCheckStatus('error');
       setZipCheckResult(null);
     }
   };

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

    const artworkStepIndex = activeGroups.length;
    const deliveryStepIndex = activeGroups.length + 1;

  useEffect(() => {
       if (step === deliveryStepIndex && availableMethods.length === 0) {
         const items = [{
           id: productId,
           quantity: totalQuantity > 0 ? totalQuantity : 1,
           quotePayload: {
             mode: 'print_product',
             selections: { ...selections, ...(widthIn ? { width_in: parseFloat(widthIn), height_in: parseFloat(heightIn) } : {}) },
           },
           product: {
             weight_lb: Number(weightLb) || 0,
             package_width_in: Number(packageWidthIn) || 0,
             localDeliveryEligible: localDeliveryEligible,
           },
         }];
         fetchShippingMethods(items);
       }
     }, [step, deliveryStepIndex, availableMethods.length, productId, totalQuantity, selections, widthIn, weightLb, packageWidthIn]);

   const scheduleRecalculation = debounce(() => {
    // Read fresh value from ref to avoid stale closure
    if (!hasCalculatedRef.current && !hasEverCalculatedRef.current) return;
    handleCalculateRef.current();
  }, 300);

  const handleArtworkReadyChange = (value) => {
    invalidateQuote();
    setArtworkReadyChoice(value);
    setArtworkConfirmed(false);
    scheduleRecalculation();
  };

const handleDeliveryMethodChange = (method) => {
    invalidateQuote();
    setDeliveryMethod(method);
    if (method !== 'local_delivery') {
      setShippingZip('');
      setZipCheckStatus('idle');
      setZipCheckResult(null);
    }
  };

   const handleTempArtworkFilesChange = (newFiles) => {
    invalidateQuote();
    setTempArtworkFiles(newFiles);
    setArtworkConfirmed(false);
    scheduleRecalculation();
  };

  const handleArtworkFilesChange = (files) => {
    invalidateQuote();
    setArtworkFiles(files);
    setArtworkConfirmed(false);
    scheduleRecalculation();
  };

  const handleCustomSizeNoteChange = (note) => {
    invalidateQuote();
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
    const shouldUseCustomDimensions = hasAreaPricing && !hasPresetPrintSize && allowCustomDimensions;

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

      const requestId = ++latestCalcRequestIdRef.current;
      try {
        setCalculating(true);
    const dimensionSelections =
      shouldUseCustomDimensions
        ? {
            width_in: parseFloat(widthIn),
            height_in: parseFloat(heightIn),
          }
        : {};

    if (!shouldUseCustomDimensions) {
      const printSizePool = (pools || []).find((p) => {
        const key = String(p.key || '').toLowerCase();
        const name = String(p.name || '').toLowerCase();
        return key === 'print_sizes' || key.includes('print_sizes') || name === 'print size' || name.includes('print size');
      });
      const selectedPrintSizeId = selections[printSizePool?.key];
      if (printSizePool && selectedPrintSizeId != null) {
        const selectedOption = printSizePool.options?.find((o) => o.id === selectedPrintSizeId);
        const dimSource = selectedOption?.value || selectedOption?.label;
        if (dimSource) {
          const dims = parseDimensionsFromValue(dimSource);
          if (dims) {
            dimensionSelections.width_in = dims.width;
            dimensionSelections.height_in = dims.height;
          }
        }
      }
    }

    const payload = {
        productId,
        mode: 'print_product',
        selections: { ...selections, ...dimensionSelections },
        size: finalSize,
        deliveryMethod,
        shippingZip: shippingZip.trim(),
        shippingState: '',
        shippingCity: '',
        artworkReady: artworkReadyChoice === 'ready',
        tempArtworkFiles,
        artworkFiles,
        customSizeNote,
      };

      console.log('[DBG][FRONTEND_PAYLOAD]', {
        productId,
        widthIn,
        heightIn,
        shouldUseCustomDimensions,
        hasPresetPrintSize,
        selectedPrintSizeId: printSizePoolKey ? selections[printSizePoolKey] : null,
        selectedPrintSizeValue: (() => {
          if (!printSizePoolKey) return null;
          const pool = (pools || []).find(p => p.key === printSizePoolKey);
          const selId = selections[printSizePoolKey];
          const opt = pool?.options?.find(o => o.id === selId);
          return opt?.value ?? null;
        })(),
        dimensionSelections,
        payloadSelectionsKeys: Object.keys(payload.selections),
      });

      const res = await fetch('/api/quote/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let errMsg = 'Failed to calculate quote';
        try { const errJson = await res.json(); errMsg = errJson.error || errMsg; } catch {}
        throw new Error(errMsg);
      }
      const json = await res.json();
      if (requestId !== latestCalcRequestIdRef.current) return;
      setQuoteSummary(json);
      if (step >= stepTitles.length - 2) setStep(stepTitles.length - 1);
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

        customizationsDisplay.Delivery = getShippingDisplayLabel(deliveryMethod);
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
      if (requestId === latestCalcRequestIdRef.current) {
        setError(err.message || 'Failed to calculate quote');
      }
    } finally {
      setCalculating(false);
    }
  };

  handleCalculateRef.current = handleCalculate;


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
        <p className="text-emerald-600">{error}</p>
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
        {(productMin != null || productMax != null || productMinValue != null || productMaxValue != null) && (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {productMin != null && <span>Minimum order: {productMin} pieces. </span>}
            {productMax != null && <span>Maximum order: {productMax} pieces. </span>}
            {productMinValue != null && <span>Minimum order value: ${productMinValue}. </span>}
            {productMaxValue != null && <span>Maximum order value: ${productMaxValue}. </span>}
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
                const newValue = Math.min(inputMax, parsed);
                handleSelectionChange(group.poolKey, newValue);
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isFinite(val) || val < inputMin) {
                  handleSelectionChange(group.poolKey, inputMin);
                }
              }}
              className="w-28 px-4 py-2 border border-gray-300 rounded-lg text-lg font-medium"
            />
          </div>
          
{selectedTier && selectedTier.discountType !== 'NONE' && (
             <div className="text-sm text-gray-600">
               Discount: {selectedTier.discountType === 'PERCENT' ? selectedTier.discountValue + '%' : '$' + selectedTier.discountValue.toFixed(2)} off subtotal
               {selectedTier.maxQty && ` (${selectedTier.minQty}-${selectedTier.maxQty} items)`}
               {!selectedTier.maxQty && ` (${selectedTier.minQty}+ items)`}
             </div>
           )}
        </div>

      </div>
    );
  };

  const renderSingleSelectStep = (group, pool, value) => {
    const poolKey = pool?.key || group?.poolKey || '';
    const isPrintSizePool = poolKey === 'print_sizes';
    const optionCount = pool.options?.length ?? 0;
    const useDropdown = isPrintSizePool && optionCount > 6;
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
            Custom width/height is active. Selecting a predefined size switches back to preset sizing.
          </p>
        )}
        
        {useDropdown ? (
          <Select
            value={value || ''}
            onValueChange={(selectedValue) => {
              if (isPrintSizePool) {
                setWidthIn('');
                setHeightIn('');
              }
              handleSelectionChange(group.poolKey, selectedValue);
            }}
>
            <SelectTrigger className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-left focus:ring-2 focus:ring-[#29b6f6]">
              <SelectValue placeholder="Choose Print Size" />
            </SelectTrigger>
            <SelectContent>
              {pool.options?.map((opt) => (
                <SelectItem key={opt.id} value={opt.id} className="cursor-pointer">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{opt.label}</span>
                    {opt.pricingType === 'percentage' && opt.percentageValue != null && opt.percentageValue !== 0 ? (
                      <span className="text-sm text-gray-600">+{opt.percentageValue}%</span>
                    ) : opt.priceModifier !== 0 ? (
                      <span className="text-sm text-gray-600">
                        {opt.priceModifier > 0 ? '+' : ''}${opt.priceModifier.toFixed(2)} {pool.priceType === 'per_unit' ? 'per piece' : 'per order'}
                      </span>
                    ) : null}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
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
                  {opt.pricingType === 'percentage' && opt.percentageValue != null && opt.percentageValue !== 0 ? (
                    <div className="text-sm text-gray-600">+{opt.percentageValue}%</div>
                  ) : opt.priceModifier !== 0 ? (
                    <div className="text-sm text-gray-600">
                      {opt.priceModifier > 0 ? '+' : ''}${opt.priceModifier.toFixed(2)} {pool.priceType === 'per_unit' ? 'per piece' : 'per order'}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
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
                    : 'border-gray-200 hover:border-[#29b6f6]/60 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-gray-900">{opt.label}</div>
                {opt.pricingType === 'percentage' && opt.percentageValue != null && opt.percentageValue !== 0 ? (
                  <div className="text-sm text-gray-600">+{opt.percentageValue}%</div>
                ) : opt.priceModifier !== 0 ? (
                  <div className="text-sm text-gray-600">
                    {opt.priceModifier > 0 ? '+' : ''}${opt.priceModifier.toFixed(2)} {pool.priceType === 'per_unit' ? 'per piece' : 'per order'}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

const renderDimensionStep = (group, pool, value) => {
    if (!allowCustomDimensions) {
      return null;
    }
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{pool.name || group.label}</h3>
        <p className="text-sm text-gray-600">{pool.description || 'Enter your custom dimensions.'}</p>
        
        {renderDimensionFields()}
      </div>
    );
  };

  const renderDimensionFields = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Width (inches)</label>
          <input
            type="text"
            inputMode="decimal"
            value={widthIn}
            onChange={(e) => setWidthIn(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Height (inches)</label>
          <input
            type="text"
            inputMode="decimal"
            value={heightIn}
            onChange={(e) => setHeightIn(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
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

    const discountAmount = quoteSummary
      ? quoteSummary.lineItems
          .filter((it) => it.amount < 0)
          .reduce((sum, it) => sum + Math.abs(it.amount), 0)
      : 0;
    
    // Use live values from selections instead of cached quoteSummary
    const displayTotalQuantity = totalQuantity > 0 ? totalQuantity : quoteSummary?.totalQuantity || 0;
    
    // If no quoteSummary but we're on summary step, calculate immediately
    if (!quoteSummary) {
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Quote Summary</h3>
          <div className="text-center py-8">
            <div className="text-gray-600">Calculating your quote...</div>
          </div>
        </div>
      );
    }

    const shippingLabel = getShippingDisplayLabel(deliveryMethod);
    
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
    selectionLines.push(`- Delivery: ${getShippingMethodLabel(deliveryMethod)}`);
    selectionLines.push(
      `- Artwork: ${artworkReadyChoice === 'ready' ? 'Upload file now' : artworkReadyChoice === 'not_ready' ? 'Upload file later' : '—'}`,
    );

    const quoteLines = [
      `Quote for: ${productName}`,
      `Total Quantity: ${displayTotalQuantity} pcs`,
      `Unit Price: $${quoteSummary.unitPrice.toFixed(2)}`,
      `Subtotal: $${quoteSummary.subtotal.toFixed(2)}`,
      `Shipping: ${quoteSummary.shipping === 0 ? 'FREE' : `$${quoteSummary.shipping.toFixed(2)}`}`,
      `Grand Total: $${quoteSummary.grandTotal.toFixed(2)}`,
      '',
      'Selections:',
      ...selectionLines,
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
      if (!quoteSummary) return;
      const quoteForInvoice = {
        ...quoteSummary,
        productName,
        deliveryMethod,
        selections: {},
      };
      activeGroups.forEach((g) => {
        const pool = poolMap.get(g.poolKey);
        if (!pool) return;
        const val = selections[g.poolKey];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) return;
        if (pool.selectionType === 'quantity') {
          quoteForInvoice.selections[g.label] = String(val);
        } else if (pool.selectionType === 'single') {
          quoteForInvoice.selections[g.label] = pool.options?.find((o) => o.id === val)?.label ?? String(val);
        } else if (pool.selectionType === 'multi') {
          const labels = val.map((id) => pool.options?.find((o) => o.id === id)?.label ?? id).filter(Boolean);
          quoteForInvoice.selections[g.label] = labels.join(', ');
        }
      });
      if (widthIn && heightIn) {
        const w = parseFloat(widthIn);
        const h = parseFloat(heightIn);
        if (Number.isFinite(w) && Number.isFinite(h)) {
          quoteForInvoice.selections['Dimensions'] = `${w}" × ${h}"`;
        }
      }
      quoteForInvoice.selections['Delivery'] = getShippingMethodLabel(deliveryMethod);
      quoteForInvoice.selections['Artwork'] = artworkReadyChoice === 'ready' ? 'Upload file now' : artworkReadyChoice === 'not_ready' ? 'Upload file later' : '—';
      const encoded = btoa(encodeURIComponent(JSON.stringify(quoteForInvoice)));
      window.location.href = `/quote/print?data=${encoded}`;
    };

    const handleShareQuote = async () => {
      if (!quoteSummary) return;
      const quoteForInvoice = {
        ...quoteSummary,
        productName,
        deliveryMethod,
        selections: {},
      };
      activeGroups.forEach((g) => {
        const pool = poolMap.get(g.poolKey);
        if (!pool) return;
        const val = selections[g.poolKey];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) return;
        if (pool.selectionType === 'quantity') {
          quoteForInvoice.selections[g.label] = String(val);
        } else if (pool.selectionType === 'single') {
          quoteForInvoice.selections[g.label] = pool.options?.find((o) => o.id === val)?.label ?? String(val);
        } else if (pool.selectionType === 'multi') {
          const labels = val.map((id) => pool.options?.find((o) => o.id === id)?.label ?? id).filter(Boolean);
          quoteForInvoice.selections[g.label] = labels.join(', ');
        }
      });
      if (widthIn && heightIn) {
        const w = parseFloat(widthIn);
        const h = parseFloat(heightIn);
        if (Number.isFinite(w) && Number.isFinite(h)) {
          quoteForInvoice.selections['Dimensions'] = `${w}" × ${h}"`;
        }
      }
      quoteForInvoice.selections['Delivery'] = getShippingMethodLabel(deliveryMethod);
      quoteForInvoice.selections['Artwork'] = artworkReadyChoice === 'ready' ? 'Upload file now' : artworkReadyChoice === 'not_ready' ? 'Upload file later' : '—';
      const payload = buildInvoiceSharePayload(quoteForInvoice, { productName });
      try {
        if (navigator.share) {
          await navigator.share({
            title: payload.title,
            text: payload.text,
            url: payload.url,
          });
        } else {
          throw new Error('Web Share API not supported');
        }
      } catch {
        try {
          await navigator.clipboard.writeText(payload.fallbackText);
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
                {displayTotalQuantity} pcs · ${quoteSummary.unitPrice.toFixed(2)} per piece
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-4">
            <div className="text-xs font-semibold uppercase text-gray-500 mb-2">Charges Breakdown</div>
            <ul className="space-y-1 text-sm text-gray-900">
              {quoteSummary.lineItems.map((item, idx) => {
                const type = getLineItemType(item);
                const colorClass =
                  type === "discount"
                    ? "text-emerald-700 font-medium"
                    : type === "rush"
                    ? "text-amber-700 font-medium"
                    : "text-gray-900";
                return (
                  <li key={`${item.label}-${idx}`} className="flex justify-between">
                    <span className={colorClass}>{item.label}</span>
                    <span className={colorClass}>{formatAmount(item.amount)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="px-4 sm:px-6 py-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${quoteSummary.subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>
                Shipping {shippingLabel ? `(${shippingLabel})` : ''}
              </span>
              <span>{quoteSummary.shipping === 0 ? 'FREE' : `$${quoteSummary.shipping.toFixed(2)}`}</span>
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
          {artworkReadyChoice === 'ready' && (tempArtworkFiles.length > 0 || artworkFiles.length > 0) && (
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
              <input
                type="checkbox"
                checked={artworkConfirmed}
                onChange={(e) => setArtworkConfirmed(e.target.checked)}
                className="rounded border-gray-300 text-[#29b6f6] focus:ring-[#29b6f6]"
              />
              I confirm this is the correct artwork file.
            </label>
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

const renderDeliveryStep = () => {
    const items = [{
      id: productId,
      quantity: totalQuantity > 0 ? totalQuantity : 1,
      quotePayload: {
        mode: 'print_product',
        selections: { ...selections, ...(widthIn ? { width_in: parseFloat(widthIn), height_in: parseFloat(heightIn) } : {}) },
      },
      product: {
        weight_lb: Number(weightLb) || 0,
        package_width_in: Number(packageWidthIn) || 0,
        localDeliveryEligible: localDeliveryEligible,
      },
    }];

    const shippingDecision = oversizedDetails ? {
      isOversized: oversizedDetails.anyOversized || false,
      details: oversizedDetails,
    } : null;

return (
       <div className="space-y-4">
         <h3 className="text-lg font-semibold text-gray-900">Delivery Option</h3>
         <ShippingSelector
           selectedMethod={deliveryMethod}
           onMethodChange={handleDeliveryMethodChange}
           shippingEnabled={shipping?.enabled !== false}
           config={shipping}
           items={items}
           zipCheckStatus={zipCheckStatus}
           zipCheckResult={zipCheckResult}
           onZipCheck={handleZipCheck}
           deliveryMethod={deliveryMethod}
           methods={availableMethods}
           decision={shippingDecision}
         />
       </div>
     );
   };

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
        (artworkReadyChoice === 'not_ready' || (tempArtworkFiles.length > 0 || artworkFiles.length > 0) && artworkConfirmed)
      );
    }

    if (step === deliveryStepIndex) {
      if (deliveryMethod === 'local_delivery') {
        return Boolean(deliveryMethod) && zipCheckStatus === 'success' && zipCheckResult?.available === true;
      }
      const methodExists = availableMethods.some(m => m.type === deliveryMethod) || !availableMethods.length;
      return Boolean(deliveryMethod) && methodExists;
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
    const nextStep = Math.min(stepTitles.length - 1, step + 1);
    
    // When navigating to summary step, trigger calculation with fresh state
    if (nextStep === stepTitles.length - 1 && !quoteSummary && totalQuantity > 0) {
      handleCalculate();
    }
    
    setStep(nextStep);
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
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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

