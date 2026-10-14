import { DECK_FACES } from '../shared/rules.js';

export const CARD_FACE_URLS=[...new Set(DECK_FACES.map(card=>`/cards/${card.variant??card.kind}.webp`))];
const images:HTMLImageElement[]=[];
let load:Promise<{failed:number}>|undefined;
let completed=0;
let failed=0;
const listeners=new Set<(done:number,total:number)=>void>();

export function preloadCardFaces(onProgress:(done:number,total:number)=>void):Promise<{failed:number}>{
 listeners.add(onProgress);
 onProgress(completed,CARD_FACE_URLS.length);
 if(!load){let next=0;
  const worker=async()=>{while(next<CARD_FACE_URLS.length){const url=CARD_FACE_URLS[next++];await new Promise<void>(resolve=>{
   const img=new Image();images.push(img);
   const finish=(ok:boolean)=>{if(!ok)failed++;completed++;for(const listener of listeners)listener(completed,CARD_FACE_URLS.length);resolve();};
   img.onload=()=>{void img.decode().catch(()=>{}).then(()=>finish(true));};
   img.onerror=()=>finish(false);img.src=url;
  });}};
  load=Promise.all(Array.from({length:Math.min(4,CARD_FACE_URLS.length)},worker)).then(()=>({failed}));
 }
 return load.finally(()=>listeners.delete(onProgress));
}
