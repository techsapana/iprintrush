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
    if (existing?.id) {
      return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 409 });
    }

    const otp = generateOtp(6);
    const otpHash = hashOtp(otp, email);

    // Invalidate old OTPs for same purpose
    await query('UPDATE email_otps SET used_at = CURRENT_TIMESTAMP WHERE email = ? AND purpose = ? AND used_at IS NULL', [email, 'signup']);

    await query(
      'INSERT INTO email_otps (email, purpose, otp_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [email, 'signup', otpHash]
    );

    await sendOtpEmail(email, otp, 'signup');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Signup request OTP error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to send OTP' }, { status: 500 });
  }
}
