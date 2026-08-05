import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Total Overall Revenue
    const totalRevRows = await query(
      `SELECT SUM(amount_total) as total_revenue FROM orders WHERE status = 'paid'`
    );
    const totalRevenue = parseFloat((totalRevRows as any[])[0]?.total_revenue || 0);

    // 2. Sales by Month (Last 12 months with data)
    const salesByMonthRows = await query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount_total) as revenue, COUNT(*) as total_sales 
       FROM orders 
       WHERE status = 'paid' 
       GROUP BY month 
       ORDER BY month DESC 
       LIMIT 12`
    );
    // Reverse to get chronological order
    const salesByMonth = (salesByMonthRows as any[]).reverse().map(row => ({
      month: row.month,
      revenue: parseFloat(row.revenue || 0),
      sales: parseInt(row.total_sales || 0, 10)
    }));

    // 3. Top Products by Revenue
    const topProductsRows = await query(
      `SELECT oi.name as product_name, SUM(oi.quantity) as total_quantity, SUM(oi.line_total) as total_revenue 
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'paid'
       GROUP BY oi.name
       ORDER BY total_revenue DESC
       LIMIT 10`
    );
    const topProducts = (topProductsRows as any[]).map(row => ({
      productName: row.product_name,
      totalQuantity: parseInt(row.total_quantity || 0, 10),
      totalRevenue: parseFloat(row.total_revenue || 0)
    }));

    // 4. Top Customers by Spend
    const topCustomersRows = await query(
      `SELECT customer_email, MAX(customer_name) as customer_name, SUM(amount_total) as total_spent, COUNT(*) as total_orders
       FROM orders
       WHERE status = 'paid'
       GROUP BY customer_email
       ORDER BY total_spent DESC
       LIMIT 10`
    );
    const topCustomers = (topCustomersRows as any[]).map(row => ({
      email: row.customer_email,
      name: row.customer_name,
      totalSpent: parseFloat(row.total_spent || 0),
      totalOrders: parseInt(row.total_orders || 0, 10)
    }));

    return NextResponse.json({
      totalRevenue,
      salesByMonth,
      topProducts,
      topCustomers
    });

  } catch (err: any) {
    console.error('Analytics fetch error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
