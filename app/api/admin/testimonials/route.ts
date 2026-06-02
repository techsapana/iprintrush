import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getAdminFromRequest } from '@/app/lib/adminAuth';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await query('SELECT * FROM testimonials ORDER BY display_order ASC, id DESC');
    // Transform snake_case DB fields to camelCase for frontend
    const testimonials = Array.isArray(rows)
      ? rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          company: r.company,
          quote: r.quote,
          rating: r.rating,
          imageUrl: r.image_url,
          enabled: r.enabled,
          displayOrder: r.display_order,
        }))
      : [];
    return NextResponse.json({ testimonials });
  } catch (error: any) {
    console.error('GET testimonials error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch testimonials' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const company = String(body?.company || '').trim();
    const quote = String(body?.quote || '').trim();
    const rating = Number.isFinite(Number(body?.rating)) ? Math.max(1, Math.min(5, Number(body.rating))) : 5;
    const imageUrl = body?.imageUrl ? String(body.imageUrl).trim() : null;
    const enabled = body?.enabled !== false;
    const displayOrder = Number.isFinite(Number(body?.displayOrder)) ? Number(body.displayOrder) : 0;

    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!quote) {
      return NextResponse.json({ error: 'Quote is required.' }, { status: 400 });
    }

    const result: any = await query(
      'INSERT INTO testimonials (name, company, quote, rating, image_url, enabled, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, company, quote, rating, imageUrl, enabled, displayOrder]
    );
    return NextResponse.json({ ok: true, id: result?.insertId || null });
  } catch (error: any) {
    console.error('POST testimonial error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create testimonial' }, { status: 500 });
  }
}