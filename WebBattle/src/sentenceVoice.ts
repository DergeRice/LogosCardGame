import {unlockGameAudio} from './exampleAudio.js';
import {normalizeSpeechText} from '../shared/chirp-audio.js';
type Entry={text:string;file:string};
let manifest:Promise<Map<string,string>>|undefined;
export function preloadSentenceVoice(){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
 if(manifest){clearTimeout(timer);return manifest;}
 return manifest=fetch('/audio/sentences/manifest.json',{signal:controller.signal}).then(async r=>{
  if(!r.ok)throw Error('Sentence manifest unavailable');
  const data=await r.json() as {entries:Entry[]};
  return new Map(data.entries.map(e=>[normalizeSpeechText(e.text),e.file]));
 }).catch(()=>{manifest=undefined;return new Map<string,string>()}).finally(()=>clearTimeout(timer));
}
/** Entire-utterance inference, never concatenated word recordings. */
export function synthesizeSentence(text:string,signal:AbortSignal,onProgress:(text:string)=>void=()=>{}){
 return new Promise<Blob>((resolve,reject)=>{
  if(signal.aborted){reject(new DOMException('Aborted','AbortError'));return;}
  const worker=new Worker(new URL('./sentenceVoice.worker.ts',import.meta.url),{type:'module'});
  const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);worker.terminate()};
  const abort=()=>{finish();reject(new DOMException('Aborted','AbortError'))};
  const timer=setTimeout(()=>{finish();reject(Error('음성 준비 시간이 초과되었습니다. 다시 눌러주세요.'))},90000);
  signal.addEventListener('abort',abort,{once:true});
  worker.onerror=e=>{finish();reject(Error(e.message||'Sentence voice failed'))};
  worker.onmessage=(event:MessageEvent<{type:string;loaded:number;total:number;wav:Blob;message:string}>)=>{
   const data=event.data;
   if(data.type==='progress')onProgress(data.total>0?`음성 준비 중 ${Math.min(100,Math.round(data.loaded/data.total*100))}%`:'음성 준비 중…');
   if(data.type==='audio'){finish();resolve(data.wav);}
   if(data.type==='error'){finish();reject(Error(data.message));}
  };
  onProgress('문장 음성 준비 중…');worker.postMessage(text);
 });
}
async function nativeSentence(text:string,signal:AbortSignal,onStart:()=>void,onEnd:()=>void){
 const synth=window.speechSynthesis;
 if(!synth||typeof SpeechSynthesisUtterance==='undefined')throw Error('Native voice unavailable');
 let voices=synth.getVoices().filter(v=>/^en[-_]/i.test(v.lang));
 if(!voices.length){await new Promise(r=>setTimeout(r,250));voices=synth.getVoices().filter(v=>/^en[-_]/i.test(v.lang));}
 if(!voices.length)throw Error('English voice unavailable');
 return new Promise<void>((resolve,reject)=>{
  if(signal.aborted){reject(new DOMException('Aborted','AbortError'));return;}
  let started=false;const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=.92;
  utterance.voice=voices.find(v=>v.lang==='en-US'&&v.localService)??voices.find(v=>v.lang==='en-US')??voices[0];
  const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);utterance.onend=null;utterance.onerror=null;utterance.onstart=null};
  const abort=()=>{cleanup();synth.cancel();reject(new DOMException('Aborted','AbortError'))};
  let timer=setTimeout(()=>{cleanup();synth.cancel();reject(Error('Native voice did not start'))},2500);
  signal.addEventListener('abort',abort,{once:true});
  utterance.onstart=()=>{if(signal.aborted)return;started=true;clearTimeout(timer);timer=setTimeout(()=>{cleanup();synth.cancel();reject(Error('Native voice did not finish'))},45000);onStart()};
  utterance.onend=()=>{cleanup();if(started&&!signal.aborted){onEnd();resolve()}else reject(Error('Native voice did not play'))};
  utterance.onerror=()=>{cleanup();reject(Error('Native voice unavailable'))};
  synth.cancel();synth.speak(utterance);synth.resume();
 });
}
export function playSentenceExample(text:string,onStart:()=>void,onEnd:()=>void,onStatus:(text:string)=>void=()=>{}){
 const controller=new AbortController(),{signal}=controller;
 let source:AudioBufferSourceNode|null=null;
 const play=async(blob:Blob)=>{
  const ctx=unlockGameAudio();if(!ctx||ctx.state!=='running')throw Error('gesture-required');
  const buffer=await ctx.decodeAudioData(await blob.arrayBuffer());if(signal.aborted)return;
  if(ctx.state!=='running')throw Error('gesture-required');
  await new Promise<void>((resolve,reject)=>{
   source=ctx.createBufferSource();source.buffer=buffer;source.connect(ctx.destination);
   const abort=()=>{if(source){source.onended=null;try{source.stop();source.disconnect()}catch{}}reject(new DOMException('Aborted','AbortError'))};
   signal.addEventListener('abort',abort,{once:true});
   source.onended=()=>{signal.removeEventListener('abort',abort);source?.disconnect();if(!signal.aborted)onEnd();resolve()};
   source.start();onStatus('');onStart();
  });
 };
 const done=(async()=>{
  const entries=await preloadSentenceVoice();if(signal.aborted)return;
  const file=entries.get(normalizeSpeechText(text));
  if(file){
   try{
    const download=new AbortController(),abort=()=>download.abort();signal.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,7000);let blob:Blob;
    try{const response=await fetch('/audio/sentences/'+file,{signal:download.signal});if(!response.ok)throw Error('Sentence file unavailable');blob=await response.blob();}
    finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
    await play(blob);return;
   }catch(error){if(signal.aborted||String(error).includes('gesture-required'))throw error;}
  }
  const neural=async()=>{const ctx=unlockGameAudio();if(!ctx||ctx.state!=='running')throw Error('gesture-required');const blob=await synthesizeSentence(text,signal,onStatus);if(!signal.aborted)await play(blob);};
  const mobile=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;
  if(mobile){
   try{await neural();return;}catch(error){if(signal.aborted||String(error).includes('gesture-required'))throw error;}
  }
  // OS TTS also receives one entire sentence, never per-word utterances.
  try{await nativeSentence(text,signal,()=>{onStatus('');onStart()},onEnd);return;}catch(error){if(signal.aborted||mobile)throw error;}
  await neural();
 })();
 return {done,stop(){controller.abort();if(source){source.onended=null;try{source.stop();source.disconnect()}catch{}}}};
}
