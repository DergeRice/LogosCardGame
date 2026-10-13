import {test,expect,webkit} from '@playwright/test';
import {judgeCards,type Card,type RoomView} from '../../shared/rules.js';
import {observeRecordedAudio} from './helpers/audio.js';
for(const mode of ['mobile-no-tts','webkit-no-tts','desktop-tts-error','mobile-blocked'] as const)test(`real recorded example playback: ${mode}`,async({browser,baseURL})=>{
 const own=mode==='webkit-no-tts'?await webkit.launch():null,engine=own??browser,mobile=mode!=='desktop-tts-error';
 const ctx=await engine.newContext({baseURL,viewport:mobile?{width:900,height:430}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
 if(own){const probe=await ctx.newPage();const audio=await probe.evaluate(()=>typeof AudioContext!=='undefined'||typeof (window as any).webkitAudioContext!=='undefined');await probe.close();if(!audio){await ctx.close();await own.close();test.skip(true,'Windows Playwright WebKit has no compiled Web Audio or SpeechSynthesis; not a real iOS audio test.');return;}}
 await ctx.addInitScript(observeRecordedAudio);
 await ctx.addInitScript(({mode})=>{
  if(mode==='desktop-tts-error'){
   (window as any).SpeechSynthesisUtterance=class{constructor(public text:string){}};
   Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel(){},resume(){},speak(u:any){if(u.volume===0)u.onend?.();else u.onerror?.({error:'voice-unavailable'});}}});
  }else{Object.defineProperty(window,'speechSynthesis',{value:undefined});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:undefined});}
  if(mode==='mobile-blocked'){(window as any).__allowAudio=false;const original=Object.getOwnPropertyDescriptor(AudioContext.prototype,'state')??Object.getOwnPropertyDescriptor(BaseAudioContext.prototype,'state');Object.defineProperty(AudioContext.prototype,'state',{get(){return (window as any).__allowAudio?original!.get!.call(this):'suspended';}});}
  if(mode!=='desktop-tts-error'){const vv=new EventTarget();Object.assign(vv,{width:900,height:370,offsetTop:20,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:vv});}
 },{mode});
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const cards:Card[]=[{id:'one',kind:'pronoun'},{id:'two',kind:'verb'}],me={id:'me',name:'음성 검사',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:2,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'recorded-fixture',players:[me,{...me,id:'other'}],you:'me',hand:cards,handVersion:1,endsAt:0,stageEndsAt:0,nextDealAt:Date.now()+30000,dealSerial:1,deckCount:40,deckTotal:60,usedCards:[],dealIntervalMs:30000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const m=JSON.parse(String(raw));if(m.type==='hello'){ws.send(JSON.stringify({type:'session',token:'audio-fixture',name:me.name,avatar:'pronoun',rating:1000,points:0}));ws.send(JSON.stringify({type:'state',room}));}if(m.type==='submit'){room.judgment={...judgeCards(cards),accepted:false,submissionId:m.requestId};ws.send(JSON.stringify({type:'state',room}));}}));
 try{
  await page.goto('/');await page.getByRole('button',{name:'손패 펼쳐 보기'}).click();for(const c of cards)await page.locator(`[data-card-id="${c.id}"]`).click();await page.getByRole('button',{name:'문장 제출'}).click();const panel=page.getByRole('region',{name:'카드에 맞춘 예문'});await expect(panel).toBeVisible();await expect(panel.locator('.example-english')).toHaveAttribute('aria-label','I work.');
  if(mode==='mobile-blocked'){const retry=panel.getByRole('button',{name:'소리 켜고 듣기'});await expect(retry).toBeVisible();await page.waitForTimeout(2300);await expect(panel).toBeVisible();await page.evaluate(()=>(window as any).__allowAudio=true);await retry.tap();await expect(retry).toHaveCount(0);}
  await expect.poll(()=>page.evaluate(()=>(window as any).__recordedBuffers.length)).toBe(1);const recording=await page.evaluate(()=>(window as any).__recordedBuffers[0]);expect(recording.peak).toBeGreaterThan(.02);expect(recording.duration).toBeGreaterThan(.4);await expect.poll(()=>page.evaluate(()=>(window as any).__recordedBuffers[0].end),{timeout:15000}).toBeGreaterThan(0);
  await page.waitForTimeout(1300);await expect(panel).toBeVisible();await expect(panel).toHaveCount(0,{timeout:2000});expect(await page.evaluate(()=>(window as any).__recordedBuffers.length)).toBe(1);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 }finally{await ctx.close();await own?.close();}
});
