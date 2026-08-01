import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEMP_DIR = path.join(process.cwd(), 'uploads', 'private-artwork-temp');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No artwork file provided' }, { status: 400 });
    }

    const ext = path.extname(file.name || '').toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.psd', '.tif', '.tiff', '.ai', '.eps', '.zip'];
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'image/vnd.adobe.photoshop', 'image/tiff',
      'application/postscript', 'application/illustrator',
      'application/zip', 'application/x-zip-compressed'
    ];

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file format. Accepted formats: JPG, PNG, PDF, PSD, TIF, AI, EPS, ZIP.' }, { status: 400 });
    }

    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'Artwork file must be <= 100MB. For larger files, please provide a cloud link.' }, { status: 400 });
    }

    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
    }

    const fileExt = ext || '.jpg';
    const tempId = crypto.randomUUID();
    const safeName = `${tempId}${fileExt}`;
    const targetPath = path.join(TEMP_DIR, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(targetPath, buffer);

    return NextResponse.json({
      success: true,
      tempId: safeName,
      originalName: file.name || safeName,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to upload artwork' }, { status: 500 });
  }
}

