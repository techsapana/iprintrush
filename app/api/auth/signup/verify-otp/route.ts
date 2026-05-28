import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { hashOtp } from '@/app/lib/otp';
import { createCustomerToken, buildCustomerAuthCookie } from '@/app/lib/customerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const phone = String(body.phone || '').trim();
    const otp = String(body.otp || '').trim();

    if (!name || !email || !password || !phone || !otp) {
      return NextResponse.json({ error: 'Name, email, phone, password and OTP are required' }, { status: 400 });
    }

    const existing = await queryOne('SELECT id FROM customer_users WHERE email = ? LIMIT 1', [email]);
    if (existing?.id) {
      return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 409 });
    }

    const otpHash = hashOtp(otp, email);

    const otpRow: any = await queryOne(
      `SELECT id
       FROM email_otps
       WHERE email = ? AND purpose = 'signup' AND otp_hash = ? AND used_at IS NULL AND expires_at > NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [email, otpHash]
    );

    if (!otpRow?.id) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
    }

    // Mark OTP used
    await query('UPDATE email_otps SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [otpRow.id]);

    const passwordHash = await bcrypt.hash(password, 10);

    const result: any = await query(
      'INSERT INTO customer_users (name, email, phone, password_hash, email_verified, enabled) VALUES (?, ?, ?, ?, TRUE, TRUE)',
      [name, email, phone, passwordHash]
    );

    const userId = Number(result?.insertId);
    const token = createCustomerToken(email, name, userId);

    const res = NextResponse.json({
      success: true,
      user: {
        id: `customer-${userId}`,
        email,
        name,
        phone,
      },
    });
    res.headers.set('Set-Cookie', buildCustomerAuthCookie(token));
    return res;
  } catch (err: any) {
    console.error('Signup verify OTP error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to verify OTP' }, { status: 500 });
  }
}
