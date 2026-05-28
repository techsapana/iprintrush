// FedEx Shipment Creation API
import { NextRequest, NextResponse } from 'next/server';
import { createFedexShipment } from '@/app/lib/fedex';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      shipper,
      recipient, 
      package: singlePackage,
      packages, 
      serviceType, 
      packageType = 'YOUR_PACKAGING',
      specialInstructions,
      referenceId,
      labelFormat,
    } = body;

    // Validate required fields
    if (!recipient || (!(Array.isArray(packages) && packages.length > 0) && !singlePackage) || !serviceType) {
      return NextResponse.json(
        { error: 'Recipient, package(s), and serviceType are required' },
        { status: 400 }
      );
    }

    // Create FedEx shipment
    const result = await createFedexShipment({
      shipper,
      recipient,
      packages: Array.isArray(packages) && packages.length > 0 ? packages : [singlePackage],
      serviceType,
      packageType,
      specialInstructions,
      referenceId,
      labelFormat,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create FedEx shipment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      trackingNumber: result.trackingNumber,
      label: result.label || '',
      labelFormat: result.labelFormat || 'PDF',
      shipment: {
        id: result.shipmentId,
        trackingNumber: result.trackingNumber,
        labelUrl: result.labelUrl,
        cost: result.cost,
        estimatedDelivery: result.estimatedDelivery,
        carrier: 'FedEx',
        serviceType,
      },
    });

  } catch (error: any) {
    console.error('FedEx shipment API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
