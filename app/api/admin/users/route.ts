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
        id, 
        name, 
        email, 
        phone,
        enabled, 
        email_verified,
        preferences,
        saved_items,
        created_at,
        updated_at
      FROM customer_users 
      ORDER BY created_at DESC
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
