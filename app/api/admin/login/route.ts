import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken, setAdminCookie } from '@/app/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    const configuredEmail = (process.env.ADMIN_EMAIL_I || 'admin@iprintrush.com').toLowerCase();
    const configuredPassword = process.env.ADMIN_PASSWORD_I || 'admin123';
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    if (email !== configuredEmail || password !== configuredPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 },
      );
    }

    // Long-lived session until explicit logout (override with ADMIN_SESSION_TTL_SECONDS)
    const ttlSeconds = Number(process.env.ADMIN_SESSION_TTL_SECONDS) || 60 * 60 * 24 * 180;
    const token = createAdminToken(email, ttlSeconds);
    const res = NextResponse.json({
      success: true,
      admin: {
        id: `admin-${email}`,
        email,
        role: 'admin' as const,
      },
      expiresIn: ttlSeconds,
    });
    setAdminCookie(res, token, ttlSeconds);
    return res;
  } catch (err: any) {
    console.error('Admin login error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to login' },
      { status: 500 },
    );
  }
}

