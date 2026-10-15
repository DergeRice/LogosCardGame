import {unlockGameAudio} from './exampleAudio.js';
import {normalizeSpeechText} from '../shared/chirp-audio.js';
type Entry={text:string;file:string;duration:number};
export const SENTENCE_AUDIO_ORIGIN=(import.meta.env.VITE_SENTENCE_AUDIO_ORIGIN??'https://logos-card-audio.jesus-and-children-ranking-worker.workers.dev').replace(/\/$/,'');
let manifest:Promise<Map<string,Entry>>|undefined;
/** Optional metadata only. Never part of game readiness. */
export function preloadSentenceVoice(){
 if(manifest)return manifest;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1500);
 return manifest=fetch('/audio/sentences/manifest.json',{signal:controller.signal}).then(async r=>{
  if(!r.ok)throw Error('Sentence manifest unavailable');
  const data=await r.json() as {entries:Entry[]};
  return new Map(data.entries.map(e=>[normalizeSpeechText(e.text),e]));
 }).catch(()=>{manifest=undefined;return new Map<string,Entry>()}).finally(()=>clearTimeout(timer));
}
/** Static whole-sentence files only. No model, system TTS, or word stitching fallback. */
export function playSentenceExample(text:string,onStart:()=>void,onEnd:()=>void){
 const controller=new AbortController(),{signal}=controller;
 let source:AudioBufferSourceNode|null=null;
 let startup:ReturnType<typeof setTimeout>|undefined;
 const stop=()=>{controller.abort();clearTimeout(startup);if(source){source.onended=null;try{source.stop();source.disconnect()}catch{}}};
 const done=(async()=>{
  // Hard deadline includes manifest lookup, download, decoding and autoplay permission.
  startup=setTimeout(stop,1500);
  const entries=await preloadSentenceVoice();if(signal.aborted)return;
  const normalized=normalizeSpeechText(text),entry=entries.get(normalized);
  // Identical text/voice/speed hash to the offline generator; no 24k-row manifest download.
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('kokoro-v1.0/af_heart/1.0/'+normalized));
  const key=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('').slice(0,20);
  if(signal.aborted)return;
  const audioUrl=entry?'/audio/sentences/'+entry.file:SENTENCE_AUDIO_ORIGIN+'/kokoro-afheart-v1/'+key+'.mp3';
  const ctx=unlockGameAudio();if(!ctx)return;
  // Safari/Android may finish resuming asynchronously after a touch or interruption.
  // The existing startup deadline still cancels a blocked permission request.
  if(ctx.state!=='running')await ctx.resume();
  if(signal.aborted||ctx.state!=='running')return;
  const response=await fetch(audioUrl,{signal});if(!response.ok)throw Error('Sentence file unavailable');
  const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(signal.aborted||ctx.state!=='running')return;
  if(buffer.duration>20)throw Error('Sentence file too long');
  await new Promise<void>((resolve,reject)=>{
   source=ctx.createBufferSource();source.buffer=buffer;source.connect(ctx.destination);
   const abort=()=>reject(new DOMException('Aborted','AbortError'));signal.addEventListener('abort',abort,{once:true});
   source.onended=()=>{signal.removeEventListener('abort',abort);source?.disconnect();if(!signal.aborted)onEnd();resolve()};
   source.start();clearTimeout(startup);onStart();
  });
 })().finally(()=>clearTimeout(startup));
 return {done,stop};
}
