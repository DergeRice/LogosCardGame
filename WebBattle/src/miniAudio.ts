import {unlockGameAudio} from './exampleAudio.js';

type Manifest={clips:Record<string,string>};
let manifest:Promise<Manifest>|null=null;
const files=new Map<string,Promise<ArrayBuffer>>();
const buffers=new Map<string,Promise<AudioBuffer>>();
let active:AudioBufferSourceNode|null=null;
let request=0;

export function preloadMiniAudio(){
 manifest??=fetch('/audio/mini/manifest-v2.json').then(async response=>{
  if(!response.ok)throw Error('Mini-game audio manifest unavailable');
  return await response.json() as Manifest;
 }).catch(error=>{manifest=null;throw error});
 return manifest;
}
export function prepareMiniAudio(){unlockGameAudio();void preloadMiniAudio().catch(()=>{});}
function file(word:string){
 let cached=files.get(word);if(cached)return cached;
 cached=(async()=>{
  const list=await preloadMiniAudio();if(!list.clips[word])throw Error('Recorded mini-game clip unavailable: '+word);
  const response=await fetch('/audio/mini/clips/'+list.clips[word]);
  if(!response.ok)throw Error('Recorded mini-game clip unavailable: '+word);
  return await response.arrayBuffer();
 })().catch(error=>{files.delete(word);throw error});
 files.set(word,cached);return cached;
}
function clip(word:string,context:AudioContext){
 let cached=buffers.get(word);if(cached)return cached;
 cached=(async()=>{
  return await context.decodeAudioData((await file(word)).slice(0));
 })().catch(error=>{buffers.delete(word);throw error});
 buffers.set(word,cached);return cached;
}
export function preloadMiniClips(words:readonly string[]){
 const context=unlockGameAudio();
 words.forEach((word,index)=>{void file(word).catch(()=>{});if(context&&index<3)void clip(word,context).catch(()=>{});});
}
export function stopMiniAudio(){request++;if(active){active.onended=null;try{active.stop()}catch{}active.disconnect();active=null;}}
export async function playMiniAudio(word:string){
 stopMiniAudio();const current=++request,context=unlockGameAudio();if(!context)return;
 try{
  const buffer=await clip(word,context);if(current!==request||context.state!=='running')return;
  const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
  source.onended=()=>{source.disconnect();if(active===source)active=null};
  active=source;source.start();
 }catch{ /* Offline audio never blocks card input. */ }
}
