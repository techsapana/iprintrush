import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { getCustomerFromRequest } from '@/app/lib/customerAuth';
import { getAdminFromRequest } from '@/app/lib/adminAuth';
import { unlink, rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getWorkflowWriteCandidates, normalizeWorkflowStatus } from '@/app/lib/orderWorkflow';
import { sendEmail } from '@/app/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminFromRequest(request);
    const customer = getCustomerFromRequest(request);
    if (!admin && !customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: itemId } = await params;
    if (!itemId) {
      return NextResponse.json({ error: 'Missing order item id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const fileUrl: string | undefined = body.fileUrl; // actually relative storage path
    const customSizeNote: string | undefined = body.customSizeNote;
    const replaceArtwork = body.replaceArtwork !== false;
    const uploaderRole = body.uploaderRole || (admin ? 'admin' : 'customer');

    if (!fileUrl && customSizeNote === undefined) {
      return NextResponse.json(
        { error: 'Nothing to update. Provide fileUrl and/or customSizeNote.' },
        { status: 400 }
      );
    }

    const rows: any = await query(
      `SELECT oi.artwork_files_json, oi.reuploaded_artwork_json, oi.replacement_artwork_json, oi.custom_size_note, o.id as order_id, o.customer_email
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = ?`,
      [itemId]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    const current = rows[0];
    
    // Verify permissions based on claimed role
    if (uploaderRole === 'admin' && !admin) {
      return NextResponse.json({ error: 'Unauthorized as admin' }, { status: 401 });
    }
    if (uploaderRole === 'customer' && !admin && customer?.email !== current.customer_email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetColumn = uploaderRole === 'admin' ? 'replacement_artwork_json' : 'reuploaded_artwork_json';
    const targetJsonStr = current[targetColumn];

    let files: string[] = [];
    if (targetJsonStr) {
      try {
        const parsed =
          typeof targetJsonStr === 'string'
            ? JSON.parse(targetJsonStr)
            : targetJsonStr;
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
      
      if (resolvedFilePath.startsWith('/api/uploads/')) {
        resolvedFilePath = resolvedFilePath.replace('/api/uploads/', '');
      }
      
      // If a temp artwork id is provided, move it into private order storage.
      if (!resolvedFilePath.includes('/')) {
        const tempName = path.basename(resolvedFilePath);
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
        resolvedFilePath = path.join('private-artwork', `order-${current.order_id}`, finalName).replace(/\\/g, '/');
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

    if (fileUrl) {
      await query(
        `UPDATE order_items SET ${targetColumn} = ?, custom_size_note = ? WHERE id = ?`,
        [JSON.stringify(files), nextNote, itemId]
      );
    } else {
      await query(
        `UPDATE order_items SET custom_size_note = ? WHERE id = ?`,
        [nextNote, itemId]
      );
    }

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



      // If Admin, optionally notify customer
      if (uploaderRole === 'admin' && current.customer_email) {
        try {
          const content = `
            <h2>Replacement Artwork Suggested</h2>
            <p>We have uploaded a suggested replacement artwork for your order.</p>
            <p>Please log in to your account and go to your order page to view and approve the replacement.</p>
            <br/>
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://iprintrush.com'}/my-orders/${current.order_id}">View Order</a></p>
          `;
          await sendEmail({
            to: current.customer_email,
            subject: 'Action Required: Replacement Artwork Suggested',
            text: 'We have uploaded a suggested replacement artwork for your order. Please log in to view and approve.',
            html: content
          });
        } catch (e) {
          console.error('Failed to send artwork notification email:', e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      artworkFiles: files,
      targetColumn,
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

