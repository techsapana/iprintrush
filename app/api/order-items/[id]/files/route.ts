import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import path from 'path';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = getAdminFromRequest(req);
    const customer = getCustomerFromRequest(req);
    if (!admin && !customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { fileUrl } = body;
    let { fileType } = body;

    if (!id || !fileUrl || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields: id, fileUrl, fileType' },
        { status: 400 }
      );
    }

    if (!['artwork', 'requirement', 'artwork_files_json', 'reuploaded_artwork_json', 'replacement_artwork_json'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type.' },
        { status: 400 }
      );
    }

    // Get current item data
    const item = await query(
      `SELECT oi.id, oi.artwork_files_json, oi.reuploaded_artwork_json, oi.replacement_artwork_json, oi.requirement_files_json, o.customer_email
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = ?
       LIMIT 1`,
      [id]
    );

    if (!Array.isArray(item) || item.length === 0) {
      return NextResponse.json(
        { error: 'Order item not found' },
        { status: 404 }
      );
    }

    const currentItem = item[0];
    if (!admin && customer?.email !== currentItem.customer_email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    let currentFiles: string[] = [];

    // Parse existing files based on type
    if (['artwork', 'artwork_files_json', 'reuploaded_artwork_json', 'replacement_artwork_json'].includes(fileType)) {
      let targetColumn = fileType === 'artwork' ? 'artwork_files_json' : fileType;
      
      const checkAndParse = (jsonStr: any, colName: string) => {
        if (!jsonStr) return false;
        try {
          const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
          if (Array.isArray(parsed) && parsed.includes(fileUrl)) {
            currentFiles = parsed;
            targetColumn = colName;
            return true;
          }
        } catch {}
        return false;
      };

      if (fileType === 'artwork') {
        if (!checkAndParse(currentItem.reuploaded_artwork_json, 'reuploaded_artwork_json')) {
          if (!checkAndParse(currentItem.replacement_artwork_json, 'replacement_artwork_json')) {
            checkAndParse(currentItem.artwork_files_json, 'artwork_files_json');
          }
        }
      } else {
        checkAndParse(currentItem[fileType], fileType);
      }
      
      fileType = targetColumn; // use this to pass the exact column below
    } else if (fileType === 'requirement') {
      if (currentItem.requirement_files_json) {
        try {
          const parsed = typeof currentItem.requirement_files_json === 'string' 
            ? JSON.parse(currentItem.requirement_files_json) 
            : currentItem.requirement_files_json;
          if (Array.isArray(parsed)) {
            currentFiles = parsed;
          }
        } catch {
          // ignore bad JSON
        }
      }
    }

    // Remove the specified file
    const updatedFiles = currentFiles.filter(url => url !== fileUrl);

    if (updatedFiles.length === currentFiles.length) {
      return NextResponse.json({ error: 'File not found on item' }, { status: 404 });
    }

    // Delete file from uploads directory.
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const resolvedPath = path.resolve(path.join(uploadsRoot, fileUrl));
    if (resolvedPath.startsWith(uploadsRoot) && existsSync(resolvedPath)) {
      await unlink(resolvedPath).catch(() => {});
    }

    // Update the database
    const updateField = fileType === 'requirement' ? 'requirement_files_json' : fileType;
    await query(
      `UPDATE order_items SET ${updateField} = ? WHERE id = ?`,
      [JSON.stringify(updatedFiles), id]
    );

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (err: any) {
    console.error('File deletion error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}
