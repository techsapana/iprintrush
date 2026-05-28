import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = params.id;
    if (!itemId) {
      return NextResponse.json({ error: 'Missing order item id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const fileUrl: string | undefined = body.fileUrl;

    if (!fileUrl) {
      return NextResponse.json({ error: 'Missing fileUrl' }, { status: 400 });
    }

    const rows: any = await query(
      'SELECT requirement_files_json FROM order_items WHERE id = ?',
      [itemId]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    let files: string[] = [];
    const current = rows[0];
    if (current.requirement_files_json) {
      try {
        const parsed =
          typeof current.requirement_files_json === 'string'
            ? JSON.parse(current.requirement_files_json)
            : current.requirement_files_json;
        if (Array.isArray(parsed)) files = parsed;
      } catch {
        // ignore
      }
    }

    const url = String(fileUrl).trim();
    if (!url) {
      return NextResponse.json({ error: 'Invalid fileUrl' }, { status: 400 });
    }
    if (!files.includes(url)) files.push(url);

    await query(
      `UPDATE order_items
       SET requirement_files_json = ?,
           requirement_status = 'pending',
           requirement_uploaded_at = COALESCE(requirement_uploaded_at, NOW()),
           requirement_reviewed_at = NULL
       WHERE id = ?`,
      [JSON.stringify(files), itemId]
    );

    return NextResponse.json({
      success: true,
      requirementFiles: files,
      requirementStatus: 'pending',
    });
  } catch (err: any) {
    console.error('Order item requirement upload error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to upload requirement file' },
      { status: 500 }
    );
  }
}

