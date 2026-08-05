import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/app/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ eligible: false, discounts: [] });
    }

    // 1. Fetch the global settings
    const settings: any = await queryOne(
      'SELECT announcement_discount_enabled, announcement_discount_type, announcement_discount_value, announcement_discount_condition, bar_discount_enabled, bar_discount_type, bar_discount_value, bar_discount_start_date, bar_discount_end_date FROM site_settings ORDER BY id ASC LIMIT 1'
    );

    if (!settings) {
      return NextResponse.json({ eligible: false, discounts: [] });
    }

    const availableDiscounts = [];

    // --- POPUP DISCOUNT (First Order logic) ---
    if (settings.announcement_discount_enabled === 1) {
      const type = settings.announcement_discount_type || 'percentage';
      const value = Number(settings.announcement_discount_value) || 0;
      const condition = settings.announcement_discount_condition || 'none';

      let isEligible = true;
      if (condition === 'first_order') {
        const ordersCount: any = await queryOne(
          'SELECT COUNT(*) as count FROM orders WHERE customer_email = ? AND status != "cancelled"',
          [email]
        );
        if (ordersCount.count > 0) {
          isEligible = false;
        }
      }

      if (isEligible) {
        availableDiscounts.push({
          source: 'popup',
          type,
          value,
          description: condition === 'first_order' ? 'First Order Discount' : 'Popup Discount'
        });
      }
    }

    // --- ANNOUNCEMENT BAR DISCOUNT (Time-based logic) ---
    if (settings.bar_discount_enabled === 1) {
      const type = settings.bar_discount_type || 'percentage';
      const value = Number(settings.bar_discount_value) || 0;
      const startDate = settings.bar_discount_start_date ? new Date(settings.bar_discount_start_date) : null;
      const endDate = settings.bar_discount_end_date ? new Date(settings.bar_discount_end_date) : null;
      
      const now = new Date();
      let isEligible = true;

      if (startDate && now < startDate) {
        isEligible = false;
      }
      if (endDate && now > endDate) {
        isEligible = false;
      }

      if (isEligible) {
        availableDiscounts.push({
          source: 'bar',
          type,
          value,
          description: 'Announcement Discount'
        });
      }
    }

    if (availableDiscounts.length === 0) {
      return NextResponse.json({ eligible: false, discounts: [] });
    }

    // We still return 'discount' as the first one for backward compatibility if needed, 
    // but the frontend should ideally use the 'discounts' array to pick the best one.
    return NextResponse.json({
      eligible: true,
      discount: availableDiscounts[0], 
      discounts: availableDiscounts
    });

  } catch (error: any) {
    console.error('[AUTO_DISCOUNT_API] Error:', error);
    return NextResponse.json({ eligible: false, discounts: [] }, { status: 500 });
  }
}
