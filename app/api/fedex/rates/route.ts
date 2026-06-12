import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** FedEx rates endpoint — DISABLED - shipping is now handled by /api/shipping/methods */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'FedEx integration has been removed. Use /api/shipping/methods for shipping costs.', 
      rates: [], 
      amount: 0 
    }, 
    { status: 410 }
  );
}