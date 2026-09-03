export const QUALITY_STATEMENT = 'I have reviewed this artwork and accept any visible blur, pixelation, backgrounds or color differences. Please print it as supplied.';
export type QualityApproval={accepted:boolean;acceptedAt:string|null;lowResolutionCount:number;convertedArtworkCount:number;lowestSourceDpi:number;statement:string};
export const SHOP_ORIGINS = ['https://iprintrush.com','https://www.iprintrush.com'];
export type ShopConnection = {origin:string;session:string};
export function isShopConnect(event: MessageEvent, parent: Window): boolean {
  return event.source===parent && SHOP_ORIGINS.includes(event.origin) && event.data?.type==='iprintrush:connect' && typeof event.data.session==='string' && event.data.session.length>=16;
}
export function sendPNGToShop(connection:ShopConnection, blob:Blob, name:string, length:number, signal?:AbortSignal,qualityApproval?:QualityApproval):Promise<'staged'|'uploaded'> {
  if(window.parent===window || !SHOP_ORIGINS.includes(connection.origin)) return Promise.reject(new Error('Open the builder inside iPrintRush to upload directly.'));
  return new Promise((resolve,reject)=>{
    let requestId = '';
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      requestId = crypto.randomUUID();
    } else {
      requestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    const cleanup=()=>{window.removeEventListener('message',receive);signal?.removeEventListener('abort',abort);clearTimeout(timer)};
    const abort=()=>{cleanup();reject(new DOMException('Upload cancelled. Check the website before retrying.','AbortError'))};
    const receive=(event:MessageEvent)=>{
      const d=event.data;
      if(event.source!==window.parent||event.origin!==connection.origin||d?.type!=='iprintrush:upload-result'||d.session!==connection.session||d.requestId!==requestId)return;
      cleanup();
      if(d.status==='staged'||d.status==='uploaded')resolve(d.status);
      else reject(new Error(typeof d.message==='string'?d.message:'The website could not accept your PNG. Download it and upload manually.'));
    };
    const timer=setTimeout(()=>{cleanup();reject(new Error('The website has not confirmed the upload. Check its Image Upload field before trying again.'))},90000);
    window.addEventListener('message',receive);signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted){abort();return;}
    try{window.parent.postMessage({type:'iprintrush:upload-png',session:connection.session,requestId,file:blob,name,qualityApproval,sheet:{widthInches:23,heightInches:length,dpi:300,widthPixels:6900,heightPixels:length*300}},connection.origin)}catch(e){cleanup();reject(e)}
  });
}
