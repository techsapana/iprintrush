import { NextResponse } from 'next/server';
import { queryOne, query } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const log: string[] = [];
  let success = true;

  const ensureColumn = async (table: string, column: string, ddl: string) => {
    try {
      const col = await queryOne(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
      if (!col) {
        await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
        log.push(`Added ${column} to ${table}`);
      } else {
        log.push(`Column ${column} already exists in ${table}`);
      }
    } catch (e: any) {
      success = false;
      log.push(`Error adding ${column} to ${table}: ${e.message}`);
    }
  };

  try {
    // 1. turnaround_options
    await ensureColumn('turnaround_options', 'min_width_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('turnaround_options', 'max_width_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('turnaround_options', 'min_height_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('turnaround_options', 'max_height_in', 'DECIMAL(10,2) NULL');

    // 2. product_turnaround_options
    await ensureColumn('product_turnaround_options', 'min_width_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('product_turnaround_options', 'max_width_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('product_turnaround_options', 'min_height_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('product_turnaround_options', 'max_height_in', 'DECIMAL(10,2) NULL');

    // 3. product_pool_options
    await ensureColumn('product_pool_options', 'min_width_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('product_pool_options', 'max_width_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('product_pool_options', 'min_height_in', 'DECIMAL(10,2) NULL');
    await ensureColumn('product_pool_options', 'max_height_in', 'DECIMAL(10,2) NULL');

    // 4. site_settings
    await ensureColumn('site_settings', 'weekend_opening_time', 'VARCHAR(64) NULL');
    await ensureColumn('site_settings', 'weekend_closing_time', 'VARCHAR(64) NULL');

  } catch (err: any) {
    success = false;
    log.push(`General Error: ${err.message}`);
  }

  return NextResponse.json({
    success,
    message: success ? 'Migration completed successfully.' : 'Migration completed with errors.',
    log
  });
}
