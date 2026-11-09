import {unlockGameAudio} from './exampleAudio.js';

type Manifest={sampleRate:number;segments:Record<string,{start:number;length:number}>};
let assets:Promise<{manifest:Manifest;bytes:ArrayBuffer}>|null=null;
let decoded:Promise<{manifest:Manifest;buffer:AudioBuffer}>|null=null;
let active:AudioBufferSourceNode|null=null;
let request=0;

export function preloadMiniAudio(){
 assets??=Promise.all([fetch('/audio/mini/manifest-v1.json'),fetch('/audio/mini/voice-v1.wav')]).then(async([manifest,audio])=>{
  if(!manifest.ok||!audio.ok)throw Error('Mini-game recorded audio unavailable');
  return {manifest:await manifest.json() as Manifest,bytes:await audio.arrayBuffer()};
 }).catch(error=>{assets=null;throw error});
 return assets;
}
export function prepareMiniAudio(){
 const context=unlockGameAudio();if(!context)return;
 decoded??=preloadMiniAudio().then(async({manifest,bytes})=>({manifest,buffer:await context.decodeAudioData(bytes.slice(0))})).catch(error=>{decoded=null;throw error});
 void decoded.catch(()=>{});
}
export function stopMiniAudio(){request++;if(active){active.onended=null;try{active.stop()}catch{}active.disconnect();active=null;}}
export async function playMiniAudio(word:string){
 stopMiniAudio();const current=++request,context=unlockGameAudio();if(!context)return;
 prepareMiniAudio();
 try{
  const {manifest,buffer}=await decoded!;if(current!==request)return;
  const segment=manifest.segments[word];if(!segment||context.state!=='running')return;
  const source=context.createBufferSource();
  source.buffer=buffer;source.connect(context.destination);
  source.onended=()=>{source.disconnect();if(active===source)active=null};
  active=source;source.start(0,segment.start/manifest.sampleRate,segment.length/manifest.sampleRate);
 }catch{ /* Recorded clips may be unavailable offline; gameplay still works without voice. */ }
}
