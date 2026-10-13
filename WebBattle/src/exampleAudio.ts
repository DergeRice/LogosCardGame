import {exampleAudioTokens} from '../shared/example-audio.js';
type Manifest={sampleRate:number;segments:Record<string,{start:number;length:number}>};
let context:AudioContext|null=null,warmed=false;
let assets:Promise<{manifest:Manifest;bytes:ArrayBuffer}>|null=null;
let decoded:Promise<{manifest:Manifest;buffer:AudioBuffer}>|null=null;
export function unlockGameAudio():AudioContext|null{
 try{
  const Constructor=window.AudioContext??(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!Constructor)return null;context??=new Constructor();void context.resume().catch(()=>{});
  if(!warmed){const source=context.createBufferSource();source.buffer=context.createBuffer(1,1,context.sampleRate);source.connect(context.destination);source.start();warmed=true;}
  return context;
 }catch{return null;}
}
export function preloadExampleAudio(){
 assets??=Promise.all([fetch('/audio/examples/manifest-v1.json'),fetch('/audio/examples/voice-v1.wav')]).then(async([m,a])=>{if(!m.ok||!a.ok)throw Error('음성 파일을 불러오지 못했습니다.');return {manifest:await m.json() as Manifest,bytes:await a.arrayBuffer()};}).catch(error=>{assets=null;throw error});
 return assets;
}
export function playRecordedExample(text:string,onStart:()=>void,onEnd:()=>void){
 let source:AudioBufferSourceNode|null=null,cancelled=false;
 const done=(async()=>{
  const ctx=context;if(!ctx||ctx.state!=='running')throw Error('gesture-required');
  decoded??=preloadExampleAudio().then(async({manifest,bytes})=>({manifest,buffer:await ctx.decodeAudioData(bytes.slice(0))})).catch(error=>{decoded=null;throw error});
  const {manifest,buffer}=await decoded;if(cancelled)return;
  const words=exampleAudioTokens(text);if(!words.length)throw Error('empty-example');
  const clips=words.map(word=>{const part=manifest.segments[word];if(!part)throw Error('음성 단어 누락: '+word);const scale=buffer.sampleRate/manifest.sampleRate;return {start:Math.round(part.start*scale),length:Math.round(part.length*scale)};});
  const gap=Math.round(buffer.sampleRate*.035),length=clips.reduce((sum,c)=>sum+c.length+gap,0);const sentence=ctx.createBuffer(1,length,buffer.sampleRate),out=sentence.getChannelData(0),input=buffer.getChannelData(0);let offset=0;
  for(const clip of clips){out.set(input.subarray(clip.start,clip.start+clip.length),offset);offset+=clip.length+gap;}
  if(ctx.state!=='running')throw Error('gesture-required');
  source=ctx.createBufferSource();source.buffer=sentence;source.connect(ctx.destination);source.onended=()=>{source?.disconnect();if(!cancelled)onEnd()};source.start();onStart();
 })();
 return {done,stop(){cancelled=true;if(source){source.onended=null;try{source.stop();source.disconnect()}catch{}}}};
}
