import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/app/lib/db';
import { generateOtp, hashOtp } from '@/app/lib/otp';
import { sendOtpEmail } from '@/app/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const existing = await queryOne('SELECT id FROM customer_users WHERE email = ? LIMIT 1', [email]);
    if (!existing?.id) {
      // don’t leak whether email exists
      return NextResponse.json({ success: true });
    }

    const otp = generateOtp(6);
    const otpHash = hashOtp(otp, email);

    await query('UPDATE email_otps SET used_at = CURRENT_TIMESTAMP WHERE email = ? AND purpose = ? AND used_at IS NULL', [email, 'forgot_password']);

    await query(
      'INSERT INTO email_otps (email, purpose, otp_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [email, 'forgot_password', otpHash]
    );

    await sendOtpEmail(email, otp, 'forgot_password');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Forgot password request OTP error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to send OTP' }, { status: 500 });
  }
}
