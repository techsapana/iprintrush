// Serve uploaded files from /uploads directory
import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat, open } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
};

async function resolveUploadPath(params: { path: string[] }) {
  const requestedParts = params.path || [];
  if (requestedParts[0] === 'private-artwork' || requestedParts[0] === 'private-artwork-temp') {
    return { ok: false as const, status: 403 as const, error: 'Access denied' };
  }

  const filePath = path.join(process.cwd(), 'uploads', ...params.path);
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const resolvedPath = path.resolve(filePath);

  // Security: Ensure the path is within uploads directory
  if (!resolvedPath.startsWith(uploadsDir)) {
    return { ok: false as const, status: 403 as const, error: 'Access denied' };
  }

  // Check if file exists
  if (!existsSync(resolvedPath)) {
    return { ok: false as const, status: 404 as const, error: 'File not found' };
  }

  const stats = await stat(resolvedPath);
  if (!stats.isFile()) {
    return { ok: false as const, status: 400 as const, error: 'Not a file' };
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const isVideo = contentType.startsWith('video/');
  const cacheControl = isVideo ? 'no-store' : 'public, max-age=31536000, immutable';
  const filename = path.basename(resolvedPath);

  return {
    ok: true as const,
    resolvedPath,
    stats,
    contentType,
    isVideo,
    cacheControl,
    filename,
  };
}

function baseHeaders(opts: {
  contentType: string;
  cacheControl: string;
  isVideo: boolean;
  filename: string;
}) {
  return {
    'Content-Type': opts.contentType,
    'Content-Disposition': `inline; filename="${opts.filename}"`,
    ...(opts.isVideo ? { 'Accept-Ranges': 'bytes' } : {}),
    'Cache-Control': opts.cacheControl,
    'X-Content-Type-Options': 'nosniff',
  };
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const resolvedParams = await params;
    const resolved = await resolveUploadPath(resolvedParams);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    return new NextResponse(null, {
      headers: {
        ...baseHeaders(resolved),
        'Content-Length': resolved.stats.size.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error serving file (HEAD):', error);
    return NextResponse.json(
      { error: error.message || 'Failed to serve file' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const resolvedParams = await params;
    const resolved = await resolveUploadPath(resolvedParams);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    // Support HTTP Range requests for video streaming
    const range = request.headers.get('range');
    if (resolved.isVideo && range) {
      const size = resolved.stats.size;
      const match = /^bytes=(\d+)-(\d*)$/i.exec(range);
      if (!match) {
        return NextResponse.json({ error: 'Invalid Range header' }, { status: 416 });
      }

      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : Math.min(start + 1024 * 1024 - 1, size - 1);

      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
        return NextResponse.json({ error: 'Range not satisfiable' }, { status: 416 });
      }

      const length = end - start + 1;
      const file = await open(resolved.resolvedPath, 'r');
      try {
        const buffer = Buffer.alloc(length);
        await file.read(buffer, 0, length, start);

        return new NextResponse(buffer, {
          status: 206,
          headers: {
            ...baseHeaders(resolved),
            'Content-Length': length.toString(),
            'Content-Range': `bytes ${start}-${end}/${size}`,
          },
        });
      } finally {
        await file.close();
      }
    }

    // Read entire file for non-video or no-range requests
    const buffer = await readFile(resolved.resolvedPath);

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        ...baseHeaders(resolved),
        'Content-Length': resolved.stats.size.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to serve file' },
      { status: 500 }
    );
  }
}
