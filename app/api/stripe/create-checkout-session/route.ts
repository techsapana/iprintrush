import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { beginTransaction, commit, rollback, query, queryOne } from '@/app/lib/db';
import { getStripe } from '@/app/lib/stripe';
import Stripe from 'stripe';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';
import { mkdir, rename } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { buildShippingConfig, getShippingCost, getShippingDecision, getOversizedDetails, type CartItem } from '@/app/lib/shippingEngine';
import { normalizeDeliveryMethod, type ValidDeliveryMethod } from '@/app/lib/quoteEngine';
import { lookupZoneByZip } from '@/app/lib/shipping/zipZoneService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateCheckoutSessionSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        quantity: z.number().int().min(1).max(999),
        quotePayload: z.any().optional(),
        customizationsDisplay: z.record(z.string()).optional(),
        splitQuote: z.boolean().optional(),
        splitGroupId: z.string().optional(),
        splitSizeLabel: z.string().optional(),
        artworkReady: z.boolean().optional(),
        tempArtworkFiles: z.array(z.string()).optional(),
        artworkFiles: z.array(z.string()).optional(),
        customSizeNote: z.string().optional(),
      })
    )
    .min(1),
  customer: z
    .object({
      firstName: z.string().optional().default(''),
      lastName: z.string().optional().default(''),
      email: z.string().email().optional().default(''),
      phone: z.string().optional().default(''),
      address: z.string().optional().default(''),
      city: z.string().optional().default(''),
      state: z.string().optional().default(''),
      zip: z.string().optional().default(''),
      apartmentOrSuite: z.string().optional().default(''),
      notes: z.string().optional().default(''),
      deliveryMethod: z.union([
        z.enum(['pickup', 'local_delivery', 'standard_shipping', 'review_required']),
        z.literal('shipping'),
      ]).optional().default('pickup'),
      shippingAddress: z.string().optional().default(''),
      shippingApt: z.string().optional().default(''),
      shippingCity: z.string().optional().default(''),
      shippingState: z.string().optional().default(''),
      shippingZip: z.string().optional().default(''),
      selectedShipping: z
        .object({
          serviceType: z.string().min(1),
          serviceName: z.string().optional(),
          cost: z.number().nonnegative(),
          estimatedDeliveryDate: z.string().optional().nullable(),
          estimatedDeliveryLabel: z.string().optional().nullable(),
        })
        .optional(),
      shippingRatesUnavailable: z.boolean().optional(),
      useRuleBasedShipping: z.boolean().optional(),
      selectedMethod: z.string().optional(),
      shippingMethodsData: z.any().optional(),
    })
    .optional(),
  couponCode: z.string().trim().optional(),
});

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function fromCents(amount: number) {
  return Math.round(amount) / 100;
}

function normalizeCheckoutDeliveryMethod(
  deliveryMethod: unknown,
  selectedMethod: string | undefined,
  selectedShippingServiceType: string | undefined,
): ValidDeliveryMethod {
  if (selectedMethod && ['pickup', 'local_delivery', 'standard_shipping', 'review_required'].includes(selectedMethod)) {
    return selectedMethod as ValidDeliveryMethod;
  }
  if (selectedShippingServiceType && ['pickup', 'local_delivery', 'standard_shipping', 'review_required'].includes(selectedShippingServiceType)) {
    return selectedShippingServiceType as ValidDeliveryMethod;
  }

  const normalized = normalizeDeliveryMethod(deliveryMethod);
  if (normalized === 'review_required') {
    return 'review_required';
  }
  if (normalized === 'local_delivery') {
    return 'local_delivery';
  }
  if (normalized === 'standard_shipping') {
    return 'standard_shipping';
  }
  return 'pickup';
}

function assertShippingMethodSelected(
  deliveryMethod: ValidDeliveryMethod,
  checkoutCustomer: {
    selectedShipping?: { serviceType?: string; cost?: number } | null;
    selectedMethod?: string;
    shippingMethodsData?: { type?: string; id?: string; serviceType?: string; cost?: number } | null;
  },
): void {
  if (deliveryMethod === 'pickup' || deliveryMethod === 'review_required') return;

  const hasSelectedShipping =
    deliveryMethod === 'standard_shipping' ||
    deliveryMethod === 'local_delivery' ||
    checkoutCustomer.selectedShipping != null ||
    checkoutCustomer.shippingMethodsData != null;

  if (!hasSelectedShipping) {
    throw new Error('A shipping method must be selected before checkout.');
  }
}

