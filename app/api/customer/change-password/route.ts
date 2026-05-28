import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const customer = getCustomerFromRequest(req);
    if (!customer?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Extract numeric ID from "customer-{id}" format
    const match = customer.id.match(/customer-(\d+)/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 401 });
    }
    const userId = parseInt(match[1], 10);

    const body = await req.json().catch(() => ({}));
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 });
    }

    // Get current user data
    const user: any = await queryOne(
      'SELECT id, password_hash FROM customer_users WHERE id = ? AND enabled = TRUE LIMIT 1',
      [userId]
    );

    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, String(user.password_hash || ''));
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE customer_users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, userId]
    );

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to change password' }, { status: 500 });
  }
}
