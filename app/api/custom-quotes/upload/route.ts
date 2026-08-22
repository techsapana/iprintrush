import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'custom-quotes');

// Limit file size to 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'application/pdf'
];

export async function POST(req: NextRequest) {
  try {
    // Check if the directory exists
    try {
      await fs.access(UPLOAD_DIR);
    } catch {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const savedFiles: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ 
          error: `Invalid file type for ${file.name}. Only JPG, PNG, WEBP, and PDF are allowed.` 
        }, { status: 400 });
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ 
          error: `File ${file.name} exceeds the 5MB size limit.` 
        }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      // Generate a unique filename
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.jpg');
      const filename = `quote-${uniqueSuffix}${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      await fs.writeFile(filepath, buffer);
      
      // Store the relative path for database storage and retrieval
      savedFiles.push(`/api/uploads/custom-quotes/${filename}`);
    }

    return NextResponse.json({
      success: true,
      files: savedFiles
    });

  } catch (error: any) {
    console.error('Custom quote file upload error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to upload files'
    }, { status: 500 });
  }
}
