import { NextRequest, NextResponse } from 'next/server';
import { buildCustomerLogoutCookie } from '@/app/lib/customerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.headers.set('Set-Cookie', buildCustomerLogoutCookie());
  return res;
}
