// Pools Management API - MySQL-backed
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

export async function GET() {
  try {
    const pools = await query('SELECT * FROM customization_option_pools ORDER BY display_order');
    
    // Get options for each pool
    const poolsWithOptions = await Promise.all(
      (pools as any[]).map(async (pool) => {
        const options = await query(
          'SELECT * FROM customization_pool_options WHERE pool_id = ? ORDER BY display_order',
          [pool.id]
        );
        
        const quantityTiers = pool.selection_type === 'quantity' 
          ? await query(
              'SELECT * FROM customization_quantity_tiers WHERE pool_id = ? ORDER BY min_qty',
              [pool.id]
            )
          : [];

        return {
          ...pool,
          options: options || [],
          quantityTiers: quantityTiers,
        };
      })
    );

    return NextResponse.json({ pools: poolsWithOptions });
  } catch (error: any) {
    console.error('Error fetching pools:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pools' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, name, description, selectionType, priceType, displayOrder, enabled = true } = body;

    // Generate unique pool ID
    const poolId = `pool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert new pool
    await queryOne(
      `INSERT INTO customization_option_pools (id, \`key\`, name, description, selection_type, price_type, display_order, enabled) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [poolId, key, name, description, selectionType, priceType, displayOrder, enabled ? 1 : 0]
    );

    return NextResponse.json({ 
      success: true, 
      pool: { 
        id: poolId, 
        key, 
        name, 
        description, 
        selectionType, 
        priceType, 
        displayOrder,
        enabled,
      } 
    });
  } catch (error: any) {
    console.error('Error creating pool:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create pool' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, key, name, description, selectionType, priceType, displayOrder, enabled } = body;

    // Update pool
    await queryOne(
      `UPDATE customization_option_pools 
       SET \`key\` = ?, name = ?, description = ?, selection_type = ?, price_type = ?, display_order = ?, enabled = ? 
       WHERE id = ?`,
      [key, name, description, selectionType, priceType, displayOrder, enabled !== false ? 1 : 0, id]
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
