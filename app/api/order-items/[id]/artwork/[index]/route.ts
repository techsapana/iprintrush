import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/app/lib/db';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import path from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  try {
    const { id: idParam, index: indexParam } = await params;
    const itemId = Number(idParam);
    const index = Number(indexParam);
    if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(index) || index < 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const admin = getAdminFromRequest(request);
    const customer = getCustomerFromRequest(request);
    const asDownload = request.nextUrl.searchParams.get('download') === '1';
    if (!admin && !customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const row: any = await queryOne(
      `SELECT oi.artwork_files_json, o.customer_email
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = ?
       LIMIT 1`,
      [itemId],
    );

    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!admin && customer?.email !== row.customer_email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let files: string[] = [];
    if (row.artwork_files_json) {
      try {
        const parsed =
          typeof row.artwork_files_json === 'string'
            ? JSON.parse(row.artwork_files_json)
            : row.artwork_files_json;
        if (Array.isArray(parsed)) files = parsed;
      } catch {
        files = [];
      }
    }

    const relPath = files[index];
    if (!relPath) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const absolute = path.join(process.cwd(), 'uploads', relPath);
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const resolved = path.resolve(absolute);
    if (!resolved.startsWith(uploadsRoot) || !existsSync(resolved)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const buffer = await readFile(resolved);
    const baseName = path.basename(resolved);

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    if (asDownload) {
      headers['Content-Disposition'] = `attachment; filename="${baseName.replace(/"/g, '')}"`;
    }

    return new NextResponse(buffer, { headers });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load artwork' }, { status: 500 });
  }
}

