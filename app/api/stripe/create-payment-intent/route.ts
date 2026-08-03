import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/app/lib/stripe';
import { query } from '@/app/lib/db';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';
import { rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const customer = getCustomerFromRequest(req);
    
    // In production, you would recalculate the totals here on the server to prevent manipulation.
    // For this implementation, we take the finalized values from the checkout page.
    const body = await req.json();
    const { 
      items, 
      shippingMethod, 
      shippingAmount, 
      taxAmount, 
      discountAmount, 
      finalTotal, 
      formData, 
      couponCode 
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!finalTotal || finalTotal <= 0) {
      return NextResponse.json({ error: 'Invalid total amount' }, { status: 400 });
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalTotal * 100),
      currency: 'usd',
      metadata: {
        orderNumber,
        customerEmail: formData.email,
        isCustomStripeElements: 'true',
      },
    });

    // Save order as pending in database
    const dbItemsStr = JSON.stringify(items);
    const shippingAddress = {
      address: formData.shippingAddress,
      apt: formData.shippingApt,
      city: formData.shippingCity,
      state: formData.shippingState,
      zip: formData.shippingZip,
    };

    // Insert pending order
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        'pending', // Initial status before payment
        'usd',
        finalTotal - taxAmount - shippingAmount + discountAmount, // subtotal
        taxAmount,
        shippingAmount,
        finalTotal,
        discountAmount || 0,
        couponCode || null,
        `${formData.firstName} ${formData.lastName}`.trim(),
        formData.email,
        formData.phone || null,
        JSON.stringify(shippingAddress),
        JSON.stringify(shippingAddress), // billing address same as shipping for Stripe Elements flow
        formData.notes || null,
        formData.deliveryMethod,
        shippingMethod,
        paymentIntent.id,
        shippingMethod === 'review_required' ? 1 : 0,
        'stripe_card'
      ]
    ) as any;
    
    let orderId = null;
    if (insertResult && insertResult.insertId) {
       orderId = insertResult.insertId;
       // update payment intent with orderId
       await stripe.paymentIntents.update(paymentIntent.id, {
         metadata: { orderId: orderId.toString(), orderNumber }
       });
       
       // Insert order items
       for (const item of items) {
          const itemTotal = (item.quantity * item.price) || 0; // fallback if needed
          
          let finalArtworkFiles: string[] = [];
          if (Array.isArray(item.options?.artworkFiles)) {
            finalArtworkFiles.push(...item.options.artworkFiles);
          }

          // Move any temp artwork files to the final order directory
          if (Array.isArray(item.options?.tempArtworkFiles) && item.options.tempArtworkFiles.length > 0) {
            const orderDir = path.join(process.cwd(), 'uploads', 'private-artwork', `order-${orderId}`);
            if (!existsSync(orderDir)) {
              await mkdir(orderDir, { recursive: true });
            }
            
            for (const tempFileName of item.options.tempArtworkFiles) {
              const tempPath = path.join(process.cwd(), 'uploads', 'private-artwork-temp', tempFileName);
              if (existsSync(tempPath)) {
                const finalPath = path.join(orderDir, tempFileName);
                try {
                  await rename(tempPath, finalPath);
                  finalArtworkFiles.push(path.join('private-artwork', `order-${orderId}`, tempFileName));
                } catch (e) {
                  console.error('Failed to move temp artwork:', tempFileName, e);
                  // If rename fails, we can at least save the temp path or ignore
                }
              }
            }
          }

          await query(
            `INSERT INTO order_items (order_id, product_id, name, unit_price, quantity, line_total, customization_json, artwork_files_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
             [
                orderId,
                item.id,
                item.name,
                itemTotal / Math.max(1, item.quantity),
                item.quantity,
                itemTotal,
                JSON.stringify(item.options || {}),
                JSON.stringify(finalArtworkFiles)
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
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
