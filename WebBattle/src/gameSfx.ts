import {sfxGain} from './audioSettings.js';
import {unlockGameAudio} from './exampleAudio.js';
type Sound='score'|'deal';
const urls:Record<Sound,string>={score:'/audio/sfx/score-chime.wav',deal:'/audio/sfx/card-deal.wav'};
const bytes=new Map<Sound,Promise<ArrayBuffer>>(),buffers=new Map<Sound,Promise<AudioBuffer>>();
export function preloadGameSfx(){for(const name of Object.keys(urls) as Sound[]){if(!bytes.has(name))bytes.set(name,fetch(urls[name]).then(r=>{if(!r.ok)throw Error('SFX unavailable');return r.arrayBuffer()}));void bytes.get(name)!.catch(()=>bytes.delete(name));}}
function prepare(name:Sound,ctx:AudioContext){
 preloadGameSfx();if(!buffers.has(name))buffers.set(name,bytes.get(name)!.then(data=>ctx.decodeAudioData(data.slice(0))).then(raw=>{
  // Remove file padding and bound the tail so rapid score ticks remain distinct.
  const input=raw.getChannelData(0);let start=0;while(start<input.length&&Math.abs(input[start])<.001)start++;
  start=Math.max(0,start-Math.round(raw.sampleRate*.003));const length=Math.min(raw.length-start,Math.round(raw.sampleRate*(name==='score'?.22:.14)));
  const clip=ctx.createBuffer(raw.numberOfChannels,Math.max(1,length),raw.sampleRate),fade=Math.round(raw.sampleRate*.012);
  for(let c=0;c<raw.numberOfChannels;c++){const out=clip.getChannelData(c);out.set(raw.getChannelData(c).subarray(start,start+length));for(let i=0;i<Math.min(fade,out.length);i++)out[out.length-1-i]*=i/fade;}
  return clip;
 }).catch(error=>{buffers.delete(name);throw error}));return buffers.get(name)!;
}
export function warmGameSfx(){const ctx=unlockGameAudio();return ctx?Promise.all((Object.keys(urls) as Sound[]).map(name=>prepare(name,ctx).catch(()=>null))).then(()=>{}):Promise.resolve();}
function start(ctx:AudioContext,buffer:AudioBuffer,when:number,volume:number){const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=sfxGain(volume);source.connect(gain);gain.connect(ctx.destination);source.onended=()=>{source.disconnect();gain.disconnect()};source.start(when);return source;}
export function playGameSfx(name:Sound,volume=.3){const requested=performance.now(),ctx=unlockGameAudio();if(!ctx)return;void prepare(name,ctx).then(buffer=>{if(ctx.state==='running'&&document.visibilityState!=='hidden'&&performance.now()-requested<100)start(ctx,buffer,ctx.currentTime,volume)}).catch(()=>{});}
export function scoreChimeDelays(started:number,duration:number,count:number,now:number){return Array.from({length:count},(_,i)=>started+duration*(i+1)/Math.max(1,count)-now).filter(delay=>delay>=-35).map(delay=>Math.max(0,delay)/1000);}
export function scheduleScoreChimes(started:number,duration:number,count:number){
 let cancelled=false;const sources:AudioBufferSourceNode[]=[],ctx=unlockGameAudio();
 if(ctx)void prepare('score',ctx).then(buffer=>{if(cancelled||ctx.state!=='running'||document.visibilityState==='hidden')return;const clock=ctx.currentTime;for(const delay of scoreChimeDelays(started,duration,count,performance.now()))sources.push(start(ctx,buffer,clock+delay,.26))}).catch(()=>{});
 return ()=>{cancelled=true;for(const source of sources){try{source.stop()}catch{}source.disconnect()}};
}
