import {unlockGameAudio} from './exampleAudio.js';

type Manifest={clips:Record<string,string>};
let manifest:Promise<Manifest>|undefined;
const files=new Map<string,Promise<ArrayBuffer>>();
const buffers=new Map<string,Promise<AudioBuffer>>();
let active:AudioBufferSourceNode|null=null,activeElement:HTMLAudioElement|null=null,activeDone:(()=>void)|null=null,request=0;

export function preloadFlightAudio(){
 return manifest??=fetch('/audio/flight/manifest-v1.json').then(async response=>{
  if(!response.ok)throw Error('Flight recordings unavailable');
  return await response.json() as Manifest;
 }).catch(error=>{manifest=undefined;throw error;});
}

async function file(word:string){
 let cached=files.get(word);if(cached)return cached;
 cached=(async()=>{
  const list=await preloadFlightAudio(),name=list.clips[word];
  if(!name)throw Error('Flight recording missing: '+word);
  const response=await fetch('/audio/flight/clips/'+name);
  if(!response.ok)throw Error('Flight recording unavailable: '+word);
  return await response.arrayBuffer();
 })().catch(error=>{files.delete(word);throw error;});
 files.set(word,cached);return cached;
}

async function clip(word:string,context:AudioContext){
 let cached=buffers.get(word);if(cached)return cached;
 cached=context.decodeAudioData((await file(word)).slice(0)).catch(error=>{buffers.delete(word);throw error;});
 buffers.set(word,cached);return cached;
}

export function prepareFlightAudio(){unlockGameAudio();void preloadFlightAudio().catch(()=>{});}
export function preloadFlightClips(words:readonly string[]){const context=unlockGameAudio();for(const word of words){void file(word).catch(()=>{});if(context)void clip(word,context).catch(()=>{});}}
export function stopFlightAudio(){request++;if(active){try{active.stop()}catch{}active=null;}if(activeElement){activeElement.pause();activeElement=null;}activeDone?.();activeDone=null;}
async function playElement(word:string,current:number){
 const list=await preloadFlightAudio(),name=list.clips[word];if(!name||current!==request)return;
 await new Promise<void>(resolve=>{
  const element=new Audio('/audio/flight/clips/'+name);activeElement=element;
  const done=()=>{element.onended=null;element.onerror=null;if(activeElement===element)activeElement=null;if(activeDone===done)activeDone=null;resolve();};
  activeDone=done;element.onended=done;element.onerror=done;void element.play().catch(done);
 });
}
export async function playFlightAudioSequence(words:readonly string[]){
 stopFlightAudio();const current=++request,context=unlockGameAudio();
 for(const word of words){
  try{
   if(context){
    const buffer=await clip(word,context);if(current!==request)return;
    if(context.state!=='running')await context.resume();
    if(current!==request)return;
    if(context.state==='running')await new Promise<void>(resolve=>{const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.onended=()=>{source.disconnect();if(active===source)active=null;resolve();};active=source;source.start();});
    else await playElement(word,current);
   }else await playElement(word,current);
   if(current!==request)return;
  }catch{try{await playElement(word,current);}catch{return;}}
 }
}
