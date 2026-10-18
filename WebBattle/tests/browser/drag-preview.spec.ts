import {guestContext} from './fixtures.js';
import {test,expect} from './fixtures.js';
import type {Card,RoomView} from '../../shared/rules.js';
for(const mobile of [false,true])test(`stable card-size insertion preview and field reorder (${mobile?'phone landscape':'desktop'})`,async({browser})=>{
 const ctx=await guestContext(browser,{viewport:mobile?{width:900,height:430}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});const page=await ctx.newPage();
 if(mobile)await ctx.addInitScript(()=>{const vv=new EventTarget();Object.assign(vv,{width:900,height:370,offsetTop:20,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:vv});});
 const cards:Card[]=[{id:'a',kind:'pronoun'},{id:'b',kind:'verb'},{id:'c',kind:'adjective'},{id:'d',kind:'mass'},{id:'special',kind:'protect'}];
 const player={id:'me',name:'드래그 검사',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:4,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'drag-fixture',players:[player,{...player,id:'other'}],you:'me',hand:cards,handVersion:1,endsAt:0,stageEndsAt:0,nextDealAt:Date.now()+30000,dealSerial:1,deckCount:40,deckTotal:60,usedCards:[],dealIntervalMs:30000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 const discarded:string[]=[];
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const m=JSON.parse(String(raw));if(m.type==='hello'){ws.send(JSON.stringify({type:'session',token:'drag-fixture',name:player.name,avatar:'pronoun',rating:1000,points:0}));ws.send(JSON.stringify({type:'state',room}));}if(m.type==='discard'){discarded.push(m.cardId);room.hand=room.hand.filter(c=>c.id!==m.cardId);room.handVersion++;ws.send(JSON.stringify({type:'ack',requestId:m.requestId}));ws.send(JSON.stringify({type:'state',room}));}}));
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>sessionStorage.setItem('logos-entry','guest'));await page.goto('/');await page.getByRole('button',{name:'손패 펼쳐 보기'}).click();for(const id of ['a','b','c'])await page.locator(`[data-card-id="${id}"]`).click();
  const a=await page.locator('[data-field-id="a"]').boundingBox(),c=await page.locator('[data-field-id="c"]').boundingBox();
  await page.mouse.move(a!.x+a!.width/2,a!.y+a!.height/2);await page.mouse.down();const x=c!.x+c!.width-2,y=c!.y+c!.height/2;await page.mouse.move(x,y,{steps:10});
  const preview=page.locator('.drop-preview');await expect(preview).toHaveCount(1);await expect(preview).toHaveAttribute('aria-label','3번 위치 미리보기');const box=(await preview.boundingBox())!;expect(Math.abs(box.width-a!.width)).toBeLessThan(2);expect(Math.abs(box.height-a!.height)).toBeLessThan(3);
  for(let i=0;i<5;i++){await page.mouse.move(x+(i%2)*.2,y);await expect(preview).toHaveAttribute('aria-label','3번 위치 미리보기');}
  await expect(page.locator('[data-field-id="a"] .illustration')).toHaveCSS('visibility','hidden');await page.screenshot({path:`.runtime/v76-drag-preview-${mobile?'mobile':'desktop'}.png`});await page.mouse.up();await expect(preview).toHaveCount(0);expect(await page.locator('[data-field-id]').evaluateAll(xs=>xs.map(x=>(x as HTMLElement).dataset.fieldId))).toEqual(['b','c','a']);
  const field=(await page.locator('[data-field-id="b"]').boundingBox())!,hand=(await page.locator('[data-card-id="d"]').boundingBox())!;
  await page.mouse.move(hand.x+hand.width/2,hand.y+hand.height/2);await page.mouse.down();await page.mouse.move(field.x-4,field.y+field.height/2,{steps:10});await expect(preview).toHaveCount(1);const next=(await preview.boundingBox())!;expect(Math.abs(next.width-field.width)).toBeLessThan(2);expect(Math.abs(next.height-field.height)).toBeLessThan(3);await page.mouse.up();await expect(page.locator('[data-field-id="d"]')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);expect(errors).toEqual([]);
  for(const id of ['d','special']){const card=page.locator(`[data-field-id="${id}"],[data-card-id="${id}"]`),r=(await card.boundingBox())!;await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+12,r.y+r.height/2+12);const trash=page.getByRole('region',{name:'카드 버리기'});await expect(trash).toBeVisible();const t=(await trash.boundingBox())!;expect(t.y+t.height).toBeLessThanOrEqual(mobile?390:900);await page.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:10});await expect(trash).toHaveClass(/trash-hover/);await page.screenshot({path:`.runtime/v76-trash-${mobile?'mobile':'desktop'}.png`});await page.mouse.up();await expect(card).toHaveCount(0);await expect(trash).toHaveCount(0);}
  expect(discarded).toEqual(['d','special']);
 }finally{await ctx.close();}
});
