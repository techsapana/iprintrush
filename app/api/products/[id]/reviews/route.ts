import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const productId = params.id;
    if (!productId) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const reviews = await query(
      `SELECT id, customer_name, rating, review_text, created_at 
       FROM product_reviews 
       WHERE product_id = ? AND status = 'approved' 
       ORDER BY created_at DESC`,
      [productId]
    );

    // Calculate average rating
    let averageRating = 0;
    if (Array.isArray(reviews) && reviews.length > 0) {
      const sum = reviews.reduce((acc: number, curr: any) => acc + curr.rating, 0);
      averageRating = sum / reviews.length;
    }

    return NextResponse.json({
      success: true,
      reviews: reviews || [],
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews: Array.isArray(reviews) ? reviews.length : 0
    });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const productId = params.id;
    if (!productId) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const body = await req.json();
    const { customer_name, customer_email, rating, review_text } = body;

    if (!customer_name || !rating || !review_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    await query(
      `INSERT INTO product_reviews (product_id, customer_name, customer_email, rating, review_text, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [productId, customer_name, customer_email || null, rating, review_text]
    );

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully and is pending approval.'
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
