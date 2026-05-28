import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { createCustomerToken, buildCustomerAuthCookie } from '@/app/lib/customerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user: any = await queryOne(
      'SELECT id, email, name, phone, created_at, password_hash, enabled FROM customer_users WHERE email = ? LIMIT 1',
      [email]
    );

    if (!user?.id || !user.enabled) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, String(user.password_hash || ''));
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createCustomerToken(user.email, user.name, Number(user.id));
    const res = NextResponse.json({
      success: true,
      user: {
        id: `customer-${user.id}`,
        email: user.email,
        name: user.name,
        phone: user.phone || '',
        createdAt: user.created_at || null,
      },
    });
    res.headers.set('Set-Cookie', buildCustomerAuthCookie(token));
    return res;
  } catch (err: any) {
    console.error('Customer login error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to login' }, { status: 500 });
  }
}
