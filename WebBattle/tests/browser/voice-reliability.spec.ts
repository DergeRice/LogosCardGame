import {test,expect} from './fixtures.js';
import {readFileSync} from 'node:fs';
const origin='https://logos-card-audio.jesus-and-children-ranking-worker.workers.dev';
async function support(page:import('@playwright/test').Page){return page.evaluate(()=>typeof AudioContext!=='undefined'||typeof (window as any).webkitAudioContext!=='undefined')}
test('production local and R2 sentences play non-silent samples to completion; replay and resume',async({page},info)=>{
 await page.addInitScript(()=>{const vv=new EventTarget();Object.assign(vv,{width:innerWidth,height:innerHeight-48,offsetTop:20,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:vv})});
 await page.goto('/audio-check');if(!await support(page)){await page.getByRole('button',{name:'문장 재생'}).click();await expect(page.getByRole('status')).toHaveText('unsupported');await info.attach('audio-limit',{body:'Windows WebKit build exposes no Web Audio. This is not an iPhone speaker test.',contentType:'text/plain'});test.skip(true,'Windows WebKit has no Web Audio; iOS physical playback remains unverified');return;}
 for(const sentence of ['I work.','A teacher can work.','A teacher can work.']){
  await page.getByRole('combobox').selectOption(sentence);await page.getByRole('button',{name:'문장 재생'}).click();await expect(page.getByRole('status')).toHaveText('playing',{timeout:20000});await expect(page.getByRole('status')).toHaveText('ended',{timeout:15000});expect(await page.locator('dl').textContent()).toContain('peak');
 }
 await page.evaluate(async()=>{const {unlockGameAudio}=await import('/src/exampleAudio.ts' as string);await unlockGameAudio()?.suspend()});await page.getByRole('button',{name:'문장 재생'}).click();await expect(page.getByRole('status')).toHaveText('ended',{timeout:20000});
 await info.attach('playback',{body:await page.locator('main').innerText(),contentType:'text/plain'});
});
test('slow download exceeds previous 1.5 second cutoff and still plays; cancel never starts stale playback',async({page})=>{
 await page.goto('/audio-check');test.skip(!await support(page),'No Web Audio in Windows WebKit');
 await page.route('**/audio/sentences/**/*.mp3',async route=>{await new Promise(r=>setTimeout(r,3200));await route.continue()});
 await page.getByRole('combobox').selectOption('I work.');await page.getByRole('button',{name:'문장 재생'}).click();await expect(page.getByRole('status')).toHaveText('loading');await expect(page.getByRole('status')).toHaveText('ended',{timeout:20000});
 const cancelled=await page.evaluate(async()=>{const {playSentenceExample}=await import('/src/sentenceVoice.ts' as string);let starts=0;const playback=playSentenceExample('I work.',()=>starts++,()=>{});playback.stop();await playback.done;return starts});expect(cancelled).toBe(0);
});
test('blocked autoplay is visible and a tap retries; HTTP missing and network errors are distinguishable',async({page})=>{
 await page.addInitScript(()=>{(window as any).__blocked=true;const descriptor=Object.getOwnPropertyDescriptor(BaseAudioContext.prototype,'state')!;Object.defineProperty(AudioContext.prototype,'state',{get(){return (window as any).__blocked?'suspended':descriptor.get!.call(this)}})});
 await page.goto('/audio-check');test.skip(!await support(page),'No Web Audio in Windows WebKit');await page.getByRole('combobox').selectOption('I work.');await page.getByRole('button',{name:'문장 재생'}).click();await expect(page.getByRole('status')).toHaveText('blocked',{timeout:20000});await page.evaluate(()=>(window as any).__blocked=false);await page.getByRole('button',{name:'문장 재생'}).click();await expect(page.getByRole('status')).toHaveText('ended',{timeout:15000});
 for(const status of [404,503]){await page.route(origin+'/**',route=>route.fulfill({status,body:'unavailable'}));await page.getByRole('combobox').selectOption('A teacher can work.');await page.getByRole('button',{name:'문장 재생'}).click();await expect(page.getByRole('status')).toHaveText(status===404?'missing':'network',{timeout:15000});await page.unroute(origin+'/**');}
});
test('public catalog: audited long and short sentences decode with matching duration and non-silent waveform',async({page},info)=>{
 await page.goto('/audio-check');test.skip(!await support(page),'No Web Audio in Windows WebKit');
 const samples=JSON.parse(readFileSync('docs/canonical-audio-release.json','utf8')).samples;
 const results=await page.evaluate(async({samples,origin})=>{const ctx=new AudioContext(),results=[];for(const sample of samples){const started=performance.now(),r=await fetch(origin+'/'+sample.file);if(!r.ok)throw Error('HTTP '+r.status+' '+sample.file);const bytes=await r.arrayBuffer(),b=await ctx.decodeAudioData(bytes),data=b.getChannelData(0);let peak=0;for(const x of data)peak=Math.max(peak,Math.abs(x));if(peak<.02||Math.abs(b.duration-sample.duration)>.15)throw Error('Silent/corrupt '+sample.file);results.push({file:sample.file,duration:b.duration,peak,ms:Math.round(performance.now()-started)});}await ctx.close();return results},{samples,origin});expect(results.length).toBeGreaterThanOrEqual(30);await info.attach('public-audio-samples',{body:JSON.stringify(results,null,2),contentType:'application/json'});
});