function computeNonQuoteShippingTierSubtotal(
  items: any[],
  productMap: Map<string, any>,
): number {
  return items
    .filter((i) => !i.quotePayload)
    .reduce((sum, i) => {
      const p = productMap.get(i.id);
      const unitPrice = Number(p?.price || 0);
      return sum + unitPrice * Math.max(1, i.quantity || 1);
    }, 0);
}

function getSplitSizeLabel(item: any): string | null {
  return (
    item.splitSizeLabel ||
    item.customizationsDisplay?.Size ||
    item.customizationsDisplay?.size ||
    item.customizationsDisplay?.['Print Size'] ||
    item.customizationsDisplay?.Dimensions ||
    null
  );
}

function allocateCents(totalCents: number, qty: number, totalQty: number, index: number, count: number): number {
  if (count <= 0) return 0;
  if (index < count - 1) {
    return Math.floor((totalCents * qty) / totalQty);
  }
  return totalCents - Math.floor((totalCents * (totalQty - qty)) / totalQty);
}

function prorateLineItemsCents(lineItems: { label: string; amount: number }[], qty: number, totalQty: number, index: number, count: number) {
  return lineItems.map((item) => ({
    label: item.label,
    amount: fromCents(allocateCents(toCents(item.amount), qty, totalQty, index, count)),
  }));
}

function buildSplitQuoteSummary(
  summary: any,
  item: any,
  index: number,
  count: number,
): { summary: any; lineTotal: number } {
  const sizeLabel = getSplitSizeLabel(item);
  const sizeBreakdown = Array.isArray(summary.sizeBreakdown) ? summary.sizeBreakdown : [];
  const matchIndex = sizeBreakdown.findIndex((s: any) => String(s?.sizeLabel || '') === String(sizeLabel || ''));
  if (matchIndex < 0) {
    throw new Error(`Unable to match split quote size: ${String(sizeLabel || '')}`);
  }

  const size = sizeBreakdown[matchIndex];
  const qty = Math.max(1, Number(size?.quantity || item.quantity || 1));
  const totalQty = Math.max(1, Number(summary.totalQuantity || 0));
  if (Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 && Number(item.quantity) !== qty) {
    throw new Error('Split quote item quantity does not match server quote size breakdown');
  }
  if (qty <= 0 || totalQty <= 0) {
    throw new Error('Invalid split quote quantity');
  }

  const grandTotalCents = toCents(summary.grandTotal || 0);
  const subtotalCents = toCents(summary.subtotal || 0);
  const shippingCents = toCents(summary.shipping || 0);
  const lineTotalCents = allocateCents(grandTotalCents, qty, totalQty, index, count);
  const splitSubtotalCents = allocateCents(subtotalCents, qty, totalQty, index, count);
  const splitShippingCents = allocateCents(shippingCents, qty, totalQty, index, count);

  return {
    lineTotal: fromCents(lineTotalCents),
    summary: {
      ...summary,
      totalQuantity: qty,
      unitPrice: qty > 0 ? fromCents(lineTotalCents) / qty : 0,
      lineItems: prorateLineItemsCents(summary.lineItems || [], qty, totalQty, index, count),
      subtotal: fromCents(splitSubtotalCents),
      shipping: fromCents(splitShippingCents),
      grandTotal: fromCents(lineTotalCents),
      shippingTierSubtotal: fromCents(allocateCents(toCents(summary.shippingTierSubtotal ?? summary.subtotal ?? 0), qty, totalQty, index, count)),
      merchandiseSubtotal: fromCents(allocateCents(toCents(summary.merchandiseSubtotal ?? 0), qty, totalQty, index, count)),
      sizeBreakdown: [{ sizeLabel: size.sizeLabel || getSplitSizeLabel(item) || 'Selected size', quantity: qty }],
    },
  };
}

