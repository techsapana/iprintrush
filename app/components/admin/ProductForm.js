'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';
import { SAME_DAY_PRINTING_CATEGORY_SLUG } from '../../lib/siteConstants';

function pendingMainImageStorageKey(productId) {
  return `iprintrush_pending_main_image_${productId}`;
}
function pendingGalleryStorageKey(productId) {
  return `iprintrush_pending_gallery_${productId}`;
}
function pendingVideosStorageKey(productId) {
  return `iprintrush_pending_videos_${productId}`;
}
function readSessionJson(key) {
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeSessionJson(key, value) {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}
function removeSessionKey(key) {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function ProductForm({ initialProduct = null, onSubmit = null }) {
  const router = useRouter();
  const { addProduct, updateProduct, categories } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configLoading, setConfigLoading] = useState(true);
  const [quoteConfig, setQuoteConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [uploading, setUploading] = useState(false);
  const mainImageFileRef = useRef(null);
  const galleryFileRef = useRef(null);
  const videoFileRef = useRef(null);

  /** Used to detect product-id change; media fields only rehydrate when switching products, not on first edit mount (avoids clobbering uploads). */
  const previousStableProductIdRef = useRef(null);
  const initialProductRef = useRef(initialProduct);
  initialProductRef.current = initialProduct;

  const stableProductId = useMemo(() => {
    if (!initialProduct) return '';
    return String(
      initialProduct.id ?? initialProduct.product_id ?? initialProduct.productId ?? '',
    );
  }, [initialProduct?.id, initialProduct?.product_id, initialProduct?.productId]);

  // Seed initial state from sessionStorage if present (survives remounts within the same session).
  const _pid = stableProductId;
  const _pendingImage    = _pid ? (readSessionJson(pendingMainImageStorageKey(_pid)) || sessionStorage?.getItem?.(pendingMainImageStorageKey(_pid))?.trim() || null) : null;
  const _pendingGallery  = _pid ? readSessionJson(pendingGalleryStorageKey(_pid)) : null;
  const _pendingVideos   = _pid ? readSessionJson(pendingVideosStorageKey(_pid)) : null;
  /**
   * Tracks which media fields the user has manually modified in this session.
   * Once a field is dirty, no effect (product-switch rehydration, sessionStorage
   * restore, etc.) is allowed to overwrite it.
   * Keys: 'image' | 'galleryImages' | 'videos'
   * Seeded from sessionStorage so it survives component remounts within the same session.
   */
  const dirtyMediaFields = useRef((() => {
    const s = new Set();
    if (_pid) {
      if (_pendingImage) s.add('image');
      if (_pendingGallery) s.add('galleryImages');
      if (_pendingVideos) s.add('videos');
    }
    return s;
  })());

  const [imagePreview, setImagePreview] = useState(
    _pendingImage || initialProduct?.image || null
  );
  const [galleryPreviews, setGalleryPreviews] = useState(
    _pendingGallery || initialProduct?.galleryImages || []
  );
  const [videoPreviews, setVideoPreviews] = useState(
    _pendingVideos || initialProduct?.videos || []
  );

  const [formData, setFormData] = useState({
    name: initialProduct?.name || '',
    slug: initialProduct?.slug || '',
    description: initialProduct?.description || '',
    price: initialProduct?.price || '',
    mailboxPricePerMonth: initialProduct?.mailboxPricePerMonth ?? '',
    minQuantity: initialProduct?.minQuantity ?? '',
    maxQuantity: initialProduct?.maxQuantity ?? '',
    minWidthIn: initialProduct?.minWidthIn ?? '',
    maxWidthIn: initialProduct?.maxWidthIn ?? '',
    minHeightIn: initialProduct?.minHeightIn ?? '',
    maxHeightIn: initialProduct?.maxHeightIn ?? '',
    pricePerSqInch: initialProduct?.pricePerSqInch ?? '',
    oldPrice: initialProduct?.oldPrice ?? '',
    weightLb: initialProduct?.weightLb ?? '',
    packageLengthIn: initialProduct?.packageLengthIn ?? '',
    packageWidthIn: initialProduct?.packageWidthIn ?? '',
    packageHeightIn: initialProduct?.packageHeightIn ?? '',
    packageType: initialProduct?.packageType || 'YOUR_PACKAGING',
    category: initialProduct?.category || categories[0]?.name || '',
    linkedCategorySlug: initialProduct?.linkedCategorySlug || '',
    sameDayEligible: initialProduct?.sameDayEligible ?? false,
    outOfStock: initialProduct?.outOfStock ?? false,
    allow_custom_dimensions: initialProduct?.allowCustomDimensions ?? false,
    image: _pendingImage || initialProduct?.image || '/placeholder.jpg',
    galleryImages: _pendingGallery || initialProduct?.galleryImages || [],
    videos: _pendingVideos || initialProduct?.videos || [],
    features: initialProduct?.features?.join(', ') || '',
    featured: initialProduct?.featured ?? false,
    couponCodes: initialProduct?.couponCodes || [],
  });

  // Quote settings state
  const [quoteEnabled, setQuoteEnabled] = useState(true);
  const [useCustomQuantityTiers, setUseCustomQuantityTiers] = useState(true);
  const [selectedColors, setSelectedColors] = useState([]);
  
  // Options with custom prices: { id: string, customPrice: number | null, pricingType?: string, percentageValue?: number | null }
  const [selectedDecorations, setSelectedDecorations] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedPrintLocations, setSelectedPrintLocations] = useState([]);
  const [selectedTurnarounds, setSelectedTurnarounds] = useState([]);
  const [selectedDesignerHelp, setSelectedDesignerHelp] = useState([]);
  
  // Custom quantity tiers for this product
  const [customQuantityTiers, setCustomQuantityTiers] = useState([]);

  // Print product mode (dynamic pools)
  const [customizationMode, setCustomizationMode] = useState('apparel');
  const [categoryPools, setCategoryPools] = useState([]);
  const [poolSelections, setPoolSelections] = useState({});
  const [disabledPoolIds, setDisabledPoolIds] = useState([]);
  const [poolQuantityTiers, setPoolQuantityTiers] = useState({});

  useEffect(() => {
    if (!stableProductId) {
      previousStableProductIdRef.current = null;
      return;
    }
    const snap = initialProductRef.current;
    if (!snap) return;

    const prevId = previousStableProductIdRef.current;
    const switchedProduct = prevId !== null && prevId !== stableProductId;

    if (switchedProduct && prevId) {
      removeSessionKey(pendingMainImageStorageKey(prevId));
      removeSessionKey(pendingGalleryStorageKey(prevId));
      removeSessionKey(pendingVideosStorageKey(prevId));
    }

    if (switchedProduct) {
      // Clear dirty flags when switching to a different product so the
      // new product's saved media can be loaded.
      dirtyMediaFields.current.clear();

      setImagePreview(snap.image || null);
      setGalleryPreviews(snap.galleryImages || []);
      setVideoPreviews(snap.videos || []);
      setFormData((prev) => ({
        ...prev,
        name: snap.name || '',
        slug: snap.slug || '',
        description: snap.description || '',
        price: snap.price || '',
        mailboxPricePerMonth: snap.mailboxPricePerMonth ?? '',
        minQuantity: snap.minQuantity ?? '',
        maxQuantity: snap.maxQuantity ?? '',
        minWidthIn: snap.minWidthIn ?? '',
        maxWidthIn: snap.maxWidthIn ?? '',
        minHeightIn: snap.minHeightIn ?? '',
        maxHeightIn: snap.maxHeightIn ?? '',
        pricePerSqInch: snap.pricePerSqInch ?? '',
        oldPrice: snap.oldPrice ?? '',
        category: snap.category || prev.category,
        linkedCategorySlug: snap.linkedCategorySlug || '',
        sameDayEligible: snap.sameDayEligible ?? false,
        outOfStock: snap.outOfStock ?? false,
        allow_custom_dimensions: snap.allowCustomDimensions ?? false,
        image: snap.image || '/placeholder.jpg',
        galleryImages: snap.galleryImages || [],
        videos: snap.videos || [],
        features: Array.isArray(snap.features)
          ? snap.features.join(', ')
          : (snap.features || prev.features || ''),
        featured: snap.featured ?? false,
        couponCodes: snap.couponCodes || [],
      }));
    }
    // First mount for this id: useState already seeded from initialProduct — do not set image/gallery/videos from snap here (would race uploads).

    previousStableProductIdRef.current = stableProductId;
  }, [stableProductId]);

  /**
   * When the parent passes a refreshed initialProduct for the SAME product
   * (e.g. after a background re-fetch), sync non-media fields and only sync
   * media fields that the user hasn't touched yet.
   * This is the primary guard against the parent overwriting in-progress uploads.
   */
  const prevInitialProductRef = useRef(initialProduct);
  useEffect(() => {
    const prev = prevInitialProductRef.current;
    prevInitialProductRef.current = initialProduct;

    if (!initialProduct || !stableProductId) return;
    // Only act when the prop reference changed for the same product.
    if (prev === initialProduct) return;
    const prevId = String(prev?.id ?? prev?.product_id ?? prev?.productId ?? '');
    if (prevId !== stableProductId) return; // product switch handled by the other effect

    // Sync non-media fields unconditionally (they can't be in mid-upload).
    setFormData((current) => ({
      ...current,
      name: initialProduct.name || current.name,
      slug: initialProduct.slug || current.slug,
      description: initialProduct.description ?? current.description,
      price: initialProduct.price ?? current.price,
      mailboxPricePerMonth: initialProduct.mailboxPricePerMonth ?? current.mailboxPricePerMonth,
      minQuantity: initialProduct.minQuantity ?? current.minQuantity,
      maxQuantity: initialProduct.maxQuantity ?? current.maxQuantity,
      minWidthIn: initialProduct.minWidthIn ?? current.minWidthIn,
      maxWidthIn: initialProduct.maxWidthIn ?? current.maxWidthIn,
      minHeightIn: initialProduct.minHeightIn ?? current.minHeightIn,
      maxHeightIn: initialProduct.maxHeightIn ?? current.maxHeightIn,
      pricePerSqInch: initialProduct.pricePerSqInch ?? current.pricePerSqInch,
      oldPrice: initialProduct.oldPrice ?? current.oldPrice,
      weightLb: initialProduct.weightLb ?? current.weightLb,
      packageLengthIn: initialProduct.packageLengthIn ?? current.packageLengthIn,
      packageWidthIn: initialProduct.packageWidthIn ?? current.packageWidthIn,
      packageHeightIn: initialProduct.packageHeightIn ?? current.packageHeightIn,
      category: initialProduct.category || current.category,
      linkedCategorySlug: initialProduct.linkedCategorySlug ?? current.linkedCategorySlug,
      sameDayEligible: initialProduct.sameDayEligible ?? current.sameDayEligible,
      outOfStock: initialProduct.outOfStock ?? current.outOfStock,
      allow_custom_dimensions: initialProduct.allowCustomDimensions ?? current.allow_custom_dimensions,
      features: Array.isArray(initialProduct.features)
        ? initialProduct.features.join(', ')
        : (initialProduct.features ?? current.features),
      featured: initialProduct.featured ?? current.featured,
      couponCodes: initialProduct.couponCodes ?? current.couponCodes,
      // Media fields: only update if the user hasn't touched them.
      image: dirtyMediaFields.current.has('image') ? current.image : (initialProduct.image || current.image),
      galleryImages: dirtyMediaFields.current.has('galleryImages') ? current.galleryImages : (initialProduct.galleryImages || current.galleryImages),
      videos: dirtyMediaFields.current.has('videos') ? current.videos : (initialProduct.videos || current.videos),
    }));

    if (!dirtyMediaFields.current.has('image')) {
      setImagePreview(initialProduct.image || null);
    }
    if (!dirtyMediaFields.current.has('galleryImages')) {
      setGalleryPreviews(initialProduct.galleryImages || []);
    }
    if (!dirtyMediaFields.current.has('videos')) {
      setVideoPreviews(initialProduct.videos || []);
    }
  }, [initialProduct, stableProductId]);

  useEffect(() => {
    if (!stableProductId || typeof window === 'undefined') return;
    // Don't restore from sessionStorage if the user has already uploaded a
    // new image in this session — their upload takes priority.
    if (dirtyMediaFields.current.has('image')) return;
    try {
      const pending = sessionStorage.getItem(pendingMainImageStorageKey(stableProductId));
      if (pending?.trim()) {
        const url = pending.trim();
        setFormData((prev) => ({ ...prev, image: url }));
        setImagePreview(url);
      }
    } catch {
      // ignore
    }
  }, [stableProductId]);

  const getCategoryId = () => {
    const cat = categories.find((c) => c.name === formData.category || c.id === formData.category || c.slug === formData.category);
    return cat?.id || formData.category;
  };

  useEffect(() => {
    loadQuoteConfig();
  }, []);

  useEffect(() => {
    if (stableProductId && quoteConfig) {
      loadProductQuoteSettings();
    }
  }, [stableProductId, quoteConfig]);

  useEffect(() => {
    loadCategoryPools();
  }, [formData.category]);

  const loadCategoryPools = async () => {
    const categoryId = getCategoryId();
    if (!categoryId) return;
    try {
      const res = await fetch(`/api/quote-config/category-pools?categoryId=${encodeURIComponent(categoryId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.schema?.mode === 'print_product' && json.pools?.length > 0) {
setCustomizationMode('print_product');
           setCategoryPools(json.pools);
           const snap = initialProductRef.current;
           const isNewOrCategoryChanged = !snap || formData.category !== snap.category;
           if (isNewOrCategoryChanged) {
             const initial = {};
             const quantityInitial = {};
             json.pools.forEach((pool) => {
               initial[pool.id] = pool.options?.map((o) => ({
                 id: o.id,
                 customPrice: null,
                 pricingType: pool.key === 'production_time' ? 'flat' : undefined,
                 percentageValue: pool.key === 'production_time' ? null : undefined,
               })) || [];
               if (pool.selectionType === 'quantity') {
                 quantityInitial[pool.id] = (pool.quantityTiers || []).map(mapQuantityTierFromApi);
               }
             });
             setPoolSelections(initial);
             setPoolQuantityTiers(quantityInitial);
             setDisabledPoolIds([]);
           }
         } else {
          setCustomizationMode('apparel');
          setCategoryPools([]);
        }
      } else {
        setCustomizationMode('apparel');
      }
    } catch {
      setCustomizationMode('apparel');
    }
  };

  const loadQuoteConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await fetch('/api/quote-config/global');
      if (res.ok) {
        const json = await res.json();
        setQuoteConfig(json.config);
        if (json.config && !initialProductRef.current && customizationMode === 'apparel') {
          setSelectedColors(json.config.colors.filter((c) => c.enabled).map((c) => c.id));
          setSelectedDecorations(
            json.config.decorations.filter((d) => d.enabled).map((d) => ({ id: d.id, customPrice: null }))
          );
          setSelectedSizes(
            json.config.sizes.filter((s) => s.baseEnabled).map((s) => ({ id: s.id, customPrice: null }))
          );
          setSelectedPrintLocations(
            json.config.printLocations.filter((p) => p.enabled).map((p) => ({ id: p.id, customPrice: null }))
          );
          setSelectedTurnarounds(
            json.config.turnarounds.filter((t) => t.enabled).map((t) => ({ id: t.id, customPrice: null, pricingType: t.pricingType || 'flat', percentageValue: t.percentageValue ?? null }))
          );
          setSelectedDesignerHelp(
            json.config.designerHelp.filter((d) => d.enabled).map((d) => ({ id: d.id, customPrice: null }))
          );
          setCustomQuantityTiers(
            (json.config.quantityTiers || [])
              .filter((t) => t.enabled)
              .map(mapQuantityTierFromApi),
          );
        }
      }
    } catch (err) {
      console.error('Failed to load quote config:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  const loadProductQuoteSettings = async () => {
    const p = initialProductRef.current;
    if (!p?.id) return;
    try {
      const res = await fetch(
        `/api/quote-config/${encodeURIComponent(String(p.id))}?admin=1`,
      );
      if (res.ok) {
        const json = await res.json();
        if (json.mode === 'print_product' && json.pools) {
          setCustomizationMode('print_product');
          setDisabledPoolIds(Array.isArray(json.disabledPoolIds) ? json.disabledPoolIds : []);
          const selections = {};
          const quantityTiersByPool = {};
          json.pools.forEach((pool) => {
            selections[pool.id] = (pool.options || []).map((o) => ({
              id: o.id,
              customPrice: o.priceModifier && o.priceModifier !== 0 ? o.priceModifier : null,
              pricingType: o.pricingType || 'flat',
              percentageValue: o.percentageValue ?? null,
            }));
            if (pool.selectionType === 'quantity') {
              quantityTiersByPool[pool.id] = (pool.quantityTiers || []).map(mapQuantityTierFromApi);
            }
          });
          setPoolSelections(selections);
          setPoolQuantityTiers(quantityTiersByPool);
          const catId = categories.find(
            (c) => p.category === c.name || p.category === c.id,
          )?.id;
          if (catId) {
            const poolRes = await fetch(`/api/quote-config/category-pools?categoryId=${encodeURIComponent(catId)}`);
            if (poolRes.ok) {
              const poolJson = await poolRes.json();
              if (poolJson.pools?.length) setCategoryPools(poolJson.pools);
              else setCategoryPools(json.pools);
            } else {
              setCategoryPools(json.pools);
            }
          } else {
            setCategoryPools(json.pools);
          }
          return;
        }
        if (json.productSettings) {
          setCustomizationMode('apparel');
          const ps = json.productSettings;
          setQuoteEnabled(ps.enabled);
          setUseCustomQuantityTiers(true);
          setSelectedColors(ps.colorOptionIds || []);
          setSelectedDecorations(
            (ps.decorationOptionIds || []).map((id) => ({
              id,
              customPrice: ps.customPrices?.decorations?.[id] ?? null,
            }))
          );
          setSelectedSizes(
            (ps.sizeOptionIds || []).map((id) => ({
              id,
              customPrice: ps.customPrices?.sizes?.[id] ?? null,
            }))
          );
          setSelectedPrintLocations(
            (ps.printLocationOptionIds || []).map((id) => ({
              id,
              customPrice: ps.customPrices?.printLocations?.[id] ?? null,
            }))
          );
          setSelectedTurnarounds(
            (ps.turnaroundOptionIds || []).map((id) => {
              const custom = ps.customTurnaroundPricing?.[id];
              return {
                id,
                customPrice: ps.customPrices?.turnarounds?.[id] ?? null,
                pricingType: custom?.pricingType || 'flat',
                percentageValue: custom?.percentageValue ?? null,
              };
            })
          );
          setSelectedDesignerHelp(
            (ps.designerHelpOptionIds || []).map((id) => ({
              id,
              customPrice: ps.customPrices?.designerHelp?.[id] ?? null,
            }))
          );
          setCustomQuantityTiers(
            (ps.customQuantityTiers && ps.customQuantityTiers.length > 0)
              ? ps.customQuantityTiers.map(mapQuantityTierFromApi)
              : (quoteConfig?.quantityTiers || [])
                  .filter((t) => t.enabled)
                  .map(mapQuantityTierFromApi),
          );
        }
      }
    } catch (err) {
      console.error('Failed to load product quote settings:', err);
    }
  };

  const togglePoolOption = (poolId, optionId, customPrice = null, pricingType = 'flat', percentageValue = null) => {
    setPoolSelections((prev) => {
      const list = prev[poolId] || [];
      const exists = list.find((x) => x.id === optionId);
      const next = exists
        ? list.filter((x) => x.id !== optionId)
        : [...list, { id: optionId, customPrice, pricingType, percentageValue }];
      return { ...prev, [poolId]: next };
    });
  };

  const updatePoolOptionPrice = (poolId, optionId, price) => {
    setPoolSelections((prev) => {
      const list = (prev[poolId] || []).map((o) =>
        o.id === optionId ? { ...o, customPrice: price === '' ? null : parseFloat(price) } : o
      );
      return { ...prev, [poolId]: list };
    });
  };

  const isPoolOptionSelected = (poolId, optionId) => {
    return (poolSelections[poolId] || []).some((x) => x.id === optionId);
  };

  const selectAllPoolOptions = (poolId, options) => {
    setPoolSelections((prev) => ({
      ...prev,
      [poolId]: options.map((o) => ({ id: o.id, customPrice: null, pricingType: 'flat', percentageValue: null })),
    }));
  };

  const clearPoolOptions = (poolId) => {
    setPoolSelections((prev) => ({ ...prev, [poolId]: [] }));
  };

  const togglePoolDisabled = (poolId) => {
    setDisabledPoolIds((prev) =>
      prev.includes(poolId) ? prev.filter((id) => id !== poolId) : [...prev, poolId]
    );
  };

  const addPoolQuantityTier = (poolId) => {
    setPoolQuantityTiers((prev) => ({
      ...prev,
      [poolId]: [
        ...(prev[poolId] || []),
        { minQty: 1, maxQty: null, unitPrice: 0, discountPercent: 0, enabled: true },
      ],
    }));
  };

  const updatePoolQuantityTier = (poolId, index, field, value) => {
    setPoolQuantityTiers((prev) => ({
      ...prev,
      [poolId]: (prev[poolId] || []).map((tier, i) => {
        if (i !== index) return tier;
        const next = { ...tier, [field]: parseQuantityTierField(field, value) };
        if (field === 'unitPrice') {
          if (next.unitPrice > 0) next.discountPercent = 0;
        } else if (field === 'discountPercent') {
          if (next.discountPercent > 0) next.unitPrice = 0;
        }
        return next;
      }),
    }));
  };

  const removePoolQuantityTier = (poolId, index) => {
    setPoolQuantityTiers((prev) => ({
      ...prev,
      [poolId]: (prev[poolId] || []).filter((_, i) => i !== index),
    }));
  };

  const categoryNames = Array.from(
    new Set([
      ...categories.map((c) => c.name),
      'Marketing Materials',
      'Signs & Banners',
      'Custom Apparels',
      'Labels & Stickers',
      'DTF & UV DTF',
      'Trade Show & Events',
    ])
  );

  const isMailboxCategory = (() => {
    const cat = categories.find(
      (c) =>
        c.slug === 'mailbox-notary' &&
        (c.name === formData.category || c.id === formData.category || c.slug === formData.category)
    );
    return !!cat || formData.category === 'Mailbox & Notary';
  })();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'category') {
      const nextCategory = type === 'checkbox' ? checked : value;
      const matched = categories.find(
        (c) => c.name === nextCategory || c.id === nextCategory || c.slug === nextCategory,
      );
      const isSameDayCategory =
        String(matched?.slug || nextCategory || '').toLowerCase() === SAME_DAY_PRINTING_CATEGORY_SLUG;
      setFormData((prev) => ({
        ...prev,
        [name]: nextCategory,
        linkedCategorySlug: isSameDayCategory ? prev.linkedCategorySlug : '',
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageUpload = async (e) => {
    e.stopPropagation();
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
      input.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      input.value = '';
      return;
    }

    try {
      setUploading(true);
      setError('');

      // Mark image as dirty immediately so no effect can overwrite it.
      dirtyMediaFields.current.add('image');

      // Create preview
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result);
      reader.readAsDataURL(file);

      // Upload file
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('folder', 'product');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      const url = data?.url;
      if (!url) throw new Error('No image URL returned');
      try {
        if (stableProductId) sessionStorage.setItem(pendingMainImageStorageKey(stableProductId), url);
      } catch {
        // ignore
      }
      setImagePreview(url);
      setFormData((prev) => ({ ...prev, image: url }));
    } catch (err) {
      setError(err.message || 'Failed to upload image');
      setImagePreview(null);
      // On failure, clear dirty so the original image can be shown again.
      dirtyMediaFields.current.delete('image');
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const handleGalleryImageUpload = async (e) => {
    e.stopPropagation();
    const input = e.target;
    const files = input.files;
    if (!files?.length) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    try {
      setUploading(true);
      setError('');

      // Mark gallery as dirty immediately so no effect can overwrite it.
      dirtyMediaFields.current.add('galleryImages');

      const newUrls = [];
      const skipMessages = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!allowedTypes.includes(file.type)) {
          skipMessages.push(`"${file.name}" is not a supported type.`);
          continue;
        }
        if (file.size > maxSize) {
          skipMessages.push(`"${file.name}" exceeds 5MB.`);
          continue;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('folder', 'product-gallery');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
          credentials: 'include',
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Upload failed for ${file.name}`);
        }

        const data = await res.json();
        if (data?.url) newUrls.push(data.url);
      }

      if (newUrls.length > 0) {
        setFormData((prev) => {
          const updated = [...(prev.galleryImages || []), ...newUrls];
          if (stableProductId) writeSessionJson(pendingGalleryStorageKey(stableProductId), updated);
          return { ...prev, galleryImages: updated };
        });
        setGalleryPreviews((prev) => [...prev, ...newUrls]);
        if (skipMessages.length) {
          setError(`Some files were skipped: ${skipMessages.join(' ')}`);
        } else {
          setError('');
        }
      } else if (skipMessages.length) {
        setError(skipMessages.join(' '));
      }
    } catch (err) {
      setError(err.message || 'Failed to upload gallery images');
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const handleVideoUpload = async (e) => {
    e.stopPropagation();
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only MP4, WebM, OGG, and MOV are allowed.');
      input.value = '';
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError('Video file is too large. Maximum size is 50MB.');
      input.value = '';
      return;
    }

    try {
      setUploading(true);
      setError('');

      // Mark videos as dirty immediately so no effect can overwrite it.
      dirtyMediaFields.current.add('videos');

      console.log('Uploading video:', file.name, file.type, file.size);

      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await fetch('/api/upload/video', {
        method: 'POST',
        body: formDataUpload,
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.error || 'Failed to upload video');
      }

      const data = await res.json();
      console.log('Upload successful:', data);
      
      setFormData((prev) => {
        const newVideo = { url: data.url, title: file.name.replace(/\.[^/.]+$/, ''), description: '' };
        const updated = [...(prev.videos || []), newVideo];
        if (stableProductId) writeSessionJson(pendingVideosStorageKey(stableProductId), updated);
        return { ...prev, videos: updated };
      });
      setVideoPreviews((prev) => [...prev, {
        url: data.url,
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: '',
      }]);
    } catch (err) {
      setError(err.message || 'Failed to upload video');
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  // Toggle selection with custom price support
  const toggleOptionWithPrice = (setter, id, currentList) => {
    const exists = currentList.find((item) => item.id === id);
    if (exists) {
      setter(currentList.filter((item) => item.id !== id));
    } else {
      setter([...currentList, { id, customPrice: null }]);
    }
  };

  // Update custom price for an option
  const updateCustomPrice = (setter, currentList, id, price) => {
    setter(
      currentList.map((item) =>
        item.id === id ? { ...item, customPrice: price === '' ? null : parseFloat(price) } : item
      )
    );
  };

  // Toggle color selection (no custom price)
  const toggleColor = (id) => {
    setSelectedColors((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const parseQuantityTierField = (field, value) => {
    if (field === 'enabled') return value;
    if (field === 'maxQty') return value === '' || value == null ? null : parseFloat(value);
    if (field === 'discountPercent') {
      if (value === '' || value == null) return 0;
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : 0;
    }
    return value === '' ? null : parseFloat(value);
  };

  const normalizeQuantityTierForSave = (tier) => {
    const discountRaw = tier?.discountPercent;
    const discount =
      discountRaw === '' || discountRaw == null || !Number.isFinite(Number(discountRaw))
        ? 0
        : Number(discountRaw);
    return {
      minQty: Number(tier.minQty) || 1,
      maxQty:
        tier.maxQty === '' || tier.maxQty == null || !Number.isFinite(Number(tier.maxQty))
          ? null
          : Number(tier.maxQty),
      unitPrice: Number.isFinite(Number(tier.unitPrice)) ? Number(tier.unitPrice) : 0,
      discountPercent: discount,
      enabled: tier.enabled !== false,
    };
  };

  const mapQuantityTierFromApi = (t) => ({
    minQty: t.minQty,
    maxQty: t.maxQty ?? null,
    unitPrice: t.unitPrice,
    discountPercent: t.discountPercent != null ? Number(t.discountPercent) : 0,
    enabled: t.enabled !== false,
  });

  // Add new custom quantity tier
  const addCustomTier = () => {
    setCustomQuantityTiers((prev) => [
      ...prev,
      { minQty: 1, maxQty: null, unitPrice: 0, discountPercent: 0, enabled: true },
    ]);
  };

  // Update custom tier
  const updateCustomTier = (index, field, value) => {
    setCustomQuantityTiers((prev) =>
      prev.map((tier, i) => {
        if (i !== index) return tier;
        const next = { ...tier, [field]: parseQuantityTierField(field, value) };
        if (field === 'unitPrice') {
          if (next.unitPrice > 0) next.discountPercent = 0;
        } else if (field === 'discountPercent') {
          if (next.discountPercent > 0) next.unitPrice = 0;
        }
        return next;
      }),
    );
  };

  // Remove custom tier
  const removeCustomTier = (index) => {
    setCustomQuantityTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const parseNullableNumber = (value) => {
        if (value === '' || value == null) return null;
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      };

      // Validate
      if (!formData.name.trim()) {
        setError('Name is required');
        setLoading(false);
        return;
      }

      if (isMailboxCategory && !formData.mailboxPricePerMonth) {
        setError('Price per month is required for mailbox rental products');
        setLoading(false);
        return;
      }

      const productData = {
        ...formData,
        price: parseFloat(
          isMailboxCategory
            ? formData.mailboxPricePerMonth || formData.price || 0
            : formData.price || 0
        ),
        mailboxPricePerMonth:
          formData.mailboxPricePerMonth === '' || formData.mailboxPricePerMonth == null
            ? null
            : parseFloat(formData.mailboxPricePerMonth),
        oldPrice: formData.oldPrice === '' || formData.oldPrice == null ? null : parseFloat(formData.oldPrice),
        weightLb: parseNullableNumber(formData.weightLb),
        packageLengthIn: parseNullableNumber(formData.packageLengthIn),
        packageWidthIn: parseNullableNumber(formData.packageWidthIn),
        packageHeightIn: parseNullableNumber(formData.packageHeightIn),
        packageType: formData.packageType || 'YOUR_PACKAGING',
        pricePerSqInch:
          formData.pricePerSqInch === '' || formData.pricePerSqInch == null
            ? null
            : parseFloat(formData.pricePerSqInch),
        features: formData.features.split(',').map((f) => f.trim()).filter(Boolean),
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        galleryImages: (formData.galleryImages || []).filter((url) => url && url.trim().length > 0),
        videos: Array.isArray(formData.videos)
          ? formData.videos
              .filter((v) => v && v.url && String(v.url).trim().length > 0)
              .map((v) => ({
                url: String(v.url).trim(),
                title: v.title ? String(v.title) : '',
                description: v.description ? String(v.description) : '',
              }))
          : [],
        couponCodes: (formData.couponCodes || [])
          .map((c) => ({
            code: String(c.code || '').trim().toUpperCase(),
            discountPercent:
              c.discountPercent === '' || c.discountPercent == null
                ? null
                : parseFloat(c.discountPercent),
            isActive: c.isActive !== false,
          }))
          .filter((c) => c.code && Number.isFinite(c.discountPercent) && c.discountPercent > 0),
        sameDayEligible: formData.sameDayEligible === true,
        outOfStock: formData.outOfStock === true,
        linkedCategorySlug: formData.linkedCategorySlug || null,
      };

      let productId;
      if (initialProduct && initialProduct.id) {
        // Ensure product data includes the ID for upsert
        const dataWithId = { ...productData, id: initialProduct.id };
        const result = await updateProduct(initialProduct.id, dataWithId);
        productId = result?.id || initialProduct.id;
      } else {
        // Generate ID for new product
        const newId = `product-${Date.now()}`;
        const dataWithId = { ...productData, id: newId };
        const result = await addProduct(dataWithId);
        productId = result?.id || newId;
      }

      // Build custom prices object
      const customPrices = {
        decorations: Object.fromEntries(
          selectedDecorations.filter((d) => d.customPrice !== null).map((d) => [d.id, d.customPrice])
        ),
        sizes: Object.fromEntries(
          selectedSizes.filter((s) => s.customPrice !== null).map((s) => [s.id, s.customPrice])
        ),
        printLocations: Object.fromEntries(
          selectedPrintLocations.filter((p) => p.customPrice !== null).map((p) => [p.id, p.customPrice])
        ),
        turnarounds: Object.fromEntries(
          selectedTurnarounds.filter((t) => t.customPrice !== null).map((t) => [t.id, t.customPrice])
        ),
        designerHelp: Object.fromEntries(
          selectedDesignerHelp.filter((d) => d.customPrice !== null).map((d) => [d.id, d.customPrice])
        ),
      };
      const customTurnaroundPricing = Object.fromEntries(
        (selectedTurnarounds || [])
          .filter((t) => t.pricingType)
          .map((t) => [t.id, { pricingType: t.pricingType || 'flat', percentageValue: t.percentageValue ?? null }])
      );

      // Save quote settings
      if (productId) {
        if (customizationMode === 'print_product') {
          const poolOptions = {};
          Object.entries(poolSelections).forEach(([poolId, opts]) => {
            if (opts?.length) poolOptions[poolId] = opts;
          });
          const res = await fetch(`/api/quote-config/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enabled: quoteEnabled,
              poolOptions,
              poolQuantityTiers: Object.fromEntries(
                Object.entries(poolQuantityTiers).map(([poolId, tiers]) => [
                  poolId,
                  (tiers || []).map(normalizeQuantityTierForSave),
                ]),
              ),
              disabledPoolIds,
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(json.error || 'Failed to save quote settings');
          }
        } else if (quoteConfig) {
          const res = await fetch(`/api/quote-config/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enabled: quoteEnabled,
              useCustomQuantityTiers: true,
              colorOptionIds: selectedColors,
              decorationOptionIds: selectedDecorations.map((d) => d.id),
              sizeOptionIds: selectedSizes.map((s) => s.id),
              printLocationOptionIds: selectedPrintLocations.map((p) => p.id),
              turnaroundOptionIds: selectedTurnarounds.map((t) => t.id),
              designerHelpOptionIds: selectedDesignerHelp.map((d) => d.id),
              customPrices,
              customQuantityTiers: customQuantityTiers.map(normalizeQuantityTierForSave),
              customTurnaroundPricing,
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(json.error || 'Failed to save quote settings');
          }
        }
      }

      if (stableProductId) {
        removeSessionKey(pendingMainImageStorageKey(stableProductId));
        removeSessionKey(pendingGalleryStorageKey(stableProductId));
        removeSessionKey(pendingVideosStorageKey(stableProductId));
      }

      if (onSubmit) {
        onSubmit();
      } else {
        router.push('/admin/products');
      }
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const tabs =
    customizationMode === 'print_product'
      ? [
          { id: 'basic', label: 'Basic Info' },
          { id: 'print-options', label: 'Print Product Options' },
        ]
      : [
          { id: 'basic', label: 'Basic Info' },
          { id: 'pricing', label: 'Pricing & Tiers' },
          { id: 'decorations', label: 'Decorations' },
          { id: 'colors', label: 'Colors' },
          { id: 'sizes', label: 'Sizes' },
          { id: 'locations', label: 'Print Locations' },
          { id: 'turnarounds', label: 'Turnarounds' },
          { id: 'designer', label: 'Designer Help' },
        ];

  const getGlobalPrice = (type, id) => {
    if (!quoteConfig) return 0;
    const list = quoteConfig[type];
    const item = list?.find((x) => x.id === id);
    if (type === 'sizes') return item?.priceAddon || 0;
    return item?.priceModifier || 0;
  };

  const renderOptionWithPrice = (option, type, selectedList, setSelected, labelField = 'name') => {
    const selected = selectedList.find((s) => s.id === option.id);
    const isSelected = !!selected;
    const globalPrice = getGlobalPrice(type, option.id);
    const label = option[labelField] || option.name || option.label;

    return (
      <div
        key={option.id}
        className={`p-4 rounded-lg border-2 transition ${
          isSelected ? 'border-[#29b6f6] bg-[#29b6f6]/5' : 'border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleOptionWithPrice(setSelected, option.id, selectedList)}
              className="rounded"
            />
            <span className="font-medium text-gray-900">{label}</span>
          </label>
          <span className="text-xs text-gray-500">
            Global: ${globalPrice.toFixed(2)}
          </span>
        </div>
        {isSelected && (
          <div className="mt-2">
            <label className="block text-xs text-gray-600 mb-1">
              Custom Price (leave empty to use global)
            </label>
            <input
              type="number"
              step="0.01"
              value={selected.customPrice ?? ''}
              onChange={(e) => updateCustomPrice(setSelected, selectedList, option.id, e.target.value)}
              placeholder={`Default: $${globalPrice.toFixed(2)}`}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-[#29b6f6] text-[#29b6f6]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Basic Info Tab */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Gildan Adult Unisex Ultra Cotton T-Shirt"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                  required
                />
              </div>

              <div>
                {isMailboxCategory ? (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Per Month *
                    </label>
                    <input
                      type="number"
                      name="mailboxPricePerMonth"
                      value={formData.mailboxPricePerMonth}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Monthly rental price for mailbox services. This will be used to calculate
                      multi-month discounts.
                    </p>
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Price
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                    />
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Quantity (optional)
                </label>
                <input
                  type="number"
                  name="minQuantity"
                  value={formData.minQuantity}
                  onChange={handleChange}
                  placeholder="e.g., 1"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Order Quantity (optional)
                </label>
                <input
                  type="number"
                  name="maxQuantity"
                  value={formData.maxQuantity}
                  onChange={handleChange}
                  placeholder="e.g., 1000"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (lb) (optional)
                </label>
                <input
                  type="number"
                  name="weightLb"
                  value={formData.weightLb}
                  onChange={handleChange}
                  placeholder="e.g., 1.25"
                  step="0.001"
                  min="0.001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Dimensions (L x W x H inches) (optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="number"
                    name="packageLengthIn"
                    value={formData.packageLengthIn}
                    onChange={handleChange}
                    placeholder="Length"
                    step="0.01"
                    min="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                  />
                  <input
                    type="number"
                    name="packageWidthIn"
                    value={formData.packageWidthIn}
                    onChange={handleChange}
                    placeholder="Width"
                    step="0.01"
                    min="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                  />
                  <input
                    type="number"
                    name="packageHeightIn"
                    value={formData.packageHeightIn}
                    onChange={handleChange}
                    placeholder="Height"
                    step="0.01"
                    min="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Packaging Type
                </label>
                <select
                  name="packageType"
                  value={formData.packageType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                >
                  <option value="YOUR_PACKAGING">Your packaging (custom box)</option>
                  <option value="FEDEX_BOX"> Box</option>
                  <option value="FEDEX_PAK"> Pak</option>
                  <option value="FEDEX_ENVELOPE">Envelope</option>
                  <option value="FEDEX_SMALL_BOX"> Small Box</option>
                  <option value="FEDEX_MEDIUM_BOX"> Medium Box</option>
                  <option value="FEDEX_LARGE_BOX"> Large Box</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Required for accurate Shipping rate quotes at checkout.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Old Price (optional)</label>
                <input
                  type="number"
                  name="oldPrice"
                  value={formData.oldPrice}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Shown as a red strikethrough on product cards when greater than the new price.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                >
                  {categoryNames.map((cat) => (
                    <option key={`cat-${cat}`} value={cat}>
                      {cat}
                    </option>
                  ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="allow_custom_dimensions"
                      checked={formData.allow_custom_dimensions === true}
                      onChange={handleChange}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Enable Custom Width &amp; Height</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    Allow buyers to enter custom width and height values for this product.
                  </p>
                </div>

                {(() => {
                const selectedCategoryObj = categories.find(
                  (c) =>
                    c.name === formData.category ||
                    c.id === formData.category ||
                    c.slug === formData.category,
                );
                const isSameDayCategory =
                  String(selectedCategoryObj?.slug || formData.category || '').toLowerCase() ===
                  SAME_DAY_PRINTING_CATEGORY_SLUG;
                if (!isSameDayCategory) return null;
                const linkableCategories = categories.filter(
                  (c) => String(c.slug || '').toLowerCase() !== SAME_DAY_PRINTING_CATEGORY_SLUG,
                );
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Under Category (l-category)
                    </label>
                    <select
                      name="linkedCategorySlug"
                      value={formData.linkedCategorySlug || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                    >
                      <option value="">Select category</option>
                      {linkableCategories.map((cat) => (
                        <option key={`lcat-${cat.id}`} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="auto-generated-from-name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                />
              </div>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Coupon Codes for this Product</h4>
                <button
                  type="button"
                  className="text-xs text-[#29b6f6] hover:text-[#1e8fc4] font-medium"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      couponCodes: [...(prev.couponCodes || []), { code: '', discountPercent: '', isActive: true }],
                    }))
                  }
                >
                  + Add Coupon
                </button>
              </div>
              <div className="space-y-2">
                {(formData.couponCodes || []).map((coupon, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={coupon.code || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          couponCodes: prev.couponCodes.map((c, i) =>
                            i === idx ? { ...c, code: e.target.value.toUpperCase() } : c,
                          ),
                        }))
                      }
                      placeholder="Coupon code"
                      className="md:col-span-5 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      min="0.01"
                      max="100"
                      step="0.01"
                      value={coupon.discountPercent ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          couponCodes: prev.couponCodes.map((c, i) =>
                            i === idx ? { ...c, discountPercent: e.target.value } : c,
                          ),
                        }))
                      }
                      placeholder="Discount %"
                      className="md:col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <label className="md:col-span-2 inline-flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={coupon.isActive !== false}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            couponCodes: prev.couponCodes.map((c, i) =>
                              i === idx ? { ...c, isActive: e.target.checked } : c,
                            ),
                          }))
                        }
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      className="md:col-span-2 text-xs text-red-600 hover:text-red-700"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          couponCodes: prev.couponCodes.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {(!formData.couponCodes || formData.couponCodes.length === 0) && (
                  <div className="text-xs text-gray-500">No coupon codes for this product.</div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Product description..."
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Features (comma-separated)
                </label>
                <input
                  type="text"
                  name="features"
                  value={formData.features}
                  onChange={handleChange}
                  placeholder="e.g., Full Color, Waterproof"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                />
              </div>

              {(
                formData.category === 'Signs & Banners' ||
                formData.category === 'Marketing Materials' ||
                formData.category === 'DTF & UV DTF' ||
                formData.category === 'Labels & Stickers'
              ) && (
              <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Area-Based Pricing (Custom Sizing)
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  Configure minimum/maximum dimensions in inches and price per square inch. Used when
                  customer enters custom width and height during quote.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Min Width (in)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="minWidthIn"
                      value={formData.minWidthIn}
                      onChange={handleChange}
                      placeholder="e.g., 6"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Width (in)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="maxWidthIn"
                      value={formData.maxWidthIn}
                      onChange={handleChange}
                      placeholder="e.g., 120"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Min Height (in)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="minHeightIn"
                      value={formData.minHeightIn}
                      onChange={handleChange}
                      placeholder="e.g., 6"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Height (in)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="maxHeightIn"
                      value={formData.maxHeightIn}
                      onChange={handleChange}
                      placeholder="e.g., 60"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                    />
                  </div>
                </div>
                <div className="mt-3 max-w-xs">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Price per Sq. Inch (USD)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    name="pricePerSqInch"
                    value={formData.pricePerSqInch}
                    onChange={handleChange}
                    placeholder="e.g., 0.08"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                  />
                </div>
              </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                <div className="space-y-3">
                  {/* Image Preview */}
                  {(() => {
                    const src = imagePreview || formData.image;
                    return src && src !== '/placeholder.jpg';
                  })() && (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-300">
                      <img
                        src={imagePreview || formData.image}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData((prev) => ({ ...prev, image: '/placeholder.jpg' }));
                          // User explicitly cleared the image — keep it dirty so
                          // sessionStorage doesn't restore the old upload.
                          dirtyMediaFields.current.add('image');
                          try {
                            if (stableProductId) {
                              sessionStorage.removeItem(pendingMainImageStorageKey(stableProductId));
                            }
                          } catch {
                            // ignore
                          }
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  {/* Upload Input */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={uploading}
                      aria-label="Upload product image"
                      onClick={() => mainImageFileRef.current?.click()}
                      className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-lg border border-gray-300 transition text-sm font-medium"
                    >
                      {uploading ? 'Uploading...' : 'Choose Image'}
                    </button>
                    <span className="text-xs text-gray-500">
                      JPEG, PNG, GIF, WebP (max 5MB)
                    </span>
                  </div>
                  
                  {/* Or enter URL manually */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">or</span>
                    <input
                      type="text"
                      name="image"
                      value={formData.image}
                      onChange={(e) => {
                        handleChange(e);
                        setImagePreview(e.target.value);
                        // Manual URL entry counts as a user modification.
                        dirtyMediaFields.current.add('image');
                        try {
                          if (stableProductId) {
                            sessionStorage.removeItem(pendingMainImageStorageKey(stableProductId));
                          }
                        } catch {
                          // ignore
                        }
                      }}
                      placeholder="Enter image URL"
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gallery Images (Slider)</label>
                <div className="space-y-3">
                  {formData.galleryImages && formData.galleryImages.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {formData.galleryImages.map((url, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300">
                          <img
                            src={url}
                            alt={`Gallery ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              dirtyMediaFields.current.add('galleryImages');
                              setFormData((prev) => ({
                                ...prev,
                                galleryImages: prev.galleryImages.filter((_, i) => i !== idx),
                              }));
                              setGalleryPreviews((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No gallery images added yet.</p>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={uploading}
                      aria-label="Upload gallery images"
                      onClick={() => galleryFileRef.current?.click()}
                      className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-lg border border-gray-300 transition text-sm font-medium"
                    >
                      {uploading ? 'Uploading...' : 'Add Gallery Images'}
                    </button>
                    <span className="text-xs text-gray-500">
                      Select multiple files. JPEG, PNG, GIF, WebP (max 5MB each)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">or</span>
                    <input
                      type="text"
                      placeholder="Enter gallery image URL and press Enter"
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const value = e.currentTarget.value.trim();
                          if (!value) return;
                          dirtyMediaFields.current.add('galleryImages');
                          setFormData((prev) => ({
                            ...prev,
                            galleryImages: [...(prev.galleryImages || []), value],
                          }));
                          setGalleryPreviews((prev) => [...prev, value]);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Product Videos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Videos</label>
              <div className="space-y-3">
                {Array.isArray(videoPreviews) && videoPreviews.length > 0 ? (
                  <div className="space-y-2">
                    {videoPreviews.map((video, idx) => (
                      <div
                        key={`${video.url || 'video'}-${idx}`}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="w-24 h-16 rounded-md overflow-hidden border border-gray-200 bg-black flex items-center justify-center flex-shrink-0">
                          <video
                            src={video.url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {video.title || `Video ${idx + 1}`}
                          </div>
                          <div className="text-sm text-gray-500 truncate">{video.url}</div>
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-1 text-xs text-[#29b6f6] hover:underline"
                          >
                            View
                          </a>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            dirtyMediaFields.current.add('videos');
                            setFormData((prev) => ({
                              ...prev,
                              videos: (prev.videos || []).filter((_, i) => i !== idx),
                            }));
                            setVideoPreviews((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="flex-shrink-0 text-red-500 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No videos added yet.</p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={uploading}
                    aria-label="Upload product video"
                    onClick={() => videoFileRef.current?.click()}
                    className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-lg border border-gray-300 transition text-sm font-medium"
                  >
                    {uploading ? 'Uploading...' : 'Add Video'}
                  </button>
                  <span className="text-xs text-gray-400">or</span>
                  <input
                    type="text"
                    placeholder="Enter video URL and press Enter"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = e.currentTarget.value.trim();
                        if (!value) return;
                        dirtyMediaFields.current.add('videos');
                        setFormData((prev) => ({
                          ...prev,
                          videos: [
                            ...(prev.videos || []),
                            {
                              url: value,
                              title: `Video ${(prev.videos || []).length + 1}`,
                              description: '',
                            },
                          ],
                        }));
                        setVideoPreviews((prev) => [
                          ...prev,
                          {
                            url: value,
                            title: `Video ${prev.length + 1}`,
                            description: '',
                          },
                        ]);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400">MP4, WebM, OGG, MOV (max 50MB)</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Featured</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="sameDayEligible"
                  checked={formData.sameDayEligible === true}
                  onChange={handleChange}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Display in Same Day Printing</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="outOfStock"
                  checked={formData.outOfStock === true}
                  onChange={handleChange}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Out of stock</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={quoteEnabled}
                  onChange={(e) => setQuoteEnabled(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Enable Quote Customization</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Print Product Options Tab */}
      {activeTab === 'print-options' && customizationMode === 'print_product' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Print Product Customization Options</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select which options are available for this product. Leave all selected to offer everything, or pick specific options.
          </p>
          {categoryPools.length === 0 ? (
            <p className="text-gray-500">Select a category first. Categories with Print Product mode (e.g. Marketing Materials) will show options here.</p>
          ) : (
            <div className="space-y-6">
              {categoryPools.map((pool) => (
                <div key={pool.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{pool.name}</h4>
                      {disabledPoolIds.includes(pool.id) && (
                        <p className="text-xs text-amber-700">Pool disabled for this product</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => togglePoolDisabled(pool.id)}
                        className={`text-xs ${disabledPoolIds.includes(pool.id) ? 'text-amber-700' : 'text-gray-500'} hover:underline`}
                      >
                        {disabledPoolIds.includes(pool.id) ? 'Enable Pool' : 'Disable Pool'}
                      </button>
                      <button
                        type="button"
                        disabled={disabledPoolIds.includes(pool.id)}
                        onClick={() => selectAllPoolOptions(pool.id, pool.options || [])}
                        className="text-xs text-[#29b6f6] hover:underline disabled:opacity-50"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        disabled={disabledPoolIds.includes(pool.id)}
                        onClick={() => clearPoolOptions(pool.id)}
                        className="text-xs text-gray-500 hover:underline disabled:opacity-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  {pool.selectionType === 'quantity' && pool.quantityTiers ? (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        Configure product-specific quantity tiers for this pool.
                      </div>
                      <p className="text-xs text-[#29b6f6]">Choose either Unit Price OR Discount %, not both.</p>
                      <div className="space-y-2">
                        {(poolQuantityTiers[pool.id] || []).map((tier, idx) => {
                          const unitPriceDisabled = tier.discountPercent > 0;
                          const discountDisabled = tier.unitPrice > 0;
                          return (
                            <div key={`${pool.id}-tier-${idx}`} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                              <input
                                type="number"
                                placeholder="Min Qty"
                                value={tier.minQty ?? ''}
                                disabled={disabledPoolIds.includes(pool.id)}
                                onChange={(e) => updatePoolQuantityTier(pool.id, idx, 'minQty', e.target.value)}
                                className="px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                              <input
                                type="number"
                                placeholder="Max Qty"
                                value={tier.maxQty ?? ''}
                                disabled={disabledPoolIds.includes(pool.id)}
                                onChange={(e) => updatePoolQuantityTier(pool.id, idx, 'maxQty', e.target.value)}
                                className="px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Unit Price"
                                value={tier.unitPrice ?? ''}
                                disabled={disabledPoolIds.includes(pool.id) || unitPriceDisabled}
                                onChange={(e) => updatePoolQuantityTier(pool.id, idx, 'unitPrice', e.target.value)}
                                className={`px-2 py-1 text-sm border rounded ${unitPriceDisabled ? 'border-gray-200 bg-gray-100 text-gray-400' : 'border-gray-300'}`}
                              />
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="Discount %"
                                value={tier.discountPercent ?? ''}
                                disabled={disabledPoolIds.includes(pool.id) || discountDisabled}
                                onChange={(e) =>
                                  updatePoolQuantityTier(pool.id, idx, 'discountPercent', e.target.value)
                                }
                                className={`px-2 py-1 text-sm border rounded ${discountDisabled ? 'border-gray-200 bg-gray-100 text-gray-400' : 'border-gray-300'}`}
                              />
                              <button
                                type="button"
                                disabled={disabledPoolIds.includes(pool.id)}
                                onClick={() => removePoolQuantityTier(pool.id, idx)}
                                className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                              >
                                Remove Tier
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        disabled={disabledPoolIds.includes(pool.id)}
                        onClick={() => addPoolQuantityTier(pool.id)}
                        className="text-xs text-[#29b6f6] hover:underline disabled:opacity-50"
                      >
                        + Add Quantity Tier
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(pool.options || []).map((opt) => {
                        const selected = isPoolOptionSelected(pool.id, opt.id);
                        const sel = (poolSelections[pool.id] || []).find((x) => x.id === opt.id);
                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-lg border-2 transition ${selected ? 'border-[#29b6f6] bg-[#29b6f6]/5' : 'border-gray-200'} ${disabledPoolIds.includes(pool.id) ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={disabledPoolIds.includes(pool.id)}
                                  onChange={() => togglePoolOption(pool.id, opt.id)}
                                  className="rounded"
                                />
                                <span className="font-medium text-gray-900">{opt.label}</span>
                              </label>
                              <span className="text-xs text-gray-500">${(opt.priceModifier || 0).toFixed(2)}</span>
                            </div>
                            {selected && (
                              <div className="mt-2 space-y-2">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Custom Price (optional)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={sel?.customPrice ?? ''}
                                    disabled={disabledPoolIds.includes(pool.id)}
                                    onChange={(e) => updatePoolOptionPrice(pool.id, opt.id, e.target.value)}
                                    placeholder="Use default"
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                  />
                                </div>
                                {pool.key === 'production_time' && (
                                  <div className="flex items-center gap-2">
                                    <label className="block text-xs text-gray-600 whitespace-nowrap">Pricing Type:</label>
                                    <select
                                      value={sel?.pricingType || 'flat'}
                                      disabled={disabledPoolIds.includes(pool.id)}
                                      onChange={(e) => {
                                        const newType = e.target.value;
                                        setPoolSelections((prev) => ({
                                          ...prev,
                                          [pool.id]: (prev[pool.id] || []).map((item) =>
                                            item.id === opt.id
                                              ? { ...item, pricingType: newType, percentageValue: newType === 'percentage' ? item.percentageValue ?? 0 : null, customPrice: newType === 'flat' ? item.customPrice : null }
                                              : item
                                          ),
                                        }));
                                      }}
                                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                                    >
                                      <option value="flat">Flat</option>
                                      <option value="percentage">Percentage</option>
                                    </select>
                                  </div>
                                )}
                                {pool.key === 'production_time' && sel?.pricingType === 'percentage' && (
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Percentage Value (%)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      value={sel?.percentageValue ?? ''}
                                      disabled={disabledPoolIds.includes(pool.id)}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                        setPoolSelections((prev) => ({
                                          ...prev,
                                          [pool.id]: (prev[pool.id] || []).map((item) =>
                                            item.id === opt.id ? { ...item, percentageValue: val } : item
                                          ),
                                        }));
                                      }}
                                      placeholder="e.g., 20"
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pricing & Tiers Tab */}
      {activeTab === 'pricing' && quoteConfig && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantity Pricing Tiers</h3>
          <p className="text-xs text-gray-500 mb-4">
            Quantity tier pricing is product-specific. Configure tiers for this product only.
          </p>
          <p className="text-xs text-[#29b6f6] mb-4">Choose either Unit Price OR Discount %, not both.</p>
          <div className="space-y-4">
            <div className="grid gap-3">
              {customQuantityTiers.map((tier, index) => {
                const unitPriceDisabled = tier.discountPercent > 0;
                const discountDisabled = tier.unitPrice > 0;
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Min Qty</label>
                        <input
                          type="number"
                          value={tier.minQty || ''}
                          onChange={(e) => updateCustomTier(index, 'minQty', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Max Qty</label>
                        <input
                          type="number"
                          value={tier.maxQty ?? ''}
                          onChange={(e) => updateCustomTier(index, 'maxQty', e.target.value)}
                          placeholder="∞"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Unit Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={tier.unitPrice || ''}
                          disabled={unitPriceDisabled}
                          onChange={(e) => updateCustomTier(index, 'unitPrice', e.target.value)}
                          className={`w-full px-3 py-1.5 text-sm border rounded ${unitPriceDisabled ? 'border-gray-200 bg-gray-100 text-gray-400' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Discount %</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={tier.discountPercent ?? ''}
                          disabled={discountDisabled}
                          onChange={(e) => updateCustomTier(index, 'discountPercent', e.target.value)}
                          placeholder="0"
                          className={`w-full px-3 py-1.5 text-sm border rounded ${discountDisabled ? 'border-gray-200 bg-gray-100 text-gray-400' : 'border-gray-300'}`}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCustomTier(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addCustomTier}
              className="text-[#29b6f6] hover:text-[#1e8fc4] text-sm font-medium"
            >
              + Add Tier
            </button>
          </div>
        </div>
      )}

      {/* Decorations Tab */}
      {activeTab === 'decorations' && quoteConfig && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Decoration Options</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select available decorations and set custom prices per piece (leave empty to use global default).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quoteConfig.decorations.filter((d) => d.enabled).map((dec) =>
              renderOptionWithPrice(dec, 'decorations', selectedDecorations, setSelectedDecorations)
            )}
          </div>
        </div>
      )}

      {/* Colors Tab */}
      {activeTab === 'colors' && quoteConfig && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Available Colors</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select which colors are available for this product.
          </p>
          <div className="flex flex-wrap gap-4">
            {quoteConfig.colors.filter((c) => c.enabled).map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => toggleColor(color.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition ${
                  selectedColors.includes(color.id)
                    ? 'border-[#29b6f6] bg-[#29b6f6]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full border border-gray-300"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-sm font-medium">{color.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sizes Tab */}
      {activeTab === 'sizes' && quoteConfig && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Size Options</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select available sizes and set custom price add-ons per piece (leave empty to use global default).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quoteConfig.sizes.filter((s) => s.baseEnabled).map((size) =>
              renderOptionWithPrice(size, 'sizes', selectedSizes, setSelectedSizes, 'label')
            )}
          </div>
        </div>
      )}

      {/* Print Locations Tab */}
      {activeTab === 'locations' && quoteConfig && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Print Location Options</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select available print locations and set custom prices per piece (leave empty to use global default).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quoteConfig.printLocations.filter((p) => p.enabled).map((loc) =>
              renderOptionWithPrice(loc, 'printLocations', selectedPrintLocations, setSelectedPrintLocations)
            )}
          </div>
        </div>
      )}

      {/* Turnarounds Tab */}
      {activeTab === 'turnarounds' && quoteConfig && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Turnaround Options</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select available turnaround times and set custom prices per order (leave empty to use global default).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quoteConfig.turnarounds.filter((t) => t.enabled).map((turn) => {
              const selected = selectedTurnarounds.find((s) => s.id === turn.id);
              const isSelected = !!selected;
              const globalPrice = getGlobalPrice('turnarounds', turn.id);
              const label = turn.name;
              const pricingType = selected?.pricingType || turn.pricingType || 'flat';
              const percentageValue = selected?.percentageValue ?? turn.percentageValue ?? null;
              return (
                <div
                  key={turn.id}
                  className={`p-4 rounded-lg border-2 transition ${
                    isSelected ? 'border-[#29b6f6] bg-[#29b6f6]/5' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOptionWithPrice(setSelectedTurnarounds, turn.id, selectedTurnarounds)}
                        className="rounded"
                      />
                      <span className="font-medium text-gray-900">{label}</span>
                    </label>
                    <span className="text-xs text-gray-500">
                      Global: ${globalPrice.toFixed(2)}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="block text-xs text-gray-600 whitespace-nowrap">Pricing Type:</label>
                        <select
                          value={pricingType || 'flat'}
                          onChange={(e) => {
                            const newPricingType = e.target.value;
                            setSelectedTurnarounds((prev) =>
                              prev.map((item) =>
                                item.id === turn.id
                                  ? { ...item, pricingType: newPricingType, percentageValue: newPricingType === 'percentage' ? (item.percentageValue ?? 0) : null }
                                  : item
                              )
                            );
                          }}
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                        >
                          <option value="flat">Flat</option>
                          <option value="percentage">Percentage</option>
                        </select>
                      </div>
                      {pricingType === 'flat' ? (
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Custom Price (leave empty to use global)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={selected.customPrice ?? ''}
                            onChange={(e) => updateCustomPrice(setSelectedTurnarounds, selectedTurnarounds, turn.id, e.target.value)}
                            placeholder={`Default: $${globalPrice.toFixed(2)}`}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Percentage Value (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={percentageValue ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              setSelectedTurnarounds((prev) =>
                                prev.map((item) =>
                                  item.id === turn.id
                                    ? { ...item, percentageValue: val, customPrice: null }
                                    : item
                                )
                              );
                            }}
                            placeholder="e.g., 15"
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Applied on merchandise subtotal + addons
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Designer Help Tab */}
      {activeTab === 'designer' && quoteConfig && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Designer Help Options</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select available designer help tiers and set custom prices per order (leave empty to use global default).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quoteConfig.designerHelp.filter((d) => d.enabled).map((help) =>
              renderOptionWithPrice(help, 'designerHelp', selectedDesignerHelp, setSelectedDesignerHelp)
            )}
          </div>
        </div>
      )}

      {/* Config Loading State */}
      {configLoading && activeTab !== 'basic' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Loading quote configuration...</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-[#29b6f6] text-white px-6 py-2 rounded-lg hover:bg-[#1e8fc4] transition disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : initialProduct ? 'Update Product' : 'Add Product'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-gray-300 text-gray-900 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
        >
          Cancel
        </button>
      </div>
    </form>

    {/* File inputs are outside the form so the browser cannot treat file selection as a native form submit (full page reload). */}
    <input
      ref={mainImageFileRef}
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      onChange={handleImageUpload}
      disabled={uploading}
      className="hidden"
      tabIndex={-1}
      aria-hidden={true}
    />
    <input
      ref={galleryFileRef}
      type="file"
      multiple
      accept="image/jpeg,image/png,image/gif,image/webp"
      onChange={handleGalleryImageUpload}
      disabled={uploading}
      className="hidden"
      tabIndex={-1}
      aria-hidden={true}
    />
    <input
      ref={videoFileRef}
      type="file"
      accept="video/mp4,video/webm,video/ogg,video/quicktime"
      onChange={handleVideoUpload}
      disabled={uploading}
      className="hidden"
      tabIndex={-1}
      aria-hidden={true}
    />
    </>
  );
}