import {unlockGameAudio} from './exampleAudio.js';
import {normalizeSpeechText} from '../shared/chirp-audio.js';
type Entry={text:string;file:string;duration:number};
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
  const entry=entries.get(normalizeSpeechText(text));if(!entry)return;
  const ctx=unlockGameAudio();if(!ctx||ctx.state!=='running')return;
  const response=await fetch('/audio/sentences/'+entry.file,{signal});if(!response.ok)throw Error('Sentence file unavailable');
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
