// FedEx Package Tracking API
import { NextRequest, NextResponse } from 'next/server';
import { trackFedexPackage } from '@/app/lib/fedex';

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  try {
    const { trackingNumber } = params;

    if (!trackingNumber) {
      return NextResponse.json(
        { error: 'Tracking number is required' },
        { status: 400 }
      );
    }

    // Track FedEx package
    const result = await trackFedexPackage(trackingNumber);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to track FedEx package' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tracking: {
        trackingNumber: result.trackingNumber,
        status: result.status,
        estimatedDelivery: result.estimatedDelivery,
        events: result.events,
        carrier: 'FedEx',
      }
    });

  } catch (error: any) {
    console.error('FedEx tracking API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
