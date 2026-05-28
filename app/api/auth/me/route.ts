import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';
import { queryOne } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  let user: any = {
    ...customer,
    phone: '',
    createdAt: null,
  };
  try {
    const row: any = await queryOne(
      'SELECT id, email, name, phone, created_at FROM customer_users WHERE email = ? LIMIT 1',
      [customer.email],
    );
    if (row?.id) {
      user = {
        id: `customer-${row.id}`,
        email: row.email,
        name: row.name,
        phone: row.phone || '',
        createdAt: row.created_at || null,
      };
    }
  } catch {
    // Fall back to token payload.
  }
  return NextResponse.json({
    authenticated: true,
    user,
  });
}
