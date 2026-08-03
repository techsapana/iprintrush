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

    return NextResponse.json({ success: true, user });
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
