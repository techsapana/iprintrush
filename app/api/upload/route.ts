// File Upload API
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'product';

    console.log('Upload request:', { 
      fileName: file?.name, 
      fileType: file?.type, 
      fileSize: file?.size,
      folder 
    });

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'image/tiff', 'image/vnd.adobe.photoshop', // TIF, PSD
      'application/pdf', 'application/postscript', // PDF, AI/EPS
      'application/illustrator',
      'application/zip', 'application/x-zip-compressed', // ZIP
      // Also keep previous video types just in case
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'text/plain'
    ];
    
    // Add extension check since MIME types for AI/PSD can be flaky
    const fileExt = (file.name || '').split('.').pop().toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'psd', 'tif', 'tiff', 'ai', 'eps', 'zip', 'mp4', 'webm', 'ogg', 'mov', 'txt'];

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(fileExt)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted formats: JPG, PNG, PDF, PSD, TIF, AI, EPS, and ZIP.' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB per file.' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', folder);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename (preserve extension when available)
    let ext;
    if (file.type === 'application/pdf') {
      ext = '.pdf';
    } else if (file.type === 'text/plain') {
      ext = '.txt';
    } else if (file.type.startsWith('video/')) {
      // Handle video extensions
      if (file.type === 'video/mp4') ext = '.mp4';
      else if (file.type === 'video/webm') ext = '.webm';
      else if (file.type === 'video/ogg') ext = '.ogg';
      else if (file.type === 'video/quicktime') ext = '.mov';
      else ext = '.mp4'; // fallback
    } else {
      // Handle image extensions
      ext = path.extname(file.name) || '.jpg';
    }
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${randomStr}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return the URL path for accessing the file
    const url = `/api/uploads/${folder}/${filename}`;

    console.log('Upload successful:', { url, filename, size: file.size, type: file.type });

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
