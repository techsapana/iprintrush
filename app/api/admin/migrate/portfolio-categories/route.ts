import { NextResponse } from 'next/server';
import { query, queryOne } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs: string[] = [];

    // 1. Create portfolio_categories table
    await query(`
      CREATE TABLE IF NOT EXISTS portfolio_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    logs.push('Ensured table: portfolio_categories');

    // 2. Add category_id to portfolio_images if it doesn't exist
    const checkCol = await queryOne(`
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'portfolio_images' 
        AND COLUMN_NAME = 'category_id';
    `);

    if (checkCol?.count === 0 || checkCol?.count === '0') {
      await query(`
        ALTER TABLE portfolio_images 
        ADD COLUMN category_id INT NULL AFTER id;
      `);
      logs.push('Added column: category_id to portfolio_images');
    } else {
      logs.push('Column category_id already exists in portfolio_images');
    }

    // 3. Ensure a default 'Uncategorized' category exists
    let defaultCat = await queryOne(`SELECT id FROM portfolio_categories WHERE name = 'Uncategorized' LIMIT 1`);
    if (!defaultCat) {
      const insertRes: any = await query(`INSERT INTO portfolio_categories (name, display_order) VALUES ('Uncategorized', 9999)`);
      defaultCat = { id: insertRes.insertId };
      logs.push('Created default category: Uncategorized');
    } else {
      logs.push('Default category already exists');
    }

    // 4. Assign existing orphaned images to the default category
    if (defaultCat?.id) {
      const updateRes: any = await query(`
        UPDATE portfolio_images 
        SET category_id = ? 
        WHERE category_id IS NULL;
      `, [defaultCat.id]);
      
      if (updateRes?.affectedRows > 0) {
        logs.push(`Assigned ${updateRes.affectedRows} orphaned images to 'Uncategorized' (ID: ${defaultCat.id})`);
      }
    }

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Portfolio categories migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
