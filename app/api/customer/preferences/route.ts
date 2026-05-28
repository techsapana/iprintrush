import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/app/lib/db';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const customer = getCustomerFromRequest(req);
    if (!customer?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Extract numeric ID from "customer-{id}" format
    const match = customer.id.match(/customer-(\d+)/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 401 });
    }
    const userId = parseInt(match[1], 10);

    const user: any = await queryOne(
      'SELECT id, preferences FROM customer_users WHERE id = ? AND enabled = TRUE LIMIT 1',
      [userId]
    );

    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse preferences or return default
    let preferences = {};
    if (user.preferences) {
      try {
        preferences = JSON.parse(user.preferences);
      } catch (e) {
        console.error('Error parsing preferences:', e);
        preferences = {};
      }
    }

    return NextResponse.json({ success: true, preferences });
  } catch (err: any) {
    console.error('Get preferences error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to get preferences' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const customer = getCustomerFromRequest(req);
    if (!customer?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Extract numeric ID from "customer-{id}" format
    const match = customer.id.match(/customer-(\d+)/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 401 });
    }
    const userId = parseInt(match[1], 10);

    const body = await req.json().catch(() => ({}));
    const { promotions, specialOffer, siteUpdate, survey } = body;

    // Validate input
    const preferences = {
      promotions: Boolean(promotions),
      specialOffer: Boolean(specialOffer),
      siteUpdate: Boolean(siteUpdate),
      survey: Boolean(survey),
    };

    // Update preferences
    await query(
      'UPDATE customer_users SET preferences = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(preferences), userId]
    );

    return NextResponse.json({ success: true, message: 'Preferences saved successfully', preferences });
  } catch (err: any) {
    console.error('Save preferences error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save preferences' }, { status: 500 });
  }
}
