import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/app/lib/stripe';
import { query } from '@/app/lib/db';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';
import { rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const customer = getCustomerFromRequest(req);

    const body = await req.json();
    const {
      items,
      shippingMethod,
      shippingAmount,
      taxAmount,
      discountAmount,
      finalTotal,
      formData,
      couponCode,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!finalTotal || finalTotal <= 0) {
      return NextResponse.json({ error: 'Invalid total amount' }, { status: 400 });
    }

    if (!formData?.email) {
      return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create a Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalTotal * 100), // cents
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        orderNumber,
        customerEmail: formData.email,
        isCustomStripeElements: 'true',
      },
    });

    // Build shipping address object
    const shippingAddress = {
      address: formData.shippingAddress || '',
      apt: formData.shippingApt || '',
      city: formData.shippingCity || '',
      state: formData.shippingState || '',
      zip: formData.shippingZip || '',
    };
    
    // Build billing address object
    const billingAddress = {
      address: formData.billingAddress || '',
      apt: formData.billingApt || '',
      city: formData.billingCity || '',
      state: formData.billingState || '',
      zip: formData.billingZip || '',
    };

    const customerName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
    const safeDiscount = Number(discountAmount) || 0;
    const safeShipping = Number(shippingAmount) || 0;
    const safeTax = Number(taxAmount) || 0;
    const safeTotal = Number(finalTotal) || 0;
    const safeSubtotal = Math.max(0, safeTotal - safeTax - safeShipping + safeDiscount);

    // ── INSERT pending order ──────────────────────────────────────────────────
    // Columns: 20  |  Values: 20  (must match exactly)
    const insertResult = await query(
      `INSERT INTO orders (
        order_number,
        status,
        currency,
        amount_subtotal,
        amount_tax,
        shipping_amount,
        amount_total,
        discount_amount,
        coupon_code,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address_json,
        billing_address_json,
        order_notes,
        delivery_method,
        shipping_service,
        stripe_payment_intent_id,
        shipping_review_required,
        payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,                                          // order_number
        'pending',                                            // status
        'usd',                                               // currency
        safeSubtotal,                                         // amount_subtotal
        safeTax,                                              // amount_tax
        safeShipping,                                         // shipping_amount
        safeTotal,                                            // amount_total
        safeDiscount,                                         // discount_amount
        couponCode || null,                                   // coupon_code
        customerName,                                         // customer_name
        formData.email,                                       // customer_email
        formData.phone || null,                               // customer_phone
        JSON.stringify(shippingAddress),                      // shipping_address_json
        JSON.stringify(billingAddress),                       // billing_address_json
        formData.notes || null,                               // order_notes
        formData.deliveryMethod || 'pickup',                  // delivery_method
        shippingMethod || null,                               // shipping_service
        paymentIntent.id,                                     // stripe_payment_intent_id
        shippingMethod === 'review_required' ? 1 : 0,         // shipping_review_required
        'stripe_card',                                        // payment_method
      ]
    ) as any;

    let orderId: number | null = null;

    if (insertResult?.insertId) {
      orderId = insertResult.insertId;

      // Update PaymentIntent metadata with the real orderId
      await stripe.paymentIntents.update(paymentIntent.id, {
        metadata: {
          orderNumber,
          orderId: orderId!.toString(),
          customerEmail: formData.email,
          isCustomStripeElements: 'true',
        },
      });

      // ── INSERT order items ─────────────────────────────────────────────────
      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        const itemTotal = Number(item.lineTotal) || Number(item.price) * qty || 0;
        const unitPrice = qty > 0 ? itemTotal / qty : 0;

        let finalArtworkFiles: string[] = [];

        // Copy already-uploaded artwork file paths
        if (Array.isArray(item.options?.artworkFiles)) {
          finalArtworkFiles.push(...item.options.artworkFiles);
        }

        // Move temp artwork files to permanent order directory
        if (
          Array.isArray(item.options?.tempArtworkFiles) &&
          item.options.tempArtworkFiles.length > 0
        ) {
          const orderDir = path.join(
            process.cwd(),
            'uploads',
            'private-artwork',
            `order-${orderId}`
          );
          if (!existsSync(orderDir)) {
            await mkdir(orderDir, { recursive: true });
          }

          for (const tempFileName of item.options.tempArtworkFiles) {
            const tempPath = path.join(
              process.cwd(),
              'uploads',
              'private-artwork-temp',
              tempFileName
            );
            if (existsSync(tempPath)) {
              const finalPath = path.join(orderDir, tempFileName);
              try {
                await rename(tempPath, finalPath);
                finalArtworkFiles.push(
                  path.join('private-artwork', `order-${orderId}`, tempFileName)
                );
              } catch (e) {
                console.error('Failed to move temp artwork:', tempFileName, e);
              }
            }
          }
        }

        await query(
          `INSERT INTO order_items (
            order_id,
            product_id,
            name,
            unit_price,
            quantity,
            line_total,
            customization_json,
            artwork_files_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.id || item.productId || null,
            item.name || 'Unknown Product',
            unitPrice,
            qty,
            itemTotal,
            JSON.stringify(item.options || {}),
            JSON.stringify(finalArtworkFiles),
          ]
        );
      }
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderNumber,
      orderId,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
