import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { verifyAdminToken } from '@/app/lib/adminAuth';

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Create order_messages table
    await query(`
      CREATE TABLE IF NOT EXISTS order_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        sender_type ENUM('admin', 'customer') NOT NULL,
        message TEXT NOT NULL,
        attachment_url VARCHAR(2048) DEFAULT NULL,
        attachment_name VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    // 2. Add any missing columns to orders if necessary
    try {
      await query(`ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100) DEFAULT NULL`);
    } catch (e: any) {
      if (!e.message.includes('Duplicate column name')) {
        console.warn('Could not add tracking_number column, it might already exist', e);
      }
    }

    return NextResponse.json({ success: true, message: 'Schema for order messaging updated successfully' });
  } catch (err: any) {
    console.error('Migration error:', err);
    return NextResponse.json({ error: err?.message || 'Migration failed' }, { status: 500 });
  }
}
