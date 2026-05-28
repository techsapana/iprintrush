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

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Artwork file must be <= 20MB' }, { status: 400 });
    }

    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
    }

    const ext = path.extname(file.name || '') || '.jpg';
    const tempId = crypto.randomUUID();
    const safeName = `${tempId}${ext.toLowerCase()}`;
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

