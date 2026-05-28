import { NextRequest, NextResponse } from 'next/server';
import { handleFedexRatesRequest } from '@/app/lib/fedexRatesApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Legacy alias — same handler as POST /api/fedex/rates */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { status, data } = await handleFedexRatesRequest(body);
  return NextResponse.json(data, { status });
}
