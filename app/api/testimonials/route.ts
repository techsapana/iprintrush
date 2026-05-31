import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    const rows: any = await query(
      'SELECT id, name, company, quote, rating, image_url, display_order FROM testimonials WHERE enabled = 1 ORDER BY display_order ASC, id DESC'
    );
    const testimonials = Array.isArray(rows)
      ? rows.map((r: any) => ({
          id: Number(r.id),
          name: String(r.name || ''),
          company: String(r.company || ''),
          quote: String(r.quote || ''),
          rating: Number(r.rating || 5),
          imageUrl: r.image_url ? String(r.image_url) : null,
          displayOrder: Number(r.display_order || 0),
        }))
      : [];
    return NextResponse.json({ testimonials });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load testimonials' }, { status: 500 });
  }
}