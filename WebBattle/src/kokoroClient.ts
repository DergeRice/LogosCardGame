import {normalizeSpeechText} from '../shared/chirp-audio.js';
const CACHE='logos-kokoro-generated-q8-afheart-v1',MAX_ENTRIES=32;
let runningId:string|undefined;let worker:Worker|undefined,idle:ReturnType<typeof setTimeout>|undefined;
const tasks=new Map<string,{resolve:(wav:ArrayBuffer)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
const active=new Map<string,Promise<{bytes:ArrayBuffer;url:string}>>();
function reset(error:Error){clearTimeout(idle);worker?.terminate();worker=undefined;runningId=undefined;for(const task of tasks.values()){clearTimeout(task.timer);task.reject(error);}tasks.clear();}
function getWorker(){clearTimeout(idle);if(worker)return worker;worker=new Worker(new URL('./kokoro.worker.ts',import.meta.url),{type:'module'});worker.onmessage=event=>{if(event.data.type==='started'){if(tasks.has(event.data.id))runningId=event.data.id;return;}const task=tasks.get(event.data.id);if(!task)return;clearTimeout(task.timer);tasks.delete(event.data.id);if(runningId===event.data.id)runningId=tasks.keys().next().value;if(event.data.error)task.reject(Error(event.data.error));else task.resolve(event.data.wav);if(!tasks.size)idle=setTimeout(()=>{if(!tasks.size){worker?.terminate();worker=undefined;}},60000);};worker.onerror=()=>reset(Error('Kokoro worker failed'));return worker;}
/** Whole sentence in one Kokoro inference, never word splicing or native TTS. */
export function generateKokoroAudio(text:string){
 const normalized=normalizeSpeechText(text);const existing=active.get(normalized);if(existing)return existing;
 const task=(async()=>{
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalized))),v=>v.toString(16).padStart(2,'0')).join(''),url=location.origin+'/__kokoro_cache__/'+hash+'.wav';
  let cache:Cache|undefined;try{cache=await caches.open(CACHE);const hit=await cache.match(url);if(hit)return {bytes:await hit.arrayBuffer(),url:'kokoro-cache:'+hash};}catch{}
  if(tasks.size>=2){const pending=[...tasks.keys()].find(id=>id!==runningId);if(pending){const old=tasks.get(pending)!;clearTimeout(old.timer);tasks.delete(pending);old.reject(Error('Superseded by a newer sentence'));worker?.postMessage({type:'cancel',id:pending});}}
  const engine=getWorker(),id=crypto.randomUUID(),bytes=await new Promise<ArrayBuffer>((resolve,reject)=>{const timer=setTimeout(()=>reset(Error('Kokoro generation timed out')),90000);tasks.set(id,{resolve,reject,timer});runningId??=id;engine.postMessage({type:'generate',id,text:normalized});});
  if(!bytes.byteLength)throw Error('Kokoro returned empty audio');
  if(cache)try{await cache.put(url,new Response(bytes.slice(0),{headers:{'Content-Type':'audio/wav'}}));const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-MAX_ENTRIES)))await cache.delete(key);}catch{}
  return {bytes,url:'kokoro-generated:'+hash};
 })().finally(()=>active.delete(normalized));active.set(normalized,task);return task;
}
