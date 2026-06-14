// Quantity Tiers API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

// Validation helper for tier discount configuration
function validateTierDiscount(discountType: string | undefined, discountValue: unknown, unitPrice: number | undefined): { valid: boolean; error?: string; normalizedType?: 'NONE' | 'PERCENT' | 'FIXED'; normalizedValue?: number } {
  const hasUnitPrice = unitPrice != null && Number(unitPrice) > 0;

  // If no unit price, only NONE is allowed
  if (!hasUnitPrice && discountType !== 'NONE' && discountType !== undefined) {
    return { valid: false, error: 'Discount not allowed when unitPrice is 0 or missing' };
  }

  const normalizedType: 'NONE' | 'PERCENT' | 'FIXED' = (discountType === 'PERCENT' || discountType === 'FIXED') ? discountType : 'NONE';
  const value = Number(discountValue);

  // Validate discountValue is numeric and non-negative
  if (discountType !== undefined && (!Number.isFinite(value) || value < 0)) {
    return { valid: false, error: 'Discount value must be a valid non-negative number' };
  }

  // PERCENT discount must not exceed 100%
  if (normalizedType === 'PERCENT' && value > 100) {
    return { valid: false, error: 'Percentage discount cannot exceed 100%' };
  }

  // FIXED discount sanity cap
  if (normalizedType === 'FIXED' && value > 100000) {
    return { valid: false, error: 'Fixed discount too large (max $100,000)' };
  }

  return { valid: true, normalizedType, normalizedValue: value };
}

export async function GET() {
   try {
     const tiers = await query(
       'SELECT * FROM quantity_tiers ORDER BY display_order, min_qty'
     );
     return NextResponse.json({
       tiers: tiers.map((t: any) => ({
         id: t.id.toString(),
         minQty: t.min_qty,
         maxQty: t.max_qty,
         unitPrice: parseFloat(t.unit_price),
         discountType: (t.discount_type === 'PERCENT' || t.discount_type === 'FIXED') ? t.discount_type : 'NONE',
         discountValue: Number.isFinite(parseFloat(t.discount_value)) ? parseFloat(t.discount_value) : 0,
         enabled: Boolean(t.enabled),
         displayOrder: t.display_order,
       })),
     });
   } catch (error: any) {
     return NextResponse.json(
       { error: error.message || 'Failed to fetch tiers' },
       { status: 500 }
     );
   }
 }

export async function POST(request: NextRequest) {
   try {
     const body = await request.json();
     const { minQty, maxQty, unitPrice, discountType, discountValue = 0, enabled = true, displayOrder = 0 } = body;

     // Validate discount configuration
     const validation = validateTierDiscount(discountType, discountValue, unitPrice);
     if (!validation.valid) {
       return NextResponse.json(
         { error: validation.error || 'Invalid tier discount configuration' },
         { status: 400 }
       );
     }

     const result = await query(
       `INSERT INTO quantity_tiers (min_qty, max_qty, unit_price, discount_type, discount_value, enabled, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
       [
         minQty,
         maxQty || null,
         unitPrice,
         validation.normalizedType,
         validation.normalizedValue,
         enabled ? 1 : 0,
         displayOrder,
       ],
     );

     return NextResponse.json({ success: true, id: (result as any).insertId });
   } catch (error: any) {
     return NextResponse.json(
       { error: error.message || 'Failed to save tier' },
       { status: 500 }
     );
   }
  }
