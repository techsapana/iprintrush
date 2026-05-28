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
    const email = String(body.email || '').trim().toLowerCase();
    const otp = String(body.otp || '').trim();
    const newPassword = String(body.newPassword || '');

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, OTP and new password are required' }, { status: 400 });
    }

    const user: any = await queryOne('SELECT id, name, email FROM customer_users WHERE email = ? AND enabled = TRUE LIMIT 1', [email]);
    if (!user?.id) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });
    }

    const otpHash = hashOtp(otp, email);
    const otpRow: any = await queryOne(
      `SELECT id
       FROM email_otps
       WHERE email = ? AND purpose = 'forgot_password' AND otp_hash = ? AND used_at IS NULL AND expires_at > NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [email, otpHash]
    );

    if (!otpRow?.id) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
    }

    await query('UPDATE email_otps SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [otpRow.id]);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE customer_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [passwordHash, user.id]);

    const token = createCustomerToken(user.email, user.name, Number(user.id));
    const res = NextResponse.json({
      success: true,
      user: {
        id: `customer-${user.id}`,
        email: user.email,
        name: user.name,
      },
    });
    res.headers.set('Set-Cookie', buildCustomerAuthCookie(token));
    return res;
  } catch (err: any) {
    console.error('Forgot password verify OTP error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to reset password' }, { status: 500 });
  }
}
