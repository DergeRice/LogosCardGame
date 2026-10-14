import {normalizeSpeechText} from '../shared/chirp-audio.js';

type Manifest={version:number;voice:string;ids:string[]};
type Playback={stop:()=>void};
let manifest:Promise<Manifest|null>|null=null;

export function preloadChirpManifest(){
 return manifest??=fetch('/audio/chirp/manifest.json').then(async response=>{
  if(!response.ok)return null;
  const value=await response.json() as Manifest;
  return value.version===1&&Array.isArray(value.ids)?value:null;
 }).catch(()=>null);
}

async function speechId(text:string){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalizeSpeechText(text))));
 return Array.from(bytes.subarray(0,8),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function playChirpExample(text:string,onStart:()=>void,onEnd:()=>void,signal:AbortSignal):Promise<Playback|null>{
 const available=await Promise.race([preloadChirpManifest(),new Promise<null>(resolve=>setTimeout(()=>resolve(null),180))]);
 if(signal.aborted||!available?.ids.length)return null;
 const id=await speechId(text);
 if(signal.aborted||!available.ids.includes(id))return null;
 const audio=new Audio(`/audio/chirp/${id.slice(0,2)}/${id}.mp3`);
 audio.preload='auto';
 let started=false;
 audio.onplaying=()=>{if(!started&&!signal.aborted){started=true;onStart();}};
 audio.onended=()=>{if(!signal.aborted)onEnd();};
 const stop=()=>{audio.pause();audio.removeAttribute('src');audio.load();};
 signal.addEventListener('abort',stop,{once:true});
 try{await audio.play();if(signal.aborted){stop();return null;}return {stop};}
 catch{stop();return null;}
}
