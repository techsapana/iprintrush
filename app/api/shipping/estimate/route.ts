import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** @deprecated FedEx shipping has been removed. Use /api/shipping/methods */
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'FedEx shipping has been removed. Use /api/shipping/methods for shipping quotes.',
      rates: [],
      amount: 0
    }, 
    { status: 410 }
  );
}