import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const CUSTOMER_TOKEN_COOKIE = 'iprintrush_customer_token';
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

type CustomerTokenPayload = {
  sub: string;
  email: string;
  name: string;
  exp: number; // unix timestamp in seconds
};

function getSecret() {
  const secret = process.env.CUSTOMER_JWT_SECRET;
  if (!secret) {
    return 'dev-customer-secret-change-me';
  }
  return secret;
}

function sign(payload: CustomerTokenPayload): string {
  const secret = getSecret();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verify(token: string): CustomerTokenPayload | null {
  try {
    const secret = getSecret();
    const [headerB64, bodyB64, sig] = token.split('.');
    if (!headerB64 || !bodyB64 || !sig) return null;
    const data = `${headerB64}.${bodyB64}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8')) as CustomerTokenPayload;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function createCustomerToken(email: string, name: string, userId: number, ttlSeconds: number = DEFAULT_TOKEN_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const payload: CustomerTokenPayload = {
    sub: `customer-${userId}`,
    email,
    name,
    exp: now + ttlSeconds,
  };
  return sign(payload);
}

export function verifyCustomerToken(token: string | null | undefined): CustomerTokenPayload | null {
  if (!token) return null;
  return verify(token);
}

export function getCustomerFromCookies() {
  const store = cookies();
  const token = store.get(CUSTOMER_TOKEN_COOKIE)?.value;
  const payload = verifyCustomerToken(token);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
  };
}

export function getCustomerFromRequest(req: NextRequest) {
  const cookie = req.cookies.get(CUSTOMER_TOKEN_COOKIE)?.value;
  const payload = verifyCustomerToken(cookie);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
  };
}

export function buildCustomerAuthCookie(token: string, ttlSeconds: number = DEFAULT_TOKEN_TTL_SECONDS) {
  const secure = process.env.NODE_ENV === 'production';
  return `${CUSTOMER_TOKEN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttlSeconds};${secure ? ' Secure;' : ''}`;
}

export function buildCustomerLogoutCookie() {
  const secure = process.env.NODE_ENV === 'production';
  return `${CUSTOMER_TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;${secure ? ' Secure;' : ''}`;
}
