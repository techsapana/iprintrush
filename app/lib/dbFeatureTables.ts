import { query, queryOne } from '@/app/lib/db';

export async function hasDbTable(tableName: string): Promise<boolean> {
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) return false;
  try {
    const rows: any = await query(`SHOW TABLES LIKE '${tableName}'`);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

/** Insert missing rows so every enabled category has a nav_position (for swap UI). */
export async function ensureNavbarCategoryOrderRows(): Promise<void> {
  if (!(await hasDbTable('navbar_category_order'))) return;

  const cats: any[] = (await query(
    'SELECT id, display_order FROM categories WHERE enabled = TRUE ORDER BY display_order ASC, name ASC',
  )) as any[];

  const existing: any[] = (await query('SELECT category_id FROM navbar_category_order')) as any[];
  const have = new Set(existing.map((r) => String(r.category_id)));

  const maxRow: any = await queryOne('SELECT MAX(nav_position) AS m FROM navbar_category_order');
  let next = Number(maxRow?.m) || 0;
  if (next % 10 !== 0) next = Math.ceil(next / 10) * 10;
  if (next === 0) next = 10;

  for (const c of cats) {
    const id = String(c.id);
    if (have.has(id)) continue;
    await query(
      'INSERT INTO navbar_category_order (category_id, nav_position) VALUES (?, ?)',
      [id, next],
    );
    next += 10;
  }
}
