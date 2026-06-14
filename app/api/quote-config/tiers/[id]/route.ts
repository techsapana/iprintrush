// Single Quantity Tier API
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing ID param" },
        { status: 400 }
      );
    }
    const tier = await queryOne('SELECT * FROM quantity_tiers WHERE id = ?', [
      parseInt(id),
    ]);

    if (!tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    return NextResponse.json({
      tier: {
        id: tier.id.toString(),
        minQty: tier.min_qty,
        maxQty: tier.max_qty,
        unitPrice: parseFloat(tier.unit_price),
        discountType: (tier.discount_type === 'PERCENT' || tier.discount_type === 'FIXED') ? tier.discount_type : 'NONE',
        discountValue: Number.isFinite(parseFloat(tier.discount_value)) ? parseFloat(tier.discount_value) : 0,
        enabled: Boolean(tier.enabled),
        displayOrder: tier.display_order,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tier' },
      { status: 500 }
    );
  }
}

export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> }
  ) {
   try {
     const { id } = await params;
     if (!id) {
       return NextResponse.json(
         { success: false, error: "Missing ID param" },
         { status: 400 }
       );
     }
     const body = await request.json();
     
     // Validate discount configuration
     const validation = validateTierDiscount(body.discountType, body.discountValue, body.unitPrice);
     if (!validation.valid) {
       return NextResponse.json(
         { error: validation.error || 'Invalid tier discount configuration' },
         { status: 400 }
       );
     }

     const updates: string[] = [];
     const values: any[] = [];

     if (body.minQty !== undefined) {
       updates.push('min_qty = ?');
       values.push(body.minQty);
     }
     if (body.maxQty !== undefined) {
       updates.push('max_qty = ?');
       values.push(body.maxQty !== null ? body.maxQty : null);
     }
     if (body.unitPrice !== undefined) {
       updates.push('unit_price = ?');
       values.push(body.unitPrice);
     }
     if (body.discountType !== undefined) {
       updates.push('discount_type = ?');
       values.push(validation.normalizedType);
     }
     if (body.discountValue !== undefined) {
       updates.push('discount_value = ?');
       values.push(validation.normalizedValue);
     }
     if (body.enabled !== undefined) {
       updates.push('enabled = ?');
       values.push(body.enabled ? 1 : 0);
     }
     if (body.displayOrder !== undefined) {
       updates.push('display_order = ?');
       values.push(body.displayOrder);
     }

     if (updates.length > 0) {
       updates.push('updated_at = CURRENT_TIMESTAMP');
       values.push(parseInt(id));
       await query(`UPDATE quantity_tiers SET ${updates.join(', ')} WHERE id = ?`, values);
     }

     return NextResponse.json({ success: true });
   } catch (error: any) {
     return NextResponse.json(
       { error: error.message || 'Failed to update tier' },
       { status: 500 }
     );
   }
  }

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing ID param" },
        { status: 400 }
      );
    }
    await query('DELETE FROM quantity_tiers WHERE id = ?', [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete tier' },
      { status: 500 }
    );
  }
}