function makeOrderNumber() {
  return `ORD-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

async function ensureOrderShippingColumns() {
  const columns = [
    {
      name: 'shipping_amount',
      ddl: 'ALTER TABLE orders ADD COLUMN shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER amount_tax',
    },
    {
      name: 'shipping_carrier',
      ddl: 'ALTER TABLE orders ADD COLUMN shipping_carrier VARCHAR(50) NULL AFTER shipping_amount',
    },
    {
      name: 'shipping_service',
      ddl: 'ALTER TABLE orders ADD COLUMN shipping_service VARCHAR(100) NULL AFTER shipping_carrier',
    },
    {
      name: 'shipping_payload_json',
      ddl: 'ALTER TABLE orders ADD COLUMN shipping_payload_json JSON NULL AFTER shipping_service',
    },
    {
      name: 'shipping_service_name',
      ddl: 'ALTER TABLE orders ADD COLUMN shipping_service_name VARCHAR(120) NULL AFTER shipping_service',
    },
    {
      name: 'estimated_delivery_date',
      ddl: 'ALTER TABLE orders ADD COLUMN estimated_delivery_date VARCHAR(64) NULL AFTER shipping_service_name',
    },
    {
      name: 'shipping_review_required',
      ddl: 'ALTER TABLE orders ADD COLUMN shipping_review_required BOOLEAN NOT NULL DEFAULT 0 AFTER shipping_payload_json',
    },
  ];

  for (const col of columns) {
    const existing = await queryOne(`SHOW COLUMNS FROM orders LIKE '${col.name}'`);
    if (!existing) {
      await query(col.ddl);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = CreateCheckoutSessionSchema.parse(await req.json());

    // Get authenticated user if available
    const authCustomer = getCustomerFromRequest(req);
    let userId = null;
    if (authCustomer && authCustomer.id) {
      // Extract numeric ID from "customer-{id}" format
      const match = authCustomer.id.match(/customer-(\d+)/);
      if (match) {
        userId = parseInt(match[1], 10);
      }
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_SITE_URL (or Origin header)' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    type CheckoutCustomer = NonNullable<z.infer<typeof CreateCheckoutSessionSchema>['customer']>;
    const checkoutCustomer = (payload.customer || {}) as CheckoutCustomer;

    const normalizedDeliveryMethod = normalizeCheckoutDeliveryMethod(
      checkoutCustomer.deliveryMethod,
      checkoutCustomer.selectedMethod,
      checkoutCustomer.shippingMethodsData?.type || checkoutCustomer.shippingMethodsData?.id || checkoutCustomer.shippingMethodsData?.serviceType || checkoutCustomer.selectedShipping?.serviceType,
    );
    assertShippingMethodSelected(normalizedDeliveryMethod, checkoutCustomer);

    const configRows = (await query('SELECT * FROM shipping_config LIMIT 1')) as any[];
    const shippingConfig = buildShippingConfig(configRows[0] || {});

    const productIds = [...new Set(payload.items.map((i) => i.id))];
    const rows = await query(
      `SELECT id, name, price, image, enabled, weight_lb, package_length_in, package_width_in, package_height_in
       FROM products
       WHERE id IN (${productIds.map(() => '?').join(',')})`,
      productIds
    );
    const products = Array.isArray(rows) ? rows : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const id of productIds) {
      const p = productMap.get(id);
      if (!p) return NextResponse.json({ error: `Product not found: ${id}` }, { status: 400 });
      if (p.enabled === 0 || p.enabled === false) {
        return NextResponse.json({ error: `Product disabled: ${id}` }, { status: 400 });
      }
    }

    const oversizedItems = payload.items.map((item) => {
      const product = productMap.get(item.id);
      return {
        id: item.id,
        quantity: item.quantity,
        quotePayload: item.quotePayload || null,
        product: {
          id: product?.id,
          weight_lb: product?.weight_lb ?? null,
          package_width_in: product?.package_width_in ?? null,
        },
      };
    });
    const oversizedDetails = getOversizedDetails(oversizedItems, shippingConfig);
    const oversized = oversizedDetails.anyOversized;
    const selectedStandardShipping =
      normalizedDeliveryMethod === 'standard_shipping';

    if (oversized && selectedStandardShipping) {
      return NextResponse.json(
        { error: 'Standard shipping is unavailable for oversized items. Shipping review is required.' },
        { status: 400 },
      );
    }

    const conn = await beginTransaction();
    try {
      const shippingReviewRequired = oversized || normalizedDeliveryMethod === 'review_required';

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
      const orderItemRows: {
        productId: string;
        name: string;
        qty: number;
        unitPrice: number;
        lineTotal: number;
        customizationJson: string | null;
        artworkReady: boolean;
        tempArtworkFiles: string[];
        artworkFiles: string[];
        customSizeNote: string;
      }[] = [];
      let subtotalCents = 0;
      let shippingCents = 0;
      let shippingMeta: any = null;
      let hasNonQuoteItem = false;
      let quoteShippingCents = 0;
      let quoteMerchandiseCents = 0;
      let serverSummary: any = null;
      const isShippingMethod = normalizedDeliveryMethod === 'local_delivery' || normalizedDeliveryMethod === 'standard_shipping';

      for (const item of payload.items) {
        const p = productMap.get(item.id);
        if (!p || item.quantity <= 0) continue;

        let itemTotal = 0;
        let resolvedUnitPrice = 0;
        let customizationJson: string | null = null;
        let itemMerchandise = 0;

        if (item.quotePayload) {
          const quotePayloadForRecalc = {
            ...item.quotePayload,
            deliveryMethod: normalizedDeliveryMethod,
            ...(checkoutCustomer.shippingState ? { shippingState: checkoutCustomer.shippingState } : {}),
            ...(checkoutCustomer.shippingZip ? { shippingZip: checkoutCustomer.shippingZip } : {}),
          };
          const calcRes = await fetch(`${baseUrl}/api/quote/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quotePayloadForRecalc),
          });
          if (!calcRes.ok) {
            await rollback(conn);
            const errData = await calcRes.json().catch(() => ({}));
            return NextResponse.json({ error: errData?.error || 'Quote validation failed' }, { status: 400 });
          }
          serverSummary = await calcRes.json();
          if (serverSummary.productId !== item.id) {
            await rollback(conn);
            return NextResponse.json({ error: 'Quote product mismatch' }, { status: 400 });
          }

          const splitQuoteIndex = payload.items.findIndex((candidate, candidateIndex) =>
            candidateIndex <= payload.items.indexOf(item) &&
            candidate.splitQuote === true &&
            candidate.splitGroupId === item.splitGroupId
          );
          const splitQuoteCount = payload.items.filter((candidate) =>
            candidate.splitQuote === true && candidate.splitGroupId === item.splitGroupId
          ).length;

          if (item.splitQuote === true) {
            const split = buildSplitQuoteSummary(serverSummary, item, splitQuoteIndex, splitQuoteCount);
            const splitGrandTotal = split.lineTotal;
            const splitMerchandise = split.summary.subtotal || 0;
            const splitShipping = split.summary.shipping || 0;
            itemTotal = splitMerchandise;
            itemMerchandise = splitMerchandise;
            const serverSummaryForSplit = split.summary;
            customizationJson = JSON.stringify({
              lineItems: serverSummaryForSplit.lineItems || [],
              customizationsDisplay: item.customizationsDisplay || {},
              mode: 'split_quote',
              quotePayload: quotePayloadForRecalc,
              quoteSummary: serverSummaryForSplit,
            });
            resolvedUnitPrice = item.quantity > 0 ? splitMerchandise / item.quantity : 0;
            quoteMerchandiseCents += toCents(splitMerchandise);
            quoteShippingCents += toCents(splitShipping);
          } else {
            const grandTotal = Number(serverSummary.grandTotal || 0);
            const merchandise = Number(serverSummary.subtotal || 0);
            const shippingTotal = Number(serverSummary.shipping || 0);
            itemTotal = merchandise;
            itemMerchandise = merchandise;
            customizationJson = JSON.stringify({
              lineItems: serverSummary.lineItems || [],
              customizationsDisplay: item.customizationsDisplay || {},
              mode: item.quotePayload.mode || 'apparel',
              quotePayload: quotePayloadForRecalc,
              quoteSummary: serverSummary || null,
            });
            resolvedUnitPrice = item.quantity > 0 ? merchandise / item.quantity : 0;
            quoteMerchandiseCents += toCents(merchandise);
            quoteShippingCents += toCents(shippingTotal);
          }

        } else {
          hasNonQuoteItem = true;
          const unitPrice = Number(p.price || 0);
          itemTotal = unitPrice * item.quantity;
          itemMerchandise = itemTotal;
          resolvedUnitPrice = unitPrice;
        }

        if (itemTotal <= 0) {
          await rollback(conn);
          return NextResponse.json({ error: 'Quote total must be greater than zero' }, { status: 400 });
        }

        const amountCents = toCents(itemTotal);
        const merchandiseCents = toCents(itemMerchandise);
        subtotalCents += merchandiseCents;

        const productName = String(p.name || 'Product');
        const sizeLabel =
          item.customizationsDisplay?.Size ||
          item.customizationsDisplay?.size ||
          item.customizationsDisplay?.['Print Size'] ||
          item.customizationsDisplay?.Dimensions ||
          null;
        const displayName = customizationJson
          ? `${productName}${sizeLabel ? ` - ${sizeLabel}` : ''} (customized)`
          : productName;

        // Build a Stripe-safe image URL (must be absolute http/https). Skip invalid URLs.
        let imageUrl: string | undefined;
        if (p.image) {
          const raw = String(p.image);
          if (raw.startsWith('http://') || raw.startsWith('https://')) {
            imageUrl = raw;
          } else if (raw.startsWith('/')) {
            imageUrl = `${origin}${raw}`;
          }
        }

        lineItems.push({
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents, // Unchanged - customer pays grandTotal
            product_data: {
              name: displayName,
              images: imageUrl ? [imageUrl] : undefined,
            },
          },
        });

        orderItemRows.push({
          productId: item.id,
          name: productName,
          qty: item.quantity,
          unitPrice: item.quantity > 0 ? itemMerchandise / item.quantity : 0,
          lineTotal: itemMerchandise,
          customizationJson,
          artworkReady: item.artworkReady === true,
          tempArtworkFiles: Array.isArray(item.tempArtworkFiles)
            ? item.tempArtworkFiles.filter((x) => typeof x === 'string' && x.trim().length > 0)
            : [],
          artworkFiles: Array.isArray(item.artworkFiles)
            ? item.artworkFiles.filter((x) => typeof x === 'string' && x.trim().length > 0)
            : [],
          customSizeNote: typeof item.customSizeNote === 'string' ? item.customSizeNote : '',
        });

        // TEMP DEBUG LOG
        console.log('--- PRODUCT DEBUG ---');
        console.log('displayName:', displayName);
        console.log('isQuote:', !!item.quotePayload);
        console.log('item.quantity:', item.quantity);
        console.log('itemTotal:', itemTotal);
        console.log('amountCents:', amountCents);
        console.log('serverSummary?.subtotal:', serverSummary?.subtotal);
        console.log('serverSummary?.shipping:', serverSummary?.shipping);
        console.log('serverSummary?.grandTotal:', serverSummary?.grandTotal);
      }

      if (lineItems.length === 0) {
        await rollback(conn);
        return NextResponse.json({ error: 'No chargeable items in checkout' }, { status: 400 });
      }

      const siteSettings: any = await query(
        'SELECT tax_rate_percent FROM site_settings ORDER BY id ASC LIMIT 1',
      );
      const taxRatePercent =
        Array.isArray(siteSettings) && siteSettings[0]?.tax_rate_percent != null
          ? Number(siteSettings[0].tax_rate_percent)
          : Number(process.env.NEXT_PUBLIC_TAX_RATE || 0) * 100;
      const taxRate = (Number.isFinite(taxRatePercent) ? taxRatePercent : 0) / 100;
 
      // Apply coupon discount (must match product-level code)
      let discountCents = 0;
      let appliedCouponCode: string | null = null;
      if (payload.couponCode) {
        const raw = payload.couponCode.trim().toUpperCase();
        const eligibleProductIds = orderItemRows.map((x) => x.productId);
        const couponRows: any = await query(
          `SELECT product_id, discount_percent
           FROM product_coupon_codes
           WHERE coupon_code = ? AND is_active = 1
             AND product_id IN (${eligibleProductIds.map(() => '?').join(',')})`,
          [raw, ...eligibleProductIds],
        );
        if (Array.isArray(couponRows) && couponRows.length > 0) {
          appliedCouponCode = raw;
          for (const row of orderItemRows) {
            const matched = couponRows.find((c: any) => c.product_id === row.productId);
            if (!matched) continue;
            const pct = Math.max(0, Number(matched.discount_percent || 0));
            discountCents += Math.round(toCents(row.lineTotal) * (pct / 100));
          }
          discountCents = Math.min(discountCents, subtotalCents);
        }
      }

      const taxableBaseCents = Math.max(0, subtotalCents - discountCents);
    
      if (normalizedDeliveryMethod === 'pickup' || normalizedDeliveryMethod === 'review_required') {
        if (normalizedDeliveryMethod === 'review_required' && !checkoutCustomer.shippingAddress) {
          await rollback(conn);
          return NextResponse.json(
            { error: 'Shipping address is required for shipping review.' },
            { status: 400 },
          );
        }
        // Pickup and review-required shipping have no immediate charge.
      } else if (hasNonQuoteItem) {
        const decision = getShippingDecision(oversizedItems, shippingConfig);
        if (!decision.allowedMethods.includes(normalizedDeliveryMethod)) {
          await rollback(conn);
          return NextResponse.json(
            { error: `${normalizedDeliveryMethod} is not available for this order.` },
            { status: 400 },
          );
        }

        const tierSubtotal = computeNonQuoteShippingTierSubtotal(payload.items, productMap);

        if (normalizedDeliveryMethod === 'local_delivery') {
          const zip = String(checkoutCustomer.shippingZip || '').trim();
          const zone = await lookupZoneByZip(zip);
          if (!zone) {
            await rollback(conn);
            return NextResponse.json(
              { error: 'Local delivery is not available for this ZIP code.' },
              { status: 400 },
            );
          }
          const localCost = tierSubtotal >= zone.free_delivery_minimum ? 0 : zone.delivery_fee;
          shippingCents = toCents(localCost);
          shippingMeta = {
            carrier: 'Local Delivery',
            serviceType: 'local_delivery',
            serviceName: 'Local Delivery',
            estimatedDeliveryDate: null,
            estimatedDeliveryLabel: null,
            selectedByCustomer: true,
            shippingReviewRequired,
            ...(shippingReviewRequired && {
              message: 'Oversized items require manual shipping review. Our team will contact you with options.',
            }),
            destination: {
              addressLines: [checkoutCustomer.shippingAddress || 'Address Line'],
              city: checkoutCustomer.shippingCity || 'City',
              stateOrProvinceCode: checkoutCustomer.shippingState || 'CA',
              postalCode: checkoutCustomer.shippingZip || '',
              countryCode: 'US',
            },
          };
        } else {
          const standardCost = getShippingCost(tierSubtotal, 'standard_shipping', shippingConfig);
          shippingCents = toCents(standardCost);
          shippingMeta = {
            carrier: 'Standard Shipping',
            serviceType: 'standard_shipping',
            serviceName: 'Standard Shipping',
            estimatedDeliveryDate: null,
            estimatedDeliveryLabel: null,
            selectedByCustomer: true,
            shippingReviewRequired,
            destination: {
              addressLines: [checkoutCustomer.shippingAddress || 'Address Line'],
              city: checkoutCustomer.shippingCity || 'City',
              stateOrProvinceCode: checkoutCustomer.shippingState || 'CA',
              postalCode: checkoutCustomer.shippingZip || '',
              countryCode: 'US',
            },
          };
        }
      }

      if (!hasNonQuoteItem && quoteShippingCents > 0 && isShippingMethod) {
        shippingCents = quoteShippingCents;
        shippingMeta = {
          carrier: normalizedDeliveryMethod === 'local_delivery' ? 'Local Delivery' : 'Standard Shipping',
          serviceType: normalizedDeliveryMethod,
          serviceName: normalizedDeliveryMethod === 'local_delivery' ? 'Local Delivery' : 'Standard Shipping',
          estimatedDeliveryDate: null,
          estimatedDeliveryLabel: null,
          selectedByCustomer: false,
          shippingReviewRequired,
          destination: {
            addressLines: [checkoutCustomer.shippingAddress || 'Address Line'],
            city: checkoutCustomer.shippingCity || 'City',
            stateOrProvinceCode: checkoutCustomer.shippingState || 'CA',
            postalCode: checkoutCustomer.shippingZip || '',
            countryCode: 'US',
          },
        };
      }

      // Tax and total are calculated exactly once, after shippingCents is finalized.
      const taxCents = Math.round((taxableBaseCents + shippingCents) * taxRate);
      const totalCents = taxableBaseCents + shippingCents + taxCents;

      const orderNumber = makeOrderNumber();
      const requiresShippingAddress =
        isShippingMethod || normalizedDeliveryMethod === 'review_required';
      if (
        requiresShippingAddress &&
        (!checkoutCustomer.shippingAddress || !checkoutCustomer.shippingCity || !checkoutCustomer.shippingZip)
      ) {
        await rollback(conn);
        return NextResponse.json(
          { error: 'Shipping address, city, and ZIP code are required for shipping delivery.' },
          { status: 400 }
        );
      }
      const customerName = [checkoutCustomer.firstName, checkoutCustomer.lastName].filter(Boolean).join(' ').trim();
      const billingAddress = {
        address: checkoutCustomer.address || '',
        apartmentOrSuite: checkoutCustomer.apartmentOrSuite || '',
        city: checkoutCustomer.city || '',
        state: checkoutCustomer.state || '',
        zip: checkoutCustomer.zip || '',
      };
      const shippingAddr = requiresShippingAddress
        ? {
            address: checkoutCustomer.shippingAddress || '',
            apt: checkoutCustomer.shippingApt || '',
            city: checkoutCustomer.shippingCity || '',
            state: checkoutCustomer.shippingState || '',
            zip: checkoutCustomer.shippingZip || '',
          }
        : null;

      await ensureOrderShippingColumns();
      const orderColumns = [
        'order_number',
        'status',
        'currency',
        'amount_subtotal',
        'amount_tax',
        'shipping_amount',
        'amount_total',
        'discount_amount',
        'coupon_code',
        'customer_name',
        'customer_email',
        'customer_phone',
        'billing_address_json',
        'shipping_address_json',
        'order_notes',
        'delivery_method',
        'shipping_carrier',
        'shipping_service',
        'shipping_payload_json',
        'shipping_review_required',
      ];
      const orderValues: any[] = [
        orderNumber,
        'pending',
        'usd',
        fromCents(subtotalCents),
        fromCents(taxCents),
        fromCents(shippingCents),
        fromCents(totalCents),
        fromCents(discountCents),
        appliedCouponCode,
        customerName || null,
        checkoutCustomer.email || null,
        checkoutCustomer.phone || null,
        JSON.stringify(billingAddress),
        shippingAddr ? JSON.stringify(shippingAddr) : null,
        checkoutCustomer.notes || null,
        normalizedDeliveryMethod,
        shippingMeta?.carrier || null,
        shippingMeta?.serviceType || null,
        shippingMeta ? JSON.stringify(shippingMeta) : null,
        shippingReviewRequired,
      ];

      const hasServiceNameCol = await queryOne(`SHOW COLUMNS FROM orders LIKE 'shipping_service_name'`);
      const hasDeliveryCol = await queryOne(`SHOW COLUMNS FROM orders LIKE 'estimated_delivery_date'`);
      if (hasServiceNameCol) {
        orderColumns.push('shipping_service_name');
        orderValues.push(shippingMeta?.serviceName || null);
      }
      if (hasDeliveryCol) {
        orderColumns.push('estimated_delivery_date');
        orderValues.push(
          shippingMeta?.estimatedDeliveryDate ||
            shippingMeta?.estimatedDeliveryLabel ||
            null,
        );
      }

      const placeholders = orderColumns.map(() => '?').join(', ');
      const [orderInsert] = await conn.query(
        `INSERT INTO orders (${orderColumns.join(', ')}) VALUES (${placeholders})`,
        orderValues,
      );
      const orderId = (orderInsert as any)?.insertId;

      const tempDir = path.join(process.cwd(), 'uploads', 'private-artwork-temp');
      const privateRoot = path.join(process.cwd(), 'uploads', 'private-artwork');
      if (!existsSync(privateRoot)) {
        await mkdir(privateRoot, { recursive: true });
      }

      for (const row of orderItemRows) {
        const movedArtworkFiles: string[] = [];
        const finalArtworkFiles: string[] = [];
        if (row.artworkFiles.length > 0) {
          finalArtworkFiles.push(...row.artworkFiles);
        } else if (row.artworkReady && row.tempArtworkFiles.length > 0) {
          const targetDir = path.join(privateRoot, `order-${orderId}`);
          if (!existsSync(targetDir)) {
            await mkdir(targetDir, { recursive: true });
          }
          for (const tempName of row.tempArtworkFiles) {
            const tempPath = path.join(tempDir, path.basename(tempName));
            const ext = path.extname(tempName) || '.jpg';
            const finalName = `${crypto.randomUUID()}${ext.toLowerCase()}`;
            const finalPath = path.join(targetDir, finalName);
            try {
              if (existsSync(tempPath)) {
                await rename(tempPath, finalPath);
                movedArtworkFiles.push(path.join('private-artwork', `order-${orderId}`, finalName));
              }
            } catch {
              // ignore individual file move failures
            }
          }
          finalArtworkFiles.push(...movedArtworkFiles);
        }

        await conn.query(
`INSERT INTO order_items (order_id, product_id, name, unit_price, quantity, line_total, customization_json, artwork_files_json, custom_size_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            row.productId,
            row.name,
            row.unitPrice,
            row.qty,
            row.lineTotal,
            row.customizationJson,
            JSON.stringify(finalArtworkFiles),
            row.customSizeNote || null,
          ]
        );
      }

      if (shippingCents > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: shippingCents,
            product_data: {
              name: 'Shipping',
            },
          },
        });
      }

      if (taxCents > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: taxCents,
            product_data: {
              name: 'Tax',
            },
          },
        });
       }

       // TEMP DEBUG LOG
       console.log('--- PRE-STRIPE CHECKOUT DEBUG ---');
       console.log('subtotalCents:', subtotalCents);
       console.log('discountCents:', discountCents);
       console.log('shippingCents:', shippingCents);
       console.log('taxCents:', taxCents);
       console.log('totalCents:', totalCents);
       console.log('hasNonQuoteItem:', hasNonQuoteItem);
       console.log('quoteShippingCents:', quoteShippingCents);
       console.log('normalizedDeliveryMethod:', normalizedDeliveryMethod);
       console.log(
         'lineItems:',
         lineItems.map((li) => ({
           name: li.price_data?.product_data?.name,
           quantity: li.quantity,
           unit_amount: li.price_data?.unit_amount,
         }))
       );
       const stripeTotalFromLineItems = lineItems.reduce(
         (sum, item) => sum + ((item.price_data?.unit_amount || 0) * (item.quantity || 1)),
         0
       );
       console.log('stripeTotalFromLineItems:', stripeTotalFromLineItems);

       const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/cancel`,
        customer_email: checkoutCustomer.email || undefined,
        client_reference_id: orderNumber,
        metadata: {
          orderId: String(orderId),
          orderNumber,
        },
       });

       // TEMP DEBUG LOG
       console.log('--- POST-STRIPE CHECKOUT DEBUG ---');
       console.log('session.amount_subtotal:', session.amount_subtotal);
       console.log('session.amount_total:', session.amount_total);
       console.log('session.id:', session.id);

       await conn.query(
        'UPDATE orders SET stripe_checkout_session_id = ? WHERE id = ?',
        [session.id, orderId]
      );

      await commit(conn);

      if (!session.url) {
        return NextResponse.json(
          { error: 'Stripe session created without URL' },
          { status: 500 }
        );
      }

      return NextResponse.json({ url: session.url, orderNumber });
    } catch (err) {
      await rollback(conn);
      throw err;
    }
  } catch (error: any) {
    const message =
      error?.issues?.[0]?.message ||
      error?.message ||
      'Failed to create checkout session';
    console.error('Stripe create-checkout-session error:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

