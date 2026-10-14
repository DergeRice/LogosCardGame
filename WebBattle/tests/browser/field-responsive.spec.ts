import {guestContext} from './fixtures.js';
import {test,expect} from './fixtures.js';
import {DECK_FACES,type RoomView} from '../../shared/rules.js';

for(const size of [{width:1366,height:768},{width:390,height:844},{width:320,height:568},{width:844,height:390}])test(`field and deal timer at ${size.width}x${size.height}`,async({browser})=>{
 const mobile=size.width!==1366;
 const context=await guestContext(browser,{viewport:size,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
 const page=await context.newPage();
 const player={id:'me',name:'게스트 1000',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:5,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'field-responsive',players:size.width===320?[player,...Array.from({length:5},(_,i)=>({...player,id:`ai-${i}`,name:`AI ${i+1}`,ai:true}))]:[player,{...player,id:'ai',name:'로고스 AI',ai:true}],you:'me',hand:DECK_FACES.slice(0,5).map((card,i)=>({...card,id:`card-${i}`})),handVersion:1,endsAt:0,stageEndsAt:0,nextDealAt:Date.now()+10000,dealSerial:0,deckCount:20,deckTotal:39,usedCards:[],dealIntervalMs:10000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 if(size.width===390)await page.addInitScript(()=>{const viewport=Object.assign(new EventTarget(),{width:390,height:760,offsetTop:42,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});});
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{if(JSON.parse(String(raw)).type==='hello'){ws.send(JSON.stringify({type:'session',token:'field-responsive',name:player.name,avatar:player.avatar,rating:1000,points:0}));ws.send(JSON.stringify({type:'state',room}));}}));
 try{
  await page.addInitScript(()=>sessionStorage.setItem('logos-entry','guest'));
  await page.goto('/');await expect(page.locator('.battle')).toBeVisible();
  await page.screenshot({path:`docs/screenshots/field-responsive-${size.width}-${test.info().project.name}.png`});
  const positions=await page.evaluate(()=>{const rect=(selector:string)=>document.querySelector(selector)!.getBoundingClientRect().toJSON();return{shell:rect('.shell'),field:rect('.field-feedback-wrap'),skin:rect('.field-panel-skin'),area:rect('.sentence-area'),empty:rect('.empty-sentence'),submit:rect('.submit'),hand:rect('.battle-hand-zone'),cards:[...document.querySelectorAll('.hand .game-card')].map(card=>card.getBoundingClientRect().toJSON()),scrollHeight:document.documentElement.scrollHeight,innerHeight};});
  expect(positions.field.height).toBeGreaterThan(90);
  expect(Math.abs(positions.empty.x+positions.empty.width/2-positions.field.x-positions.field.width/2)).toBeLessThan(2);
  expect(positions.scrollHeight).toBeLessThanOrEqual(positions.innerHeight+2);
  expect(positions.skin.width).toBeGreaterThan(positions.field.width-2);
  expect(positions.skin.height).toBeGreaterThan(positions.field.height-2);
  expect(positions.submit.bottom).toBeLessThanOrEqual(positions.field.bottom+2);
  expect(positions.hand.top).toBeGreaterThanOrEqual(positions.field.bottom-2);
  expect(Math.max(...positions.cards.map(card=>card.bottom))).toBeLessThanOrEqual(positions.shell.bottom+2);
  if(size.width===390){expect(positions.shell.y).toBe(42);expect(positions.shell.height).toBe(760);}
  const sample=async()=>page.locator('.deck-request-fill').evaluate(el=>Number(new DOMMatrix(getComputedStyle(el).transform).a));
  const timing=await page.locator('.deck-request-fill').getAttribute('style');
  const start=await sample();await page.waitForTimeout(300);const middle=await sample();await page.waitForTimeout(300);const end=await sample();await page.waitForTimeout(600);const later=await sample();
  expect(middle-start).toBeGreaterThan(.01);expect(end-middle).toBeGreaterThan(.01);
  expect(Math.abs((middle-start)-(end-middle))).toBeLessThan(.025);
  expect(later-end).toBeGreaterThan(.03);expect(Math.abs((later-end)-2*(end-middle))).toBeLessThan(.035);
  expect(await page.locator('.deck-request-fill').getAttribute('style')).toBe(timing);
 }finally{await context.close();}
});
