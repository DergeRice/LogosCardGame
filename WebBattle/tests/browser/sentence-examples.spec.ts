import {guestContext} from './fixtures.js';
import {test,expect} from './fixtures.js';
import {judgeCards,type Card,type RoomView} from '../../shared/rules.js';
import {observeRecordedAudio} from './helpers/audio.js';
for(const mobile of [false,true])test(`example after score, field overlay and TTS: ${mobile?'landscape reduced viewport':'desktop'}`,async({browser})=>{
 const ctx=await guestContext(browser,{viewport:mobile?{width:900,height:430}:{width:1280,height:900},hasTouch:mobile,isMobile:mobile});
 await ctx.addInitScript(observeRecordedAudio);
 await ctx.addInitScript(({mobile})=>{
  const AudioCtor=window.AudioContext;
  if(AudioCtor)Object.defineProperty(window,'AudioContext',{value:class extends AudioCtor{constructor(options?:AudioContextOptions){super(options);(window as any).__gameAudio=this;}}});
  if(mobile){const vv=new EventTarget();Object.assign(vv,{width:900,height:370,offsetTop:20,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:vv});localStorage.setItem('logos-example-tts','off');localStorage.setItem('logos-example-index-5','21');}
  const spoken:string[]=[];(window as any).__spoken=spoken;
  (window as any).SpeechSynthesisUtterance=class{ text:string;constructor(text:string){this.text=text;}};
  let unlocked=!mobile;
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'en-US',localService:true}],cancel(){},resume(){},speak(u:any){if(u.volume===0){unlocked=navigator.userActivation.isActive;(window as any).__speechUnlocked=unlocked;u.onend?.();return;}if(!unlocked)throw Error('Mobile speech requires a gesture');spoken.push(u.text);u.onstart?.();(window as any).__finishSpeech=()=>u.onend?.();}}});
 },{mobile});
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const cards:Card[]=[{id:'a',kind:'pronoun',variant:'pronoun-x2'},{id:'b',kind:'verb'},{id:'c',kind:'article',variant:'article-x2'},{id:'d',kind:'count',variant:'count-plus3'},{id:'e',kind:'adjective',variant:'adjective-plus3'}];
 const me={id:'me',name:'예문 검사',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:5,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'example-fixture',players:[me,{...me,id:'other',name:'상대'}],you:'me',hand:cards,handVersion:1,endsAt:0,stageEndsAt:0,nextDealAt:Date.now()+30000,dealSerial:1,deckCount:40,deckTotal:60,usedCards:[],dealIntervalMs:30000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const msg=JSON.parse(String(raw));if(msg.type==='hello'){ws.send(JSON.stringify({type:'session',token:'example-fixture',name:me.name,avatar:'pronoun',rating:1000,points:0}));ws.send(JSON.stringify({type:'state',room}));}if(msg.type==='submit'){room.judgment={...judgeCards(cards),accepted:true,submissionId:msg.requestId};room.players[0].score=26;room.highScore=26;room.hand=[];room.handVersion++;room.players[0].lastPlayed=cards;room.decision={id:'choice',playerId:'me',startedAt:Date.now(),expiresAt:0};ws.send(JSON.stringify({type:'state',room}));}}));
 try{
  await page.addInitScript(()=>sessionStorage.setItem('logos-entry','guest'));await page.goto('/');await page.getByRole('button',{name:'손패 펼쳐 보기'}).click();for(const c of cards)await page.locator(`[data-card-id="${c.id}"]`).click();
  await page.evaluate(()=>{let seen=false;(window as any).__exampleClosedAt=0;new MutationObserver(()=>{if(document.querySelector('.sentence-example-panel'))seen=true;else if(seen&&!(window as any).__exampleClosedAt)(window as any).__exampleClosedAt=performance.now()}).observe(document.body,{childList:true,subtree:true});});const geometry=await page.locator('.field-feedback-wrap').boundingBox();await page.getByRole('button',{name:'문장 제출'}).click();await expect(page.locator('.score-calculation[data-phase="calculating"]')).toBeVisible();await expect(page.locator('.sentence-example-panel')).toHaveCount(0);
  const panel=page.getByRole('region',{name:'카드에 맞춘 예문'});await expect(panel).toBeVisible();await expect(page.getByTestId('my-score')).toHaveText('26');await expect(panel).not.toContainText('5형식');await expect(panel.locator('.example-english')).toHaveAttribute('aria-label','I make the student ready.');await expect(panel.locator('.role-objectComplement')).toContainText('ready');await expect(panel.locator('header,footer,button')).toHaveCount(0);await expect(panel.locator('[data-example-card-id]')).toHaveCount(5);await expect(page.getByRole('dialog',{name:'고 스톱 선택'})).toHaveCount(0);
  await expect.poll(async()=>Math.abs((await page.locator('.field-feedback-wrap').boundingBox())!.y-geometry!.y)).toBeLessThan(.5);
  const box=await panel.boundingBox(),field=await page.locator('.field-feedback-wrap').boundingBox();expect(box!.x).toBeGreaterThanOrEqual(field!.x);expect(box!.y).toBeGreaterThanOrEqual(field!.y);expect(box!.y+box!.height).toBeLessThanOrEqual(field!.y+field!.height+1);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const inside=await panel.evaluate(el=>{const box=el.getBoundingClientRect();return [...el.querySelectorAll('header,.example-part b,.example-korean,footer button')].every(part=>{const p=part.getBoundingClientRect();return p.top>=box.top-1&&p.bottom<=box.bottom+1&&p.left>=box.left-1&&p.right<=box.right+1});});expect(inside).toBe(true);
  if(mobile)await expect(page.locator('.shell')).toHaveAttribute('data-viewport-height','370');
  if(mobile)expect(await page.evaluate(()=>(window as any).__speechUnlocked)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).__gameAudio?.state)).toBe('running');
  await expect.poll(()=>page.evaluate(()=>(window as any).__recordedBuffers.length)).toBe(1);expect(await page.evaluate(()=>(window as any).__recordedBuffers[0].peak)).toBeGreaterThan(.02);await expect.poll(()=>page.evaluate(()=>(window as any).__recordedBuffers[0].end),{timeout:15000}).toBeGreaterThan(0);
  await page.screenshot({path:`docs/screenshots/example-panel-${mobile?'mobile':'desktop'}.png`});
  await expect(panel).toHaveCount(0,{timeout:5000});const closeDelay=await page.evaluate(()=>(window as any).__exampleClosedAt-(window as any).__recordedBuffers[0].end);expect(closeDelay).toBeGreaterThanOrEqual(1900);expect(closeDelay).toBeLessThan(4000);await expect(page.getByRole('dialog',{name:'고 스톱 선택'})).toBeVisible();expect(await page.evaluate(()=>(window as any).__spoken.length)).toBe(0);expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
