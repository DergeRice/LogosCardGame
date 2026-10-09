import {test,expect} from '@playwright/test';
import {DECK_FACES,type Card,type Kind,type RoomView} from '../../shared/rules.js';

for(const count of [4,6])for(const size of [{width:1280,height:720},{width:932,height:430},{width:667,height:320}])test(`${count} players ${size.width}: board, ROB groups and EXCHANGE remain usable`,async({browser})=>{
 const mobile=size.width<1000;
 const context=await browser.newContext({viewport:size,isMobile:mobile,hasTouch:mobile});const page=await context.newPage();
 if(mobile)await page.addInitScript(({width,height})=>{Object.defineProperty(window,'visualViewport',{configurable:true,value:Object.assign(new EventTarget(),{width,height:height-36,offsetTop:18,offsetLeft:0})});},size);
 const hand:Card[]=['rob','exchange','pronoun','verb','count'].map((kind,i)=>({...DECK_FACES.find(c=>c.kind===kind)!,id:`own-${i}`}));
 const players=Array.from({length:count},(_,i)=>({id:`p${i}`,name:`게스트 ${1000+i}`,avatar:['pronoun','verb','adjective','count'][i%4] as Kind,rating:1000,ratingDelta:0,points:0,reward:0,score:i*12,ready:true,connected:true,handCount:5,handPreview:i===0?hand:DECK_FACES.slice(i*5,i*5+5).map((c,j)=>({...c,id:`p${i}-${j}`})),rematch:false,ai:i>0}));
 const room:RoomView={code:'123456',phase:'battle',matchId:'multi',players,you:'p0',hand,handVersion:1,endsAt:0,stageEndsAt:0,nextDealAt:0,dealSerial:1,deckCount:60-count*5,deckTotal:60,usedCards:[],dealIntervalMs:30000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 const requests:any[]=[];const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const msg=JSON.parse(String(raw));
  if(msg.type==='hello'){ws.send(JSON.stringify({type:'session',token:'multi',name:players[0].name,avatar:'pronoun',rating:1000,points:0}));ws.send(JSON.stringify({type:'state',room}));}
  if(msg.type==='inspectRob'||msg.type==='inspectExchange')ws.send(JSON.stringify({type:msg.type==='inspectRob'?'robView':'exchangeView',matchId:room.matchId,cardId:msg.cardId,players:players.slice(1).map(p=>({...p,handVersion:1,fieldVersion:1,cards:p.handPreview.map(c=>({...c,source:'hand'}))}))}));
  if(msg.type==='special')requests.push(msg);
 }));
 const fits=async(selector:string)=>{const r=await page.locator(selector).boundingBox();expect(r).not.toBeNull();expect(r!.x).toBeGreaterThanOrEqual(0);expect(r!.x+r!.width).toBeLessThanOrEqual(size.width+1);expect(r!.y).toBeGreaterThanOrEqual(mobile?18:0);expect(r!.y+r!.height).toBeLessThanOrEqual(size.height-(mobile?18:0)+1);};
 try{
  await page.goto('/');await expect(page.locator('.table-player')).toHaveCount(count);await fits('.table-scoreboard');await fits('.sentence-area');await fits('.battle-hand-zone');
  const field=await page.locator('.sentence-area').boundingBox(),handZone=await page.locator('.battle-hand-zone').boundingBox();expect(field!.height).toBeGreaterThan(50);expect(field!.y+field!.height).toBeLessThanOrEqual(handZone!.y+1);
  await page.screenshot({path:`docs/screenshots/multiplayer-${count}-${size.width}.png`});
  await page.getByRole('button',{name:'손패 펼쳐 보기'}).click();
  await page.locator('[data-card-id="own-0"]').click();await expect(page.locator('.rob-player-group')).toHaveCount(count-1);await fits('.rob-dialog');await fits('.rob-dialog .special-actions');
  await page.locator('.rob-card-choice button').first().click();await expect(page.locator('.special-selection-summary')).toContainText('게스트 1001');
  await page.screenshot({path:`docs/screenshots/rob-${count}-${size.width}.png`});await page.getByRole('button',{name:'사용하기',exact:true}).click();expect(requests[0].targetId).toBe('p1');
  await page.locator('[data-card-id="own-1"]').click();await expect(page.locator('.exchange-player')).toHaveCount(count-1);await fits('.exchange-dialog');await fits('.exchange-dialog .special-actions');
  await page.getByRole('button',{name:'내 대명사 카드 선택'}).click();await page.locator('.exchange-player .exchange-cards button').last().click();await expect(page.getByRole('button',{name:'교환 요청 보내기'})).toBeEnabled();
  await page.screenshot({path:`docs/screenshots/exchange-${count}-${size.width}.png`});await page.getByRole('button',{name:'교환 요청 보내기'}).click();expect(requests[1].targetId).toBe(`p${count-1}`);
  expect(errors).toEqual([]);
 }finally{await context.close();}
});
