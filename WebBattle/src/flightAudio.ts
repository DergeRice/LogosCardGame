import {unlockGameAudio} from './exampleAudio.js';

type Manifest={sampleRate:number;segments:Record<string,{start:number;length:number}>;clips:Record<string,string>};
type VoicePack={manifest:Manifest;buffer:AudioBuffer|null};
let pack:Promise<VoicePack>|undefined;
let active:AudioBufferSourceNode|null=null,activeElement:HTMLAudioElement|null=null,activeDone:(()=>void)|null=null,request=0;

// Download and decode the complete recorded vocabulary before enabling Start.
// Gate transitions use offsets into this resident buffer, so they never fetch a word.
export function preloadFlightAudio(){
 return pack??=Promise.all([fetch('/audio/flight/manifest-v2.json'),fetch('/audio/flight/flight-voice-v2.wav')]).then(async([manifestResponse,voiceResponse])=>{
  if(!manifestResponse.ok||!voiceResponse.ok)throw Error('Flight recordings unavailable');
  const manifest=await manifestResponse.json() as Manifest,bytes=await voiceResponse.arrayBuffer();
  const context=unlockGameAudio();
  return {manifest,buffer:context?await context.decodeAudioData(bytes):null};
 }).catch(error=>{pack=undefined;throw error;});
}

export function prepareFlightAudio(){unlockGameAudio();void preloadFlightAudio().catch(()=>{});}
export function stopFlightAudio(){request++;if(active){try{active.stop()}catch{}active=null;}if(activeElement){activeElement.pause();activeElement=null;}activeDone?.();activeDone=null;}

async function playElement(word:string,current:number,manifest:Manifest){
 const name=manifest.clips[word];if(!name||current!==request)return;
 await new Promise<void>(resolve=>{
  const element=new Audio('/audio/flight/clips/'+name);activeElement=element;
  const done=()=>{element.onended=null;element.onerror=null;if(activeElement===element)activeElement=null;if(activeDone===done)activeDone=null;resolve();};
  activeDone=done;element.onended=done;element.onerror=done;void element.play().catch(done);
 });
}

export async function playFlightAudioSequence(words:readonly string[]){
 stopFlightAudio();const current=++request;
 try{
  const {manifest,buffer}=await preloadFlightAudio();if(current!==request)return;
  const context=unlockGameAudio();
  if(context&&buffer&&context.state!=='running')await context.resume();
  for(const word of words){
   if(current!==request)return;
   const segment=manifest.segments[word];if(!segment)continue;
   if(context?.state==='running'&&buffer){
    await new Promise<void>(resolve=>{
     const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
     const done=()=>{source.onended=null;source.disconnect();if(active===source)active=null;if(activeDone===done)activeDone=null;resolve();};
     active=source;activeDone=done;source.onended=done;
     source.start(0,segment.start/manifest.sampleRate,segment.length/manifest.sampleRate);
    });
   }else await playElement(word,current,manifest);
  }
 }catch{/* A missing recording must not interrupt the flight controls. */}
}
