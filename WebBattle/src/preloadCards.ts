import { DECK_FACES } from '../shared/rules.js';

export const CARD_FACE_URLS=[...new Set(DECK_FACES.map(card=>`/cards/${card.variant??card.kind}.webp`))];
let load:Promise<{failed:number}>|undefined;
let completed=0;
let failed=0;
const listeners=new Set<(done:number,total:number)=>void>();

export function preloadCardFaces(onProgress:(done:number,total:number)=>void):Promise<{failed:number}>{
 listeners.add(onProgress);
 onProgress(completed,CARD_FACE_URLS.length);
 if(!load){let next=0;
  const worker=async()=>{while(next<CARD_FACE_URLS.length){const url=CARD_FACE_URLS[next++];
   try{const response=await fetch(url,{cache:'force-cache'});await response.blob();if(!response.ok)failed++;}catch{failed++;}
   completed++;if(completed%4===0||completed===CARD_FACE_URLS.length)for(const listener of listeners)listener(completed,CARD_FACE_URLS.length);
  }};
  const workers=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches?2:4;
  load=Promise.all(Array.from({length:Math.min(workers,CARD_FACE_URLS.length)},worker)).then(()=>({failed}));
 }
 return load.finally(()=>listeners.delete(onProgress));
}
