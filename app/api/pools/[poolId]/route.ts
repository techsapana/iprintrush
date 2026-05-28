// Pool Management API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  try {
    const { poolId } = await params;
    const body = await req.json();
    const { key, name, description, selectionType, priceType, displayOrder } = body;

    // Update pool
    await queryOne(
      `UPDATE customization_option_pools 
       SET \`key\` = ?, name = ?, description = ?, selection_type = ?, price_type = ?, display_order = ? 
       WHERE id = ?`,
      [key, name, description, selectionType, priceType, displayOrder, poolId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating pool:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update pool' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ poolId: string }> }) {
  try {
    const { poolId } = await params;

    // Delete pool options first (foreign key constraint)
    await query('DELETE FROM customization_pool_options WHERE pool_id = ?', [poolId]);
    
    // Delete quantity tiers
    await query('DELETE FROM customization_quantity_tiers WHERE pool_id = ?', [poolId]);
    
    // Delete pool
    await queryOne('DELETE FROM customization_option_pools WHERE id = ?', [poolId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting pool:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete pool' },
      { status: 500 }
    );
  }
}
