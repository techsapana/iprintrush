import crypto from 'crypto';

export function generateOtp(length: number = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(crypto.randomInt(min, max + 1));
}

export function hashOtp(otp: string, email: string) {
  const pepper = process.env.OTP_PEPPER || 'dev-otp-pepper-change-me';
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return crypto
    .createHash('sha256')
    .update(`${normalizedEmail}:${otp}:${pepper}`)
    .digest('hex');
}
