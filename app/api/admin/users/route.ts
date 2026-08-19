import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin?.id) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const users = await query(`
      SELECT 
        cu.id, 
        cu.name, 
        cu.email, 
        cu.phone,
        cu.enabled, 
        cu.email_verified,
        CAST(cu.preferences AS CHAR) as preferences,
        CAST(cu.saved_items AS CHAR) as saved_items,
        cu.created_at,
        cu.updated_at,
        COUNT(o.id) as total_orders,
        SUM(o.amount_total) as total_spent
      FROM customer_users cu
      LEFT JOIN orders o ON cu.email = o.customer_email AND o.status = 'paid'
      GROUP BY cu.id
      ORDER BY cu.created_at DESC
    `);

    return NextResponse.json({ 
      success: true, 
      users: users || []
    });
  } catch (err: any) {
    console.error('Get users error:', err);
    return NextResponse.json({ 
      error: err?.message || 'Failed to get users' 
    }, { status: 500 });
  }
}
