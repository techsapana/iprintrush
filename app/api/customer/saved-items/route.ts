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
      'SELECT id, saved_items FROM customer_users WHERE id = ? AND enabled = TRUE LIMIT 1',
      [userId]
    );

    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse saved items or return empty array
    let savedItems = [];
    if (user.saved_items) {
      try {
        savedItems = JSON.parse(user.saved_items);
      } catch (e) {
        console.error('Error parsing saved items:', e);
        savedItems = [];
      }
    }

    return NextResponse.json({ success: true, savedItems });
  } catch (err: any) {
    console.error('Get saved items error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to get saved items' }, { status: 500 });
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
    const { productId, action } = body;

    if (!productId || !action) {
      return NextResponse.json({ error: 'Product ID and action are required' }, { status: 400 });
    }

    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be add or remove' }, { status: 400 });
    }

    // Get current saved items
    const user: any = await queryOne(
      'SELECT saved_items FROM customer_users WHERE id = ? AND enabled = TRUE LIMIT 1',
      [userId]
    );

    let savedItems = [];
    if (user?.saved_items) {
      try {
        savedItems = JSON.parse(user.saved_items);
      } catch (e) {
        console.error('Error parsing saved items:', e);
        savedItems = [];
      }
    }

    // Ensure it's an array
    if (!Array.isArray(savedItems)) {
      savedItems = [];
    }

    // Perform action
    if (action === 'add') {
      if (!savedItems.includes(productId)) {
        savedItems.push(productId);
      }
    } else if (action === 'remove') {
      savedItems = savedItems.filter((id: string) => id !== productId);
    }

    // Update saved items
    await query(
      'UPDATE customer_users SET saved_items = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(savedItems), userId]
    );

    return NextResponse.json({ 
      success: true, 
      message: `Item ${action === 'add' ? 'added to' : 'removed from'} saved items`,
      savedItems 
    });
  } catch (err: any) {
    console.error('Update saved items error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to update saved items' }, { status: 500 });
  }
}
