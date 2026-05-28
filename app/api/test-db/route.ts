import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT COUNT(*) as count FROM products');
    return NextResponse.json({ 
      success: true, 
      message: 'Database connected successfully',
      productCount: result[0]?.count || 0 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
