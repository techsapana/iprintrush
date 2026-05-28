import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { beginTransaction, commit, rollback, query, queryOne } from '@/app/lib/db';
import { getStripe } from '@/app/lib/stripe';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';
import { mkdir, rename } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { resolveSelectedShippingRate } from '@/app/lib/fedexCheckout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateCheckoutSessionSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        quantity: z.number().int().min(1).max(999),
        quotePayload: z.any().optional(),
        quoteSummary: z.any().optional(),
        customizationsDisplay: z.record(z.string()).optional(),
        splitQuote: z.boolean().optional(),
        customLineTotal: z.number().nonnegative().optional(),
        customUnitPrice: z.number().nonnegative().optional(),
        artworkReady: z.boolean().optional(),
        tempArtworkFiles: z.array(z.string()).optional(),
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
      notes: z.string().optional().default(''),
      deliveryMethod: z.enum(['pickup', 'shipping']).optional().default('pickup'),
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
    const checkoutCustomer = payload.customer || {};

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

    const conn = await beginTransaction();
    try {
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
      }[] = [];
      let subtotalCents = 0;
      let shippingCents = 0;
      let shippingMeta: any = null;

      for (const item of payload.items) {
        const p = productMap.get(item.id);
        if (!p || item.quantity <= 0) continue;

        let itemTotal = 0;
        let resolvedUnitPrice = 0;
        let customizationJson: string | null = null;

        if (item.quotePayload && item.quoteSummary) {
          const calcRes = await fetch(`${baseUrl}/api/quote/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.quotePayload),
          });
          if (!calcRes.ok) {
            await rollback(conn);
            const errData = await calcRes.json().catch(() => ({}));
            return NextResponse.json({ error: errData?.error || 'Quote validation failed' }, { status: 400 });
          }
          const serverSummary = await calcRes.json();
          if (serverSummary.productId !== item.id) {
            await rollback(conn);
            return NextResponse.json({ error: 'Quote product mismatch' }, { status: 400 });
          }
          itemTotal = Number(serverSummary.grandTotal || 0);
          customizationJson = JSON.stringify({
            lineItems: serverSummary.lineItems || [],
            customizationsDisplay: item.customizationsDisplay || {},
            mode: item.quotePayload.mode || 'apparel',
            quotePayload: item.quotePayload || null,
            quoteSummary: serverSummary || null,
          });
          resolvedUnitPrice = item.quantity > 0 ? itemTotal / item.quantity : 0;
        } else if (
          item.splitQuote === true &&
          Number.isFinite(Number(item.customLineTotal)) &&
          Number.isFinite(Number(item.customUnitPrice))
        ) {
          itemTotal = Number(item.customLineTotal || 0);
          resolvedUnitPrice = Number(item.customUnitPrice || 0);
          customizationJson = JSON.stringify({
            lineItems: item.quoteSummary?.lineItems || [],
            customizationsDisplay: item.customizationsDisplay || {},
            mode: 'split_quote',
            quotePayload: null,
            quoteSummary: item.quoteSummary || null,
          });
        } else {
          const unitPrice = Number(p.price || 0);
          itemTotal = unitPrice * item.quantity;
          resolvedUnitPrice = unitPrice;
        }

        const amountCents = toCents(itemTotal);
        subtotalCents += amountCents;

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
            unit_amount: amountCents,
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
          unitPrice: resolvedUnitPrice,
          lineTotal: itemTotal,
          customizationJson,
          artworkReady: item.artworkReady === true,
          tempArtworkFiles: Array.isArray(item.tempArtworkFiles)
            ? item.tempArtworkFiles.filter((x) => typeof x === 'string' && x.trim().length > 0)
            : [],
        });
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
      let selectedRateMeta: {
        serviceType: string;
        serviceName: string;
        cost: number;
        estimatedDeliveryDate: string | null;
        estimatedDeliveryLabel: string | null;
      } | null = null;

      if (checkoutCustomer.deliveryMethod === 'shipping') {
        const cartItemsForRates = payload.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          quotePayload: item.quotePayload || null,
        }));
        const shippingAddress = {
          address: checkoutCustomer.shippingAddress,
          city: checkoutCustomer.shippingCity,
          state: checkoutCustomer.shippingState,
          zip: checkoutCustomer.shippingZip,
        };

        const selected = checkoutCustomer.selectedShipping;
        if (selected?.serviceType && !checkoutCustomer.shippingRatesUnavailable) {
          const resolved = await resolveSelectedShippingRate(
            cartItemsForRates,
            shippingAddress,
            selected,
          );
          if (!resolved.ok) {
            await rollback(conn);
            return NextResponse.json({ error: resolved.error }, { status: 400 });
          }
          selectedRateMeta = {
            serviceType: resolved.rate.serviceType,
            serviceName: resolved.rate.serviceName,
            cost: resolved.rate.cost,
            estimatedDeliveryDate: resolved.rate.estimatedDeliveryDate,
            estimatedDeliveryLabel: resolved.rate.estimatedDeliveryLabel,
          };
          shippingCents = toCents(resolved.rate.cost);
          shippingMeta = {
            carrier: 'FedEx',
            serviceType: resolved.rate.serviceType,
            serviceName: resolved.rate.serviceName,
            estimatedDeliveryDate: resolved.rate.estimatedDeliveryDate,
            estimatedDeliveryLabel: resolved.rate.estimatedDeliveryLabel,
            packages: resolved.packages,
            destination: {
              addressLines: [checkoutCustomer.shippingAddress || 'Address Line'],
              city: checkoutCustomer.shippingCity || 'City',
              stateOrProvinceCode: checkoutCustomer.shippingState || 'CA',
              postalCode: checkoutCustomer.shippingZip || '',
              countryCode: 'US',
            },
            selectedByCustomer: true,
          };
        } else if (checkoutCustomer.shippingRatesUnavailable) {
          shippingCents = 0;
          shippingMeta = {
            carrier: 'FedEx',
            pendingReview: true,
            message:
              'Shipping estimate unavailable. We will confirm shipping after order review.',
          };
        } else {
          await rollback(conn);
          return NextResponse.json(
            { error: 'Please select a FedEx shipping option before checkout.' },
            { status: 400 },
          );
        }
      }

      const taxCents = Math.round((taxableBaseCents + shippingCents) * taxRate);
      const totalCents = taxableBaseCents + shippingCents + taxCents;

      const orderNumber = makeOrderNumber();
      if (
        checkoutCustomer.deliveryMethod === 'shipping' &&
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
        city: checkoutCustomer.city || '',
        state: checkoutCustomer.state || '',
        zip: checkoutCustomer.zip || '',
      };
      const shippingAddress =
        checkoutCustomer.deliveryMethod === 'shipping'
          ? {
              address: checkoutCustomer.shippingAddress || '',
              apt: checkoutCustomer.shippingApt || '',
              city: checkoutCustomer.shippingCity || '',
              state: checkoutCustomer.shippingState || '',
              zip: checkoutCustomer.shippingZip || '',
            }
          : null;

      if (checkoutCustomer.deliveryMethod === 'shipping' && shippingCents > 0) {
        const shipLabel = selectedRateMeta?.serviceName
          ? `Shipping (${selectedRateMeta.serviceName})`
          : 'Shipping (FedEx)';
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: shippingCents,
            product_data: { name: shipLabel },
          },
        });
      }

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
        shippingAddress ? JSON.stringify(shippingAddress) : null,
        checkoutCustomer.notes || null,
        checkoutCustomer.deliveryMethod || 'pickup',
        shippingMeta?.carrier || null,
        shippingMeta?.serviceType || selectedRateMeta?.serviceType || null,
        shippingMeta ? JSON.stringify(shippingMeta) : null,
      ];

      const hasServiceNameCol = await queryOne(`SHOW COLUMNS FROM orders LIKE 'shipping_service_name'`);
      const hasDeliveryCol = await queryOne(`SHOW COLUMNS FROM orders LIKE 'estimated_delivery_date'`);
      if (hasServiceNameCol) {
        orderColumns.push('shipping_service_name');
        orderValues.push(selectedRateMeta?.serviceName || shippingMeta?.serviceName || null);
      }
      if (hasDeliveryCol) {
        orderColumns.push('estimated_delivery_date');
        orderValues.push(
          selectedRateMeta?.estimatedDeliveryDate ||
            selectedRateMeta?.estimatedDeliveryLabel ||
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
        if (row.artworkReady && row.tempArtworkFiles.length > 0) {
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
        }

        await conn.query(
`INSERT INTO order_items (order_id, product_id, name, unit_price, quantity, line_total, customization_json, artwork_files_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            row.productId,
            row.name,
            row.unitPrice,
            row.qty,
            row.lineTotal,
            row.customizationJson,
            movedArtworkFiles.length ? JSON.stringify(movedArtworkFiles) : JSON.stringify([]),
          ]
        );
      }

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

