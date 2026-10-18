import {unlockGameAudio} from './exampleAudio.js';
import {normalizeSpeechText} from '../shared/chirp-audio.js';
type Entry={text:string;file:string;duration:number};
export const SENTENCE_AUDIO_ORIGIN=(import.meta.env.VITE_SENTENCE_AUDIO_ORIGIN??'https://logos-card-audio.jesus-and-children-ranking-worker.workers.dev').replace(/\/$/,'');
let manifest:Promise<Map<string,Entry>>|undefined;
/** Optional metadata only. Never part of game readiness. */
export function preloadSentenceVoice(){
 if(manifest)return manifest;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
 return manifest=fetch('/audio/sentences/manifest.json',{signal:controller.signal,cache:'no-cache'}).then(async r=>{
  if(!r.ok)throw Error('Sentence manifest unavailable');
  const data=await r.json() as {entries:Entry[]};
  return new Map(data.entries.map(e=>[normalizeSpeechText(e.text),e]));
 }).catch(()=>{manifest=undefined;return new Map<string,Entry>()}).finally(()=>clearTimeout(timer));
}
export type VoiceCode='loading'|'playing'|'ended'|'blocked'|'missing'|'network'|'decode'|'unsupported'|'timeout'|'cancelled';
export type VoiceStatus={code:VoiceCode;url?:string;http?:number;context?:string;duration?:number;peak?:number;elapsedMs?:number;sentence?:string;stage?:string};
const files=new Map<string,Promise<{bytes:ArrayBuffer;url:string}>>();
/** The static pack is preferred. A device English voice keeps an uncovered sentence audible until its Chirp file is added. */
function speakDeviceFallback(text:string,onStart:()=>void,onEnd:()=>void,report:(code:VoiceCode,details?:Partial<VoiceStatus>)=>void,signal:AbortSignal){
 return new Promise<void>((resolve,reject)=>{
  if(typeof speechSynthesis==='undefined'||typeof SpeechSynthesisUtterance==='undefined')return reject(new VoiceError('missing'));
  if(signal.aborted)return resolve();
  try{
   const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=.9;utterance.pitch=1;
   const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort)};
   const abort=()=>{cleanup();utterance.onstart=null;utterance.onend=null;utterance.onerror=null;speechSynthesis.cancel();resolve()};
   const timer=setTimeout(()=>{cleanup();speechSynthesis.cancel();reject(new VoiceError('timeout'));},35000);
   signal.addEventListener('abort',abort,{once:true});
   utterance.onstart=()=>{if(signal.aborted)return;speechSynthesis.resume();report('playing',{context:'device_english_fallback'});onStart();};
   utterance.onend=()=>{cleanup();if(!signal.aborted){report('ended',{context:'device_english_fallback'});onEnd();}resolve();};
   utterance.onerror=(event)=>{cleanup();reject(new VoiceError(event.error==='not-allowed'?'blocked':'missing'));};
   speechSynthesis.cancel();speechSynthesis.speak(utterance);
  }catch{reject(new VoiceError('missing'));}
 });
}
class VoiceError extends Error{constructor(public code:VoiceCode,public http?:number,public url?:string){super(code)}}
async function sentenceFiles(text:string){
 const normalized=normalizeSpeechText(text);
 const entries=await preloadSentenceVoice();
 const digest=async(value:string)=>(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join(''));
 const entry=entries.get(normalized);
 const key=(await digest('kokoro-v1.0/af_heart/1.0/'+normalized)).slice(0,20);
 return [...(entry?['/audio/sentences/'+entry.file]:[]),SENTENCE_AUDIO_ORIGIN+'/kokoro-afheart-v1/'+key+'.mp3'];
}
export function prefetchSentenceAudio(text:string){
 const key=normalizeSpeechText(text);let task=files.get(key);if(task)return task;
 task=(async()=>{let failure:VoiceError|undefined;
  for(let round=0;round<2;round++){
   const urls=await sentenceFiles(text);
   for(const url of urls){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
    try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new VoiceError(response.status===404?'missing':'network',response.status,url);
     const type=response.headers.get('Content-Type')??'';if(!type.startsWith('audio/'))throw new VoiceError('decode',response.status,url);
     const bytes=await response.arrayBuffer();if(!bytes.byteLength)throw new VoiceError('decode',response.status,url);return {bytes,url};
    }catch(error){failure=error instanceof VoiceError?error:new VoiceError(controller.signal.aborted?'timeout':'network',undefined,url)}finally{clearTimeout(timer)}
   }
   // Only retry once with refreshed metadata; stale deploys may introduce a local supplement.
   if(round===0&&failure?.code==='missing'){manifest=undefined;continue;}break;
  }
  throw failure??new VoiceError('missing');
 })().catch(error=>{files.delete(key);throw error});files.set(key,task);if(files.size>24)files.delete(files.keys().next().value!);return task;
}
/** Whole-sentence Kokoro static/R2 recordings, then a cancellable device-voice fallback. */
export function playSentenceExample(text:string,onStart:()=>void,onEnd:()=>void,onStatus?:(state:VoiceStatus)=>void){
 const controller=new AbortController();
 let watchdog:ReturnType<typeof setTimeout>|undefined;let source:AudioBufferSourceNode|null=null,cancelled=false,settle:(()=>void)|undefined;
 const started=performance.now(),ctx=unlockGameAudio(); // Synchronously inside a replay tap when permission is needed.
 const report=(code:VoiceCode,details:Partial<VoiceStatus>={})=>{if(!cancelled){const state={code,sentence:normalizeSpeechText(text),context:ctx?.state,elapsedMs:Math.round(performance.now()-started),...details};onStatus?.(state);window.dispatchEvent(new CustomEvent('logos-voice-status',{detail:state}));}};
 const done=(async()=>{
 try{
  report('loading');if(!ctx)throw new VoiceError('unsupported');
  const file=await prefetchSentenceAudio(text);if(cancelled)return;
  if(ctx.state!=='running'){void ctx.resume().catch(()=>{});await Promise.race([new Promise<void>(resolve=>{const check=()=>{if(ctx.state==='running'){ctx.removeEventListener('statechange',check);resolve()}};ctx.addEventListener('statechange',check);setTimeout(()=>{ctx.removeEventListener('statechange',check);resolve()},1200);check()}),new Promise<void>(resolve=>setTimeout(resolve,1300))]);}
  if(cancelled)return;if(ctx.state!=='running')throw new VoiceError('blocked');
  let buffer:AudioBuffer;try{buffer=await new Promise<AudioBuffer>((resolve,reject)=>{const timer=setTimeout(()=>reject(new VoiceError('timeout',undefined,file.url)),5000);ctx.decodeAudioData(file.bytes.slice(0)).then(value=>{clearTimeout(timer);resolve(value)},()=>{clearTimeout(timer);reject(new VoiceError('decode',undefined,file.url))});})}catch(error){throw error instanceof VoiceError?error:new VoiceError('decode',undefined,file.url)}
  if(cancelled)return;if(ctx.state!=='running')throw new VoiceError('blocked');
  if(buffer.duration>30||buffer.duration<=0)throw new VoiceError('decode');
  let peak=0;for(const sample of buffer.getChannelData(0))peak=Math.max(peak,Math.abs(sample));if(peak<.001)throw new VoiceError('decode');
  await new Promise<void>((resolve,reject)=>{
   settle=resolve;source=ctx.createBufferSource();source.buffer=buffer;source.connect(ctx.destination);
   const timeout=watchdog=setTimeout(()=>{if(source)source.onended=null;try{source?.stop();source?.disconnect()}catch{}reject(new VoiceError(ctx.state==='running'?'timeout':'blocked'))},buffer.duration*1000+5000);
   source.onended=()=>{clearTimeout(timeout);source?.disconnect();if(!cancelled){report('ended',{url:file.url,duration:buffer.duration,peak});onEnd()}resolve()};
   try{source.start();report('playing',{url:file.url,duration:buffer.duration,peak});onStart()}catch{clearTimeout(timeout);reject(new VoiceError('blocked'))}
  });
 }catch(error){
  // A generated sentence can fall outside the static catalog. Keep the game audible instead of presenting a dead replay button.
  if(!cancelled&&error instanceof VoiceError&&(error.code==='missing'||error.code==='network'||error.code==='timeout'||error.code==='unsupported')){
   try{return await speakDeviceFallback(normalizeSpeechText(text),onStart,onEnd,report,controller.signal)}catch(fallbackError){if(fallbackError instanceof VoiceError&&fallbackError.code!=='missing')error=fallbackError;}
  }
  if(!cancelled)report(error instanceof VoiceError?error.code:'network',{http:error instanceof VoiceError?error.http:undefined,url:error instanceof VoiceError?error.url:undefined});throw error;
 }
 })();
 return {done,stop(){cancelled=true;controller.abort();clearTimeout(watchdog);if(source){source.onended=null;try{source.stop();source.disconnect()}catch{}}settle?.()}};
}
