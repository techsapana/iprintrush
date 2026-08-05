import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await queryOne(
      `SELECT id, name, email, phone, enabled, created_at, preferences, saved_items 
       FROM customer_users 
       WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch order statistics for this user
    const orderStats = await queryOne(
      `SELECT 
         COUNT(id) as total_orders, 
         SUM(amount_total) as total_spent 
       FROM orders 
       WHERE customer_email = ? AND status = 'paid'`,
      [user.email]
    );

    // Fetch most purchased products for this user
    const { query } = await import('@/app/lib/db');
    const topProducts = await query(
      `SELECT 
         oi.product_id, 
         oi.name as product_name, 
         SUM(oi.quantity) as total_quantity_bought
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.customer_email = ? AND o.status = 'paid'
       GROUP BY oi.product_id, oi.name
       ORDER BY total_quantity_bought DESC
       LIMIT 5`,
      [user.email]
    );

    return NextResponse.json({ 
      success: true, 
      user, 
      orderStats: {
        totalOrders: orderStats?.total_orders || 0,
        totalSpent: orderStats?.total_spent || 0
      },
      topProducts: topProducts || []
    });
  } catch (error: any) {
    console.error('Error fetching admin user detail:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, phone, enabled } = body;

    // Validate
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Check for email uniqueness (excluding current user)
    const existing = await queryOne(
      'SELECT id FROM customer_users WHERE email = ? AND id != ?',
      [email, userId]
    );
    if (existing) {
      return NextResponse.json({ error: 'Email is already in use by another account' }, { status: 409 });
    }

    await execute(
      `UPDATE customer_users 
       SET name = ?, email = ?, phone = ?, enabled = ? 
       WHERE id = ?`,
      [
        name || '', 
        email, 
        phone || null, 
        enabled === true || enabled === 1 ? 1 : 0, 
        userId
      ]
    );

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
