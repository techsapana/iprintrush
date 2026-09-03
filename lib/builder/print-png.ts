/** PNG output uses a single zlib stream across bounded RGBA strips, never a full-sheet canvas. */
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function chunk(name: string, data = new Uint8Array(0)): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(data.length + 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) bytes[i + 4] = name.charCodeAt(i);
  bytes.set(data, 8);
  let crc = 0xffffffff;
  for (let i = 4; i < bytes.length - 4; i++) crc = crcTable[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
  view.setUint32(bytes.length - 4, (crc ^ 0xffffffff) >>> 0);
  return bytes;
}
export type Strip = { rows: number; rgba: Uint8Array | Uint8ClampedArray };
export async function encodePrintPNG(width: number, height: number, strips: AsyncIterable<Strip>, signal?: AbortSignal): Promise<Blob> {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || width > 6900 || height < 1 || height > 36000) throw new Error('Invalid print dimensions.');
  if (typeof CompressionStream === 'undefined') throw new Error('Please use an updated Safari, Chrome, Edge or Firefox browser for PNG export.');
  const ihdr = new Uint8Array(13), header = new DataView(ihdr.buffer);
  header.setUint32(0, width); header.setUint32(4, height); ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const phys = new Uint8Array(9), density = new DataView(phys.buffer);
  density.setUint32(0, 11811); density.setUint32(4, 11811); phys[8] = 1; // 300 DPI, nearest whole pixels/metre
  const parts: BlobPart[] = [new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('sRGB',new Uint8Array([0])),chunk('pHYs',phys)];
  const compression = new CompressionStream('deflate');
  const writer = compression.writable.getWriter(), reader = compression.readable.getReader();
  let readError: unknown, compressedBytes = 0;
  const collecting = (async () => {
    try { while (true) { const {value,done} = await reader.read(); if (done) break;
      compressedBytes += value.byteLength;
      if (compressedBytes > 512 * 1024 * 1024) throw new Error('PNG exceeds 512 MB. Use a shorter sheet or fewer images.');
      parts.push(chunk('IDAT',value));
    }} catch (e) { readError = e; await writer.abort(e).catch(() => {}); }
  })();
  const abort = () => { void writer.abort(signal?.reason).catch(() => {}); void reader.cancel(signal?.reason).catch(() => {}); };
  signal?.addEventListener('abort',abort,{once:true});
  let rowsWritten = 0;
  try {
    signal?.throwIfAborted();
    for await (const strip of strips) {
      signal?.throwIfAborted(); if (readError) throw readError;
      if (!Number.isInteger(strip.rows) || strip.rows < 1 || strip.rows > 256 || strip.rgba.length !== width * strip.rows * 4 || rowsWritten + strip.rows > height) throw new Error('Invalid PNG strip.');
      const stride = width * 4, scanlines = new Uint8Array((stride + 1) * strip.rows);
      // PNG Sub filter, applied independently to each scanline, preserving exact alpha and color bytes.
      for (let row = 0; row < strip.rows; row++) {
        const from = row * stride, to = row * (stride + 1);
        scanlines[to] = 1;
        for (let x = 0; x < stride; x++) scanlines[to + x + 1] = (strip.rgba[from + x] - (x >= 4 ? strip.rgba[from + x - 4] : 0)) & 255;
      }
      await writer.write(scanlines); rowsWritten += strip.rows;
    }
    if (rowsWritten !== height) throw new Error('Incomplete PNG output.');
    await writer.close(); await collecting;
    signal?.throwIfAborted(); if (readError) throw readError;
    parts.push(chunk('IEND'));
    return new Blob(parts,{type:'image/png'});
  } catch(e) {
    await writer.abort(e).catch(() => {}); await reader.cancel(e).catch(() => {}); await collecting;
    throw e;
  } finally { signal?.removeEventListener('abort',abort); }
}
export type PrintArt = {src:string;x:number;y:number;w:number;h:number;rot:boolean;rotation?:number};
export async function renderPrintPNG(arts: PrintArt[], length: number, onProgress: (percent:number)=>void, signal?: AbortSignal, allowLowResolution = false): Promise<Blob> {
  const width = 6900, height = Math.round(length * 300), canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = 132; // 128 exported rows plus two-row bleed on both edges
  const ctx = canvas.getContext('2d',{willReadFrequently:true,colorSpace:'srgb'});
  if (!ctx) throw new Error('Your browser could not create the print canvas.');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // One decoded image retained at a time. Compression and drawing never allocate the full sheet.
  let cached: {src:string;image:ImageBitmap}|null = null;
  async function imageFor(src:string) {
    if (cached?.src === src) return cached.image;
    cached?.image.close(); cached = null;
    const response = await fetch(src,{signal});
    const image = await createImageBitmap(await response.blob());
    if (signal?.aborted) {image.close(); signal.throwIfAborted();}
    cached = {src,image}; return image;
  }
  async function* strips(): AsyncGenerator<Strip> {
    for(let top = 0; top < height; top += 128) {
      signal?.throwIfAborted(); const rows = Math.min(128,height-top);
      ctx!.clearRect(0,0,width,132);
      for(const art of arts) {
        const y = art.y*300, bottom = y + (art.rot?art.w:art.h)*300;
        if (bottom <= top-2 || y >= top+rows+2) continue;
        const image = await imageFor(art.src);
        if (!allowLowResolution && Math.min(image.width/art.w,image.height/art.h)<300-1e-6) throw new Error('An image is below 300 DPI at its print size. Reduce its size or upload a higher-resolution original.');
        ctx!.save(); ctx!.translate(art.x*300, y-top+2);
        const rotation=art.rotation??(art.rot?90:0);
        if(rotation===90)ctx!.translate(art.h*300,0);
        else if(rotation===180)ctx!.translate(art.w*300,art.h*300);
        else if(rotation===270)ctx!.translate(0,art.w*300);
        if(rotation)ctx!.rotate(rotation*Math.PI/180);
        ctx!.drawImage(image,0,0,art.w*300,art.h*300); ctx!.restore();
      }
      yield {rows,rgba:ctx!.getImageData(0,2,width,rows).data};
      onProgress(Math.round((top+rows)/height*100));
      await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
  }
  try {return await encodePrintPNG(width,height,strips(),signal);}
  finally { if(cached) (cached as {image:ImageBitmap}).image.close(); canvas.width=0;canvas.height=0; }
}
