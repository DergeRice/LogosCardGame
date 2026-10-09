import {test,expect} from '@playwright/test';
import {judgeCards,type Card,type RoomView} from '../../shared/rules.js';

// Explicit UI fixtures: the server response sets the score; the browser only presents it.
for(const mobile of [false,true])test(`score presentation fixture: ${mobile?'mobile':'desktop'} numbers only, integer roll and card effects`,async({browser})=>{
 const ctx=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:1000},hasTouch:mobile,isMobile:mobile}),p=await ctx.newPage();
 const cards:Card[]=[{id:'a',kind:'pronoun',variant:'pronoun-x2'},{id:'b',kind:'verb'},{id:'c',kind:'article',variant:'article-x2'},{id:'d',kind:'count',variant:'count-plus3'},{id:'e',kind:'adjective',variant:'adjective-plus3'},{id:'excluded',kind:'adjective'}];
 const player={id:'me',name:'게스트 1000',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:6,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'fixture',players:[player,{...player,id:'other',name:'상대'}],you:'me',hand:cards,handVersion:1,endsAt:Date.now()+90000,stageEndsAt:0,nextDealAt:Date.now()+10000,dealSerial:1,deckCount:22,deckTotal:39,usedCards:[],dealIntervalMs:10000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:90000,log:[],expiresAt:Date.now()+600000};
 const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
 await p.routeWebSocket('**/socket',ws=>{ws.onMessage(raw=>{const msg=JSON.parse(String(raw));if(msg.type==='hello'){ws.send(JSON.stringify({type:'session',token:'fixture',name:'게스트 1000',avatar:'pronoun',rating:1000,points:0}));ws.send(JSON.stringify({type:'state',room}));}if(msg.type==='submit'){
  const selected=msg.cards.map((id:string)=>cards.find(c=>c.id===id)!);const judgment={...judgeCards(selected),accepted:true,submissionId:msg.requestId};expect(judgment.points).toBe(26);room.judgment=judgment;room.players[0].score=26;room.players[0].lastPlayed=cards.slice(0,5);room.players[0].playedSentences=[cards.slice(0,5)];room.players[0].lastAction={id:'scored',text:'게스트 1000 님이 문장 +26점'};room.players[1].playedSentences=[[cards[1]],[cards[2]]];room.players[1].lastAction={id:'got',text:'상대 님이 GET 2 사용 · 2장 획득'};room.highScore=26;room.hand=[cards[5]];room.handVersion++;room.usedCards=cards.slice(0,5);ws.send(JSON.stringify({type:'ack',requestId:msg.requestId}));ws.send(JSON.stringify({type:'state',room}));
 }});});
 try{
  await p.goto('/');await expect(p.locator('.hand .game-card')).toHaveCount(6);await p.getByRole('button',{name:'손패 펼쳐 보기'}).click();
  for(const c of cards)await p.locator(`[data-card-id="${c.id}"]`).click();
  const beforeTop=await p.locator('.sentence-area').evaluate(el=>el.getBoundingClientRect().top+scrollY);
  await p.getByRole('button',{name:'문장 제출'}).click();
  await expect(p.locator('.score-calculation')).toBeVisible();await expect(p.locator('.table-feedback-row')).toHaveClass(/feedback-active/);expect(await p.locator('.table-feedback-slot').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(255, 255, 255)');await expect(p.locator('.deck-request-button')).not.toBeVisible();await expect(p.locator('.score-spark')).toHaveCount(16);await expect(p.locator('.battle')).toHaveClass(/score-building/);await expect(p.locator('.score-calculation')).toContainText(/^\d+$/);await expect(p.locator('.calc-chip,.score-formula')).toHaveCount(0);
  await expect(p.locator('[data-field-id="a"] .card-score-badge')).toBeVisible();await expect(p.locator('[data-field-id="a"] .card-score-badge > b.calc-multiply')).toHaveText('×2');
  await expect(p.locator('.score-counted')).toHaveCount(5);await expect(p.locator('[data-field-id="excluded"]')).not.toHaveClass(/score-counted/);
  const placement=await p.locator('.score-calculation').evaluate(el=>{const calc=el.getBoundingClientRect(),field=document.querySelector('.sentence-area')!.getBoundingClientRect();return {above:calc.bottom<=field.top,offset:Math.abs(calc.x+calc.width/2-(field.x+field.width/2))};});expect(placement.above).toBe(true);expect(placement.offset).toBeLessThan(7);
  await expect.poll(()=>p.locator('.sentence-area').evaluate(el=>el.getBoundingClientRect().top+scrollY)).toBeCloseTo(beforeTop,0);
  const values=await p.getByTestId('my-score').evaluate(el=>new Promise<string[]>(resolve=>{const values=[el.textContent!],observer=new MutationObserver(()=>values.push(el.textContent!));observer.observe(el,{childList:true,characterData:true,subtree:true});setTimeout(()=>{observer.disconnect();resolve(values);},2200);}));
  expect(values.every(v=>/^\d+$/.test(v))).toBe(true);expect(values.some(v=>Number(v)>0&&Number(v)<26)).toBe(true);
  await expect(p.getByTestId('my-score')).toHaveText('26');await p.screenshot({path:'docs/screenshots/v0901-score-'+(mobile?'mobile':'desktop')+'.png'});await expect(p.locator('.sentence-card')).toHaveCount(5);await expect(p.locator('[data-field-id="a"]')).toBeDisabled();await expect(p.locator('.table-feedback-row')).not.toHaveClass(/feedback-active/);await expect(p.locator('.table-player').nth(1).locator('.mini-hand-preview .status-card-block')).toHaveCount(2);await expect(p.locator('.table-player').nth(1).locator('.player-last-action')).toContainText('GET 2 사용');
  expect(errors).toEqual([]);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{await ctx.close();}
});

