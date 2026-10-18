import {guestContext} from './fixtures.js';
import {test,expect,webkit,devices} from './fixtures.js';
import {judgeCards,type Card,type RoomView} from '../../shared/rules.js';
import {observeRecordedAudio} from './helpers/audio.js';
for(const mode of ['mobile-no-tts','mobile-resume','mobile-r2','webkit-no-tts','desktop-tts-error','mobile-blocked','mobile-slow','mobile-missing','mobile-network-error'] as const)test(`whole-sentence file playback: ${mode}`,async({browser,baseURL})=>{
 const own=mode==='webkit-no-tts'?await webkit.launch():null,engine=own??browser,mobile=mode!=='desktop-tts-error';
 const ctx=await guestContext(engine,{baseURL,...(mobile?(own?devices['iPhone 13']:devices['Pixel 7']):{}),viewport:mobile?{width:900,height:430}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
 if(own){const probe=await ctx.newPage();const audio=await probe.evaluate(()=>typeof AudioContext!=='undefined'||typeof (window as any).webkitAudioContext!=='undefined');await probe.close();if(!audio){await ctx.close();await own.close();test.skip(true,'Windows Playwright WebKit has no compiled Web Audio or SpeechSynthesis; not a real iOS audio test.');return;}}
 await ctx.addInitScript(observeRecordedAudio);await ctx.addInitScript(()=>{(window as any).__voiceStates=[];window.addEventListener('logos-voice-status',e=>(window as any).__voiceStates.push((e as CustomEvent).detail.code));});
 await ctx.addInitScript(({mode})=>{
  if(mode==='desktop-tts-error'){
   (window as any).SpeechSynthesisUtterance=class{constructor(public text:string){}};
   Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel(){},resume(){},speak(u:any){if(u.volume===0)u.onend?.();else u.onerror?.({error:'voice-unavailable'});}}});
  }else{Object.defineProperty(window,'speechSynthesis',{value:undefined});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:undefined});}
  if(mode==='mobile-resume'){
   const original=Object.getOwnPropertyDescriptor(AudioContext.prototype,'state')??Object.getOwnPropertyDescriptor(BaseAudioContext.prototype,'state');
   const resume=AudioContext.prototype.resume;
   Object.defineProperty(AudioContext.prototype,'state',{get(){return performance.now()<((window as any).__resumeAfter??0)?'suspended':original!.get!.call(this)}});
   AudioContext.prototype.resume=async function(){await resume.call(this);const delay=((window as any).__resumeAfter??0)-performance.now();if(delay>0)await new Promise(r=>setTimeout(r,delay));};
  }
  if(mode==='mobile-blocked'){(window as any).__allowAudio=false;const original=Object.getOwnPropertyDescriptor(AudioContext.prototype,'state')??Object.getOwnPropertyDescriptor(BaseAudioContext.prototype,'state');Object.defineProperty(AudioContext.prototype,'state',{get(){return (window as any).__allowAudio?original!.get!.call(this):'suspended';}});}
  if(mode!=='desktop-tts-error'){const vv=new EventTarget();Object.assign(vv,{width:900,height:370,offsetTop:20,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:vv});}
 },{mode});
 const page=await ctx.newPage(),errors:string[]=[],audioRequests:string[]=[];page.on('request',request=>{if(request.url().includes('/audio/')||request.url().includes('logos-card-audio.'))audioRequests.push(request.url())});page.on('pageerror',e=>errors.push(e.message));
 const cards:Card[]=mode==='mobile-r2'?[{id:'one',kind:'indefinite'},{id:'two',kind:'count'},{id:'three',kind:'modal'},{id:'four',kind:'verb'}]:[{id:'one',kind:'pronoun'},{id:'two',kind:'verb'}],me={id:'me',name:'음성 검사',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:2,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'recorded-fixture',players:[me,{...me,id:'other'}],you:'me',hand:cards,handVersion:1,endsAt:0,stageEndsAt:0,nextDealAt:Date.now()+30000,dealSerial:1,deckCount:40,deckTotal:60,usedCards:[],dealIntervalMs:30000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 if(mode==='mobile-slow')await page.route('**/audio/sentences/**/*.mp3',async route=>{await new Promise(r=>setTimeout(r,3000));await route.continue().catch(()=>{});});
 if(['mobile-missing','mobile-network-error'].includes(mode))await page.route('**/*kokoro.worker*',route=>route.fulfill({contentType:'application/javascript',body:'throw Error("Worker unavailable fixture")'}));
 if(mode==='mobile-missing'){await page.route('**/audio/sentences/manifest.json',route=>route.fulfill({json:{entries:[]}}));await page.route('https://logos-card-audio.*.workers.dev/**',route=>route.fulfill({status:404}));}
 if(mode==='mobile-network-error'){await page.route('**/audio/sentences/**/*.mp3',route=>route.fulfill({status:503,body:'Unavailable'}));await page.route('https://logos-card-audio.*.workers.dev/**',route=>route.fulfill({status:503}));}
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const m=JSON.parse(String(raw));if(m.type==='hello'){ws.send(JSON.stringify({type:'session',token:'audio-fixture',name:me.name,avatar:'pronoun',rating:1000,points:0}));ws.send(JSON.stringify({type:'state',room}));}if(m.type==='submit'){room.judgment={...judgeCards(cards),accepted:false,submissionId:m.requestId};ws.send(JSON.stringify({type:'state',room}));}}));
 try{
  await page.addInitScript(()=>sessionStorage.setItem('logos-entry','guest'));await page.goto('/');await page.getByRole('button',{name:'손패 펼쳐 보기'}).click();for(const c of cards)await page.locator(`[data-card-id="${c.id}"]`).click();await page.evaluate(()=>{let seen=false;(window as any).__exampleClosedAt=0;new MutationObserver(()=>{if(document.querySelector('.sentence-example-panel'))seen=true;else if(seen&&!(window as any).__exampleClosedAt)(window as any).__exampleClosedAt=performance.now()}).observe(document.body,{childList:true,subtree:true});});if(mode==='mobile-resume')await page.evaluate(()=>(window as any).__resumeAfter=performance.now()+600);await page.getByRole('button',{name:'문장 제출'}).click();const panel=page.getByRole('region',{name:'카드에 맞춘 예문'});await expect(panel).toBeVisible();expect(audioRequests.some(url=>url.includes('/bgm.mp3'))).toBe(false);await expect(panel.locator('.example-english')).toHaveAttribute('aria-label',mode==='mobile-r2'?'A teacher can work.':'I work.');
  if(['mobile-blocked','mobile-missing','mobile-network-error'].includes(mode)){
   const expected=mode==='mobile-blocked'?'blocked':'network';await expect.poll(()=>page.evaluate(expected=>(window as any).__voiceStates.includes(expected),expected)).toBe(true);expect(await page.evaluate(()=>(window as any).__recordedBuffers.length)).toBe(0);expect(errors.every(error=>error.includes('Worker unavailable fixture'))).toBe(true);
   await expect(panel.getByRole('button')).toHaveCount(0);await expect(panel).toHaveCount(0,{timeout:6000});return;
  }
  await page.getByRole('button',{name:'모두 되돌리기'}).click();await expect(page.locator('[data-field-id]')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>(window as any).__recordedBuffers.length)).toBe(1);const recording=await page.evaluate(()=>(window as any).__recordedBuffers[0]);expect(recording.peak).toBeGreaterThan(.02);expect(recording.duration).toBeGreaterThan(.4);await expect.poll(()=>page.evaluate(()=>(window as any).__recordedBuffers[0].end),{timeout:15000}).toBeGreaterThan(0);
  await expect(panel).toHaveCount(0,{timeout:4000});const closeDelay=await page.evaluate(()=>(window as any).__exampleClosedAt-(window as any).__recordedBuffers[0].end);expect(closeDelay).toBeGreaterThanOrEqual(1900);expect(closeDelay).toBeLessThan(3500);expect(await page.evaluate(()=>(window as any).__recordedBuffers.length)).toBe(1);expect(errors).toEqual([]);expect(mode==='mobile-r2'?audioRequests.some(url=>url.includes('logos-card-audio.')&&url.endsWith('.mp3')):audioRequests.some(url=>/audio\/sentences\/.+\.mp3/.test(url))).toBe(true);expect(audioRequests.some(url=>url.includes('/audio/examples/'))).toBe(false);expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 }finally{await ctx.close();await own?.close();}
});
