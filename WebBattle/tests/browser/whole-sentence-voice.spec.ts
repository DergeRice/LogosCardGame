import {test,expect} from './fixtures.js';
import {readdirSync} from 'node:fs';

test('mobile without system TTS synthesizes a new full sentence in a worker with non-silent audio',async({browser,baseURL})=>{
 const context=await browser.newContext({baseURL,viewport:{width:900,height:430},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 await page.route('**/voice-probe',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><button>Listen</button>'}));
 await page.goto('/voice-probe');
 const workerPath=process.env.BATTLE_BASE_URL?'/assets/'+readdirSync('dist/assets').find(f=>f.startsWith('sentenceVoice.worker-')):'/src/sentenceVoice.worker.ts';
 try{
  const result=await page.evaluate(async workerPath=>{
   const ctx=new AudioContext();await ctx.resume();let frames=0,active=true;const frame=()=>{if(active){frames++;requestAnimationFrame(frame)}};frame();
   const result=await new Promise<{duration:number;peak:number;starts:number;ends:number;frames:number}>((resolve,reject)=>{
    const worker=new Worker(workerPath,{type:'module'});const timer=setTimeout(()=>{worker.terminate();reject(Error('Neural voice timeout'))},90000);
    worker.onerror=e=>{clearTimeout(timer);worker.terminate();reject(Error(e.message))};
    worker.onmessage=async event=>{
     if(event.data.type==='progress')return;
     clearTimeout(timer);worker.terminate();if(event.data.type==='error'){reject(Error(event.data.message));return;}
     const buffer=await ctx.decodeAudioData(await event.data.wav.arrayBuffer());let peak=0;for(const sample of buffer.getChannelData(0))peak=Math.max(peak,Math.abs(sample));
     let starts=0;const source=ctx.createBufferSource();source.buffer=buffer;source.connect(ctx.destination);source.onended=()=>resolve({duration:buffer.duration,peak,starts,ends:1,frames});source.start();starts++;
    };
    // Deliberately absent from prepared files: no fixed sentence or word stitch can satisfy it.
    worker.postMessage('Naro can quietly help the friendly teacher today.');
   });
   active=false;await ctx.close();return result;
  },workerPath);
  expect(result.peak).toBeGreaterThan(.02);expect(result.duration).toBeGreaterThan(1);expect(result.starts).toBe(1);expect(result.ends).toBe(1);expect(result.frames).toBeGreaterThan(20);
 }finally{await context.close()}
});

test('native fallback receives one whole utterance; cancel terminates neural work',async({page})=>{
 test.skip(Boolean(process.env.BATTLE_BASE_URL),'Development module control test; production worker is tested separately.');
 await page.route('**/voice-probe',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Voice control</title>'}));
 await page.route('**/audio/sentences/manifest.json',route=>route.fulfill({json:{entries:[]}}));
 await page.goto('/voice-probe');
 const result=await page.evaluate(async()=>{
  const source='/src/sentenceVoice.ts',module=await import(/* @vite-ignore */ source);
  const calls:string[]=[];(window as any).SpeechSynthesisUtterance=class{constructor(public text:string){}};
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'en-US',localService:true}],cancel(){},resume(){},speak(utterance:any){calls.push(utterance.text);utterance.onstart?.();setTimeout(()=>utterance.onend?.(),20)}}});
  let starts=0,ends=0;const playing=module.playSentenceExample('Naro can help them today.',()=>starts++,()=>ends++);await playing.done;playing.stop();
  const controller=new AbortController();const pending=module.synthesizeSentence('Cancel this full sentence.',controller.signal);controller.abort();let cancelled='';try{await pending}catch(error){cancelled=(error as Error).name}
  return {calls,starts,ends,cancelled};
 });
 expect(result).toEqual({calls:['Naro can help them today.'],starts:1,ends:1,cancelled:'AbortError'});
});
