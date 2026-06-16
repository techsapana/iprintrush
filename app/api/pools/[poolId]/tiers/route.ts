// Pool Quantity Tiers Management API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  try {
    const { poolId } = await params;
    
    const tiers = await query(
      'SELECT * FROM customization_quantity_tiers WHERE pool_id = ? AND enabled = TRUE ORDER BY min_qty',
      [poolId]
    );

    return NextResponse.json({ tiers });
  } catch (error: any) {
    console.error('Error fetching quantity tiers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quantity tiers' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  try {
    const { poolId } = await params;
    const body = await req.json();
    const { label, minQty, maxQty, unitPrice, discountType, discountValue = 0, displayOrder, enabled } = body;
    const finalDiscountType = discountType === 'PERCENT' || discountType === 'FIXED' ? discountType : 'NONE';
    const finalDiscountValue = Number.isFinite(Number(discountValue)) ? Number(discountValue) : 0;

    const result: any = await query(
      `INSERT INTO customization_quantity_tiers (pool_id, label, min_qty, max_qty, unit_price, discount_type, discount_value, display_order, enabled) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        poolId,
        label,
        minQty,
        maxQty,
        unitPrice,
        finalDiscountType,
        finalDiscountValue,
        displayOrder || 0,
        enabled !== false,
      ],
    );

    return NextResponse.json({ 
      success: true, 
      tier: { 
        id: result?.insertId ?? null,
        pool_id: poolId,
        label, 
        minQty, 
        maxQty, 
        unitPrice, 
        discountType: finalDiscountType,
        discountValue: finalDiscountValue,
        displayOrder: displayOrder || 0, 
        enabled 
      } 
    });
  } catch (error: any) {
    console.error('Error creating quantity tier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create quantity tier' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  try {
    const { poolId } = await params;
    const body = await req.json();
    const { tierId, label, minQty, maxQty, unitPrice, discountType, discountValue, displayOrder, enabled } =
      body;
    const finalDiscountType = discountType === 'PERCENT' || discountType === 'FIXED' ? discountType : 'NONE';
    const finalDiscountValue = Number.isFinite(Number(discountValue)) ? Number(discountValue) : 0;

    await query(
      `UPDATE customization_quantity_tiers 
       SET label = ?, min_qty = ?, max_qty = ?, unit_price = ?, discount_type = ?, discount_value = ?, display_order = ?, enabled = ? 
       WHERE id = ? AND pool_id = ?`,
      [
        label,
        minQty,
        maxQty,
        unitPrice,
        finalDiscountType,
        finalDiscountValue,
        displayOrder || 0,
        enabled !== false,
        tierId,
        poolId,
      ],
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating quantity tier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update quantity tier' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  try {
    const { poolId } = await params;
    const body = await req.json();
    const { tierId } = body;

    // Delete tier
    await query(
      'DELETE FROM customization_quantity_tiers WHERE id = ? AND pool_id = ?',
      [tierId, poolId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting quantity tier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete quantity tier' },
      { status: 500 }
    );
  }
}