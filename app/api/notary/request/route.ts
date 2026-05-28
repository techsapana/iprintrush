import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query, queryOne } from '@/app/lib/db';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';

const NotaryRequestSchema = z.object({
  customerName: z.string().trim().optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().trim().optional(),
  signatureCount: z.number().int().min(1).max(1000),
  documentTypeIds: z.array(z.string().min(1)).min(1),
  notes: z.string().trim().optional(),
});

function makeNotaryRequestNumber() {
  return `NOTARY-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = NotaryRequestSchema.parse({
      ...body,
      signatureCount: Number(body.signatureCount),
    });

    // Get authenticated user if available
    const customer = getCustomerFromRequest(req);
    let userId = null;
    let requestingUserEmail = null;
    
    if (customer && customer.id) {
      // Extract numeric ID from "customer-{id}" format
      const match = customer.id.match(/customer-(\d+)/);
      if (match) {
        userId = parseInt(match[1], 10);
      }
      // Use authenticated user's email as the requesting email
      requestingUserEmail = customer.email;
    }

    const config = await queryOne(
      'SELECT price_per_signature FROM notary_pricing_config ORDER BY id ASC LIMIT 1',
    );
    if (!config) {
      return NextResponse.json(
        { error: 'Notary pricing is not configured.' },
        { status: 500 },
      );
    }

    const pricePerSignature = Number(config.price_per_signature || 0);
    if (!Number.isFinite(pricePerSignature) || pricePerSignature <= 0) {
      return NextResponse.json(
        { error: 'Invalid notary price per signature configuration.' },
        { status: 500 },
      );
    }

    const rules = await query(
      'SELECT min_signatures, max_signatures, discount_percent FROM notary_discount_rules ORDER BY min_signatures ASC',
    );

    let discountPercent = 0;
    if (Array.isArray(rules) && rules.length > 0) {
      for (const r of rules as any[]) {
        const min = Number(r.min_signatures);
        const max = r.max_signatures != null ? Number(r.max_signatures) : null;
        const withinMin = payload.signatureCount >= min;
        const withinMax = max == null || payload.signatureCount <= max;
        if (withinMin && withinMax) {
          discountPercent = Number(r.discount_percent || 0);
          break;
        }
      }
    } else {
      // Fallback tiers if DB is empty
      if (payload.signatureCount >= 21) discountPercent = 25;
      else if (payload.signatureCount >= 11) discountPercent = 15;
      else if (payload.signatureCount >= 6) discountPercent = 10;
      else discountPercent = 0;
    }

    // Cap discount at 25%
    discountPercent = Math.min(discountPercent, 25);
    if (discountPercent < 0) discountPercent = 0;

    const baseAmount = pricePerSignature * payload.signatureCount;
    const discountAmount = (baseAmount * discountPercent) / 100;
    const totalAmount = baseAmount - discountAmount;

    const requestNumber = makeNotaryRequestNumber();

    const insertResult = await query(
      `INSERT INTO notary_requests
       (request_number, customer_name, customer_email, customer_phone, signature_count, base_amount, discount_percent, discount_amount, total_amount, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        requestNumber,
        payload.customerName || null,
        payload.customerEmail || null,
        payload.customerPhone || null,
        payload.signatureCount,
        baseAmount,
        discountPercent,
        discountAmount,
        totalAmount,
        payload.notes || null,
      ],
    );

    const requestId = (insertResult as any).insertId;

    if (requestId && payload.documentTypeIds?.length) {
      const values = payload.documentTypeIds.map((id) => [requestId, id]);
      await query(
        'INSERT INTO notary_request_documents (request_id, document_type_id) VALUES ?',
        [values],
      );
    }

    return NextResponse.json({
      requestNumber,
      summary: {
        signatureCount: payload.signatureCount,
        pricePerSignature,
        baseAmount,
        discountPercent,
        discountAmount,
        totalAmount,
      },
    });
  } catch (error: any) {
    console.error('Error creating notary request:', error);
    const message =
      error?.issues?.[0]?.message ||
      error?.message ||
      'Failed to submit notary request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

