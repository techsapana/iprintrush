import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import { getStripe } from '@/app/lib/stripe';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateLinkSchema = z.object({
  orderId: z.number().int().positive(),
  amount: z.number().positive(),
  description: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = CreateLinkSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const { orderId, amount, description } = result.data;

    const stripe = getStripe();
    if (!stripe) {
       return NextResponse.json({ error: 'Stripe is not configured on this server.' }, { status: 500 });
    }

    // Amount is in dollars, convert to cents
    const amountInCents = Math.round(amount * 100);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iprintrush.com';

    // Create a Checkout Session for the one-time fee
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description,
              description: `Additional shipping & handling fee for order #${orderId}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/?payment_success=true`,
      cancel_url: `${baseUrl}/?payment_cancelled=true`,
      metadata: {
        orderId: orderId.toString(),
        type: 'oversize_shipping_fee'
      }
    });

    if (!session.url) {
       return NextResponse.json({ error: 'Failed to generate Stripe link' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating Stripe link:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
