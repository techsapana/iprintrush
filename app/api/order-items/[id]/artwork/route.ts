import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import { unlink, rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getWorkflowWriteCandidates, normalizeWorkflowStatus } from '@/app/lib/orderWorkflow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getAdminFromRequest(request);
    const customer = getCustomerFromRequest(request);
    if (!admin && !customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = params.id;
    if (!itemId) {
      return NextResponse.json({ error: 'Missing order item id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const fileUrl: string | undefined = body.fileUrl; // actually relative storage path
    const customSizeNote: string | undefined = body.customSizeNote;
    const replaceArtwork = body.replaceArtwork !== false;

    if (!fileUrl && customSizeNote === undefined) {
      return NextResponse.json(
        { error: 'Nothing to update. Provide fileUrl and/or customSizeNote.' },
        { status: 400 }
      );
    }

    const rows: any = await query(
      `SELECT oi.artwork_files_json, oi.custom_size_note, o.id as order_id, o.customer_email
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = ?`,
      [itemId]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    const current = rows[0];
    if (!admin && customer?.email !== current.customer_email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    let files: string[] = [];
    if (current.artwork_files_json) {
      try {
        const parsed =
          typeof current.artwork_files_json === 'string'
            ? JSON.parse(current.artwork_files_json)
            : current.artwork_files_json;
        if (Array.isArray(parsed)) {
          files = parsed;
        }
      } catch {
        // ignore and start fresh
      }
    }

    if (fileUrl) {
      if (typeof fileUrl !== 'string' || !fileUrl.trim()) {
        return NextResponse.json({ error: 'Invalid fileUrl' }, { status: 400 });
      }
      let resolvedFilePath = fileUrl;
      // If a temp artwork id is provided, move it into private order storage.
      if (!fileUrl.includes('/')) {
        const tempName = path.basename(fileUrl);
        const tempPath = path.join(process.cwd(), 'uploads', 'private-artwork-temp', tempName);
        const targetDir = path.join(process.cwd(), 'uploads', 'private-artwork', `order-${current.order_id}`);
        if (!existsSync(targetDir)) {
          await mkdir(targetDir, { recursive: true });
        }
        const finalName = `${Date.now()}-${tempName}`;
        const finalPath = path.join(targetDir, finalName);
        if (!existsSync(tempPath)) {
          return NextResponse.json({ error: 'Uploaded temp artwork not found' }, { status: 400 });
        }
        await rename(tempPath, finalPath);
        resolvedFilePath = path.join('private-artwork', `order-${current.order_id}`, finalName);
      }

      const nextFiles = replaceArtwork
        ? [resolvedFilePath]
        : Array.from(new Set([...files, resolvedFilePath]));

      // Delete replaced files from disk.
      if (replaceArtwork && files.length > 0) {
        for (const relPath of files) {
          try {
            const abs = path.join(process.cwd(), 'uploads', relPath);
            const root = path.join(process.cwd(), 'uploads');
            const resolved = path.resolve(abs);
            if (resolved.startsWith(root) && existsSync(resolved)) {
              await unlink(resolved);
            }
          } catch {
            // ignore deletion failures
          }
        }
      }
      files = nextFiles;
    }

    const nextNote =
      customSizeNote !== undefined ? String(customSizeNote) : current.custom_size_note;

    await query(
      'UPDATE order_items SET artwork_files_json = ?, custom_size_note = ? WHERE id = ?',
      [JSON.stringify(files), nextNote, itemId]
    );

    // New or re-uploaded artwork should move order into artwork pending.
    if (fileUrl) {
      const candidates = getWorkflowWriteCandidates('artwork_pending');
      for (const candidate of candidates) {
        try {
          await query(
            'UPDATE orders SET workflow_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [candidate, current.order_id],
          );
          break;
        } catch {
          // Try next compatible enum value.
        }
      }
    }

    return NextResponse.json({
      success: true,
      artworkFiles: files,
      customSizeNote: nextNote || '',
      workflowStatus: fileUrl ? normalizeWorkflowStatus('artwork_pending') : undefined,
    });
  } catch (err: any) {
    console.error('Order item artwork update error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update artwork/custom size' },
      { status: 500 }
    );
  }
}

