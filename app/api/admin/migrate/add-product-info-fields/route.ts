import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

export async function GET() {
  try {
    const checkColumns = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME IN ('file_setup', 'application_tips');
    `);

    const existingColumns = (checkColumns as any[]).map((c: any) => c.COLUMN_NAME);
    const addedColumns: string[] = [];

    if (!existingColumns.includes('file_setup')) {
      await query(`ALTER TABLE products ADD COLUMN file_setup TEXT NULL`);
      addedColumns.push('file_setup');
    }

    if (!existingColumns.includes('application_tips')) {
      await query(`ALTER TABLE products ADD COLUMN application_tips TEXT NULL`);
      addedColumns.push('application_tips');
    }

    if (addedColumns.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Successfully added columns: ${addedColumns.join(', ')}`,
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Columns already exist, no changes made.',
      });
    }
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to run migration' },
      { status: 500 }
    );
  }
}
