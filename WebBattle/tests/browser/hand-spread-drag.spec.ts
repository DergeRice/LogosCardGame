import {test,expect,guestContext} from './fixtures.js';
import type {RoomView} from '../../shared/rules.js';

test('expanded mobile hand can be held and dragged into the field',async({browser,browserName})=>{
 const context=await guestContext(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),cards=[{id:'held-card',kind:'pronoun' as const},{id:'next-card',kind:'verb' as const}];
 const me={id:'me',name:'손패 검사',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:2,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'hand-drag',players:[me,{...me,id:'other'}],you:'me',hand:cards,handVersion:1,fieldVersion:0,endsAt:0,stageEndsAt:0,nextDealAt:Date.now()+30000,dealSerial:1,dealIntervalMs:30000,deckCount:40,deckTotal:71,usedCards:[],goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:Date.now()+600000};
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const message=JSON.parse(String(raw));if(message.type==='hello'){ws.send(JSON.stringify({type:'session',id:'me',token:'hand-drag',name:me.name,avatar:'pronoun',rating:1000,points:0}));ws.send(JSON.stringify({type:'state',room}));}if(message.type==='ping')ws.send(JSON.stringify({type:'pong'}));}));
 try{
  await page.goto('/');await page.getByRole('button',{name:'손패 펼쳐 보기'}).click({timeout:45000});
  const card=page.locator('[data-card-id="held-card"]');await expect(card).toBeVisible();await expect(card).toHaveCSS('touch-action','none');
  const hand=(await card.boundingBox())!,field=(await page.locator('.pointer-field').boundingBox())!,from={x:hand.x+hand.width/2,y:hand.y+hand.height/2},to={x:field.x+field.width/2,y:field.y+field.height/2};
  if(browserName==='chromium'){
   const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});await expect(card).toHaveClass(/drag-holding/);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x,y:from.y-20}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[to]});await expect(page.locator('.field-drag-slot')).toHaveCount(1);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }else{
   await card.dispatchEvent('pointerdown',{pointerId:88,pointerType:'touch',isPrimary:true,button:0,clientX:from.x,clientY:from.y});await expect(card).toHaveClass(/drag-holding/);await page.evaluate(({x,y})=>window.dispatchEvent(new PointerEvent('pointermove',{pointerId:88,pointerType:'touch',isPrimary:true,clientX:x,clientY:y})),to);await expect(page.locator('.field-drag-slot')).toHaveCount(1);await page.evaluate(({x,y})=>window.dispatchEvent(new PointerEvent('pointerup',{pointerId:88,pointerType:'touch',isPrimary:true,clientX:x,clientY:y})),to);
  }
  await expect(page.locator('[data-field-id="held-card"]')).toBeVisible();
 }finally{await context.close()}
});
