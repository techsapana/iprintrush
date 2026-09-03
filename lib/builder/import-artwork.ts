/// <reference types="vite/client" />
const pdfWorkerUrl = '/pdfjs/pdf.worker.min.mjs';
export type ImportedArtwork={name:string;src:string;pw:number;ph:number;w:number;h:number;sourceKind:string;reviewRequired:boolean};
const MAX_PIXELS=40_000_000,MAX_PAGES=20;
function checkSize(w:number,h:number){if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>MAX_PIXELS)throw new Error('Each imported page must be under 40 megapixels at 300 DPI. Export a smaller page or crop the artwork first.');}
function canvas(w:number,h:number){checkSize(w,h);const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{colorSpace:'srgb'});if(!ctx)throw new Error('Could not create an image canvas. Try a desktop browser.');return{c,ctx};}
function output(c:HTMLCanvasElement,name:string,sourceKind:string,dpi=300):ImportedArtwork{const src=c.toDataURL('image/png');if(src==='data:,')throw new Error('Image exceeds this browser’s canvas limit. Use a desktop browser.');return{name,src,pw:c.width,ph:c.height,w:c.width/dpi,h:c.height/dpi,sourceKind,reviewRequired:sourceKind==='pdf'||sourceKind==='tiff'};}
export async function importArtwork(file:File,onProgress:(message:string)=>void=()=>{}):Promise<ImportedArtwork[]> {
 if(file.size>20*1024*1024)throw new Error('Maximum file size is 20 MB.');
 const ext=file.name.split('.').pop()?.toLowerCase(),buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer),out:ImportedArtwork[]=[];
 const isPDF=ext==='pdf'||file.type==='application/pdf';
 const isTIFF=['tif','tiff'].includes(ext||'')||['image/tiff','image/x-tiff'].includes(file.type);
 if(isPDF){
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=pdfWorkerUrl;
  const task=pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/'});
  let doc:Awaited<typeof task.promise>|null=null;
  try{
   doc=await task.promise;if(doc.numPages>MAX_PAGES)throw new Error('PDFs may contain up to 20 pages. Split the file before uploading.');
   let pixels=0;
   for(let n=1;n<=doc.numPages;n++){
    onProgress(`Rendering PDF page ${n} of ${doc.numPages}…`);
    const page=await doc.getPage(n),viewport=page.getViewport({scale:300/72});
    const w=Math.ceil(viewport.width),h=Math.ceil(viewport.height);checkSize(w,h);pixels+=w*h;if(pixels>120_000_000)throw new Error('This PDF contains too much artwork. Split it into smaller files.');
    const {c,ctx}=canvas(w,h);
    try{await page.render({canvas:null,canvasContext:ctx,viewport,background:'rgba(0,0,0,0)'}).promise;out.push(output(c,`${file.name} · page ${n}`,'pdf'));}
    finally{c.width=0;c.height=0;page.cleanup();}
   }
  }catch(e){if(e instanceof Error&&e.name==='PasswordException')throw new Error('This PDF is password-protected. Upload an unlocked copy.');throw e;}
  finally{await task.destroy();}
  return out;
 }
 if(isTIFF){
  const little=bytes[0]===73&&bytes[1]===73,big=bytes[0]===77&&bytes[1]===77;
  if(buffer.byteLength<8||(!little&&!big)||new DataView(buffer).getUint16(2,little)!==42)throw new Error('Upload a standard TIFF file. BigTIFF and RAW formats are not supported.');
  const {default:UTIF}=await import('utif');
  const pages=UTIF.decode(buffer);if(!pages.length||pages.length>MAX_PAGES)throw new Error('TIFF must contain 1–20 image pages.');let pixels=0;
  for(let i=0;i<pages.length;i++){
   const page=pages[i];const tag=(key:string,fallback:number)=>{const value=page[key];return Array.isArray(value)?Number(value[0]):fallback;};
   const w=tag('t256',0),h=tag('t257',0);checkSize(w,h);pixels+=w*h;if(pixels>120_000_000)throw new Error('This TIFF contains too much artwork. Split it into smaller files.');
   const compression=tag('t259',1),photo=tag('t262',2),bits=tag('t258',1),samples=tag('t277',photo===2?3:1);
   if(![1,3,4,5,6,7,8,32773].includes(compression)||tag('t284',1)!==1||tag('t339',1)!==1)throw new Error('This TIFF encoding is not supported. Export an RGB TIFF or PNG.');
   const supported=(photo===0&&[1,4,8].includes(bits))||(photo===1&&[1,2,8,16].includes(bits))||(photo===2&&[8,16].includes(bits)&&[3,4].includes(samples))||(photo===3&&bits===8)||(photo===5&&bits===8&&[4,5].includes(samples));
   if(!supported)throw new Error('Unsupported TIFF color format. Export an RGB TIFF or PNG.');
   onProgress(`Converting TIFF page ${i+1} of ${pages.length}…`);UTIF.decodeImage(buffer,page);
   if(!page.data?.length)throw new Error('The TIFF pixel data could not be decoded.');
   const rgba=UTIF.toRGBA8(page);
   if(tag('t338',0)===1&&samples===4&&photo===2){for(let p=0;p<rgba.length;p+=4){const alpha=rgba[p+3];if(alpha>0&&alpha<255)for(let ch=0;ch<3;ch++)rgba[p+ch]=Math.min(255,Math.round(rgba[p+ch]*255/alpha));}}
   const raw=canvas(w,h),image=raw.ctx.createImageData(w,h);image.data.set(rgba);raw.ctx.putImageData(image,0,0);
   const orientation=tag('t274',1),swap=orientation>=5&&orientation<=8,target=canvas(swap?h:w,swap?w:h);
   const transforms:Record<number,[number,number,number,number,number,number]>={1:[1,0,0,1,0,0],2:[-1,0,0,1,w,0],3:[-1,0,0,-1,w,h],4:[1,0,0,-1,0,h],5:[0,1,1,0,0,0],6:[0,1,-1,0,h,0],7:[0,-1,-1,0,h,w],8:[0,-1,1,0,0,w]};
   try{
    target.ctx.setTransform(...(transforms[orientation]||transforms[1]));target.ctx.drawImage(raw.c,0,0);
    const unit=tag('t296',1),resolution=Math.max(tag('t282',300),tag('t283',300))*(unit===3?2.54:1),dpi=unit!==1&&Number.isFinite(resolution)&&resolution>0?resolution:300;
    out.push(output(target.c,`${file.name}${pages.length>1?` · page ${i+1}`:''}`,'tiff',dpi));
   }finally{raw.c.width=0;raw.c.height=0;target.c.width=0;target.c.height=0;page.data=new Uint8Array(0);}
   await new Promise<void>(r=>setTimeout(r,0));
  }
  return out;
 }
 const type=file.type||({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'} as Record<string,string>)[ext||''];
 if(!['image/png','image/jpeg','image/webp'].includes(type))throw new Error('Use PNG, JPG, WebP, TIFF or PDF.');
 const src=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(new Blob([buffer],{type}));});
 const dimensions=await new Promise<{pw:number;ph:number}>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve({pw:img.naturalWidth,ph:img.naturalHeight});img.onerror=()=>reject(new Error('The image could not be opened.'));img.src=src;});
 checkSize(dimensions.pw,dimensions.ph);const w=Math.min(dimensions.pw/300,10);
 return[{name:file.name,src,...dimensions,w,h:w*dimensions.ph/dimensions.pw,sourceKind:'raster',reviewRequired:false}];
}
