import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const ADMIN_TOKEN_COOKIE = 'iprintrush_admin_token';
/** Default 180 days; align cookie max-age with login route unless overridden. */
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 180;

type AdminTokenPayload = {
  sub: string;
  email: string;
  role: 'admin';
  exp: number; // unix timestamp in seconds
};

function getSecret() {
  const secret = process.env.ADMIN_JWT_SECRET || process.env.ADMIN_SECRET_KEY;
  if (!secret) {
    // In production, this should fail hard. In development, provide a fallback.
    if (process.env.NODE_ENV === 'production') {
      console.error('ADMIN_JWT_SECRET is not set in environment variables');
      throw new Error('ADMIN_JWT_SECRET environment variable is required in production');
    }
    console.warn('ADMIN_JWT_SECRET not set, using development fallback');
    return 'dev-admin-secret-change-me';
  }
  return secret;
}

function sign(payload: AdminTokenPayload): string {
  const secret = getSecret();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verify(token: string): AdminTokenPayload | null {
  try {
    const secret = getSecret();
    const [headerB64, bodyB64, sig] = token.split('.');
    if (!headerB64 || !bodyB64 || !sig) return null;
    const data = `${headerB64}.${bodyB64}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8')) as AdminTokenPayload;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function createAdminToken(email: string, ttlSeconds: number = DEFAULT_TOKEN_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminTokenPayload = {
    sub: `admin-${email}`,
    email,
    role: 'admin',
    exp: now + ttlSeconds,
  };
  return sign(payload);
}

export function verifyAdminToken(token: string | null | undefined): AdminTokenPayload | null {
  if (!token) return null;
  return verify(token);
}

export async function getAdminFromCookies() {
  const store = await cookies();
  const token = store.get(ADMIN_TOKEN_COOKIE)?.value;
  const payload = verifyAdminToken(token);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}

export function getAdminFromRequest(req: NextRequest) {
  const cookie = req.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  const payload = verifyAdminToken(cookie);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}

export function buildAdminAuthCookie(token: string, ttlSeconds: number = DEFAULT_TOKEN_TTL_SECONDS) {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = secure ? 'Strict' : 'Lax'; // Use Strict in production for better security
  return `${ADMIN_TOKEN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${ttlSeconds};${secure ? ' Secure;' : ''}`;
}

export function buildAdminLogoutCookie() {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = secure ? 'Strict' : 'Lax'; // Use Strict in production for better security
  return `${ADMIN_TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0;${secure ? ' Secure;' : ''}`;
}

export function setAdminCookie(res: NextResponse, token: string, ttlSeconds: number = DEFAULT_TOKEN_TTL_SECONDS) {
  const cookie = buildAdminAuthCookie(token, ttlSeconds);
  res.headers.set('Set-Cookie', cookie);
}

export function clearAdminCookie(res: NextResponse) {
  const cookie = buildAdminLogoutCookie();
  res.headers.set('Set-Cookie', cookie);
}

