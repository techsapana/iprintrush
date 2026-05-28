import { NextRequest, NextResponse } from 'next/server';
import { handleFedexRatesRequest } from '@/app/lib/fedexRatesApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** @deprecated Use POST /api/fedex/rates — kept for backward compatibility */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { status, data } = await handleFedexRatesRequest(body);
  return NextResponse.json(data, { status });
}
