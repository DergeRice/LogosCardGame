import {test,expect,guestContext} from './fixtures.js';
import {DECK_FACES,type Card,type RoomView} from '../../shared/rules.js';
for(const mobile of [false,true])test(`Nothing matches normal card size and discards without entering the field (${mobile?'mobile touch':'desktop'})`,async({browser,browserName})=>{
 const context=await guestContext(browser,{viewport:mobile?{width:900,height:430}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
 if(mobile)await context.addInitScript(()=>{const vv=Object.assign(new EventTarget(),{width:900,height:370,offsetTop:20,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:vv});});
 const page=await context.newPage(),errors:string[]=[],messages:any[]=[];page.on('pageerror',e=>errors.push(e.message));
 const cards:Card[]=[...DECK_FACES.filter(c=>c.kind==='nothing').map((face,i)=>({...face,id:'blank-'+i})),{id:'normal',kind:'pronoun'},{id:'verb',kind:'verb'}];
 const me={id:'me',name:'Nothing 검사',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:5,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'nothing-fixture',players:[me,{...me,id:'other'}],you:'me',hand:cards,handVersion:1,endsAt:0,stageEndsAt:0,nextDealAt:Date.now()+30000,dealSerial:1,deckCount:51,deckTotal:71,usedCards:[],dealIntervalMs:30000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:180000,durationMs:0,log:[],expiresAt:0};
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{
  const m=JSON.parse(String(raw));messages.push(m);
  if(m.type==='hello'){ws.send(JSON.stringify({type:'session',token:'nothing-fixture',name:me.name,avatar:'pronoun',rating:1000,points:0}));ws.send(JSON.stringify({type:'state',room}));}
  if(m.type==='discard'){room.usedCards.push(room.hand.find(c=>c.id===m.cardId)!);room.hand=room.hand.filter(c=>c.id!==m.cardId);room.handVersion++;ws.send(JSON.stringify({type:'ack',requestId:m.requestId}));ws.send(JSON.stringify({type:'state',room}));}
 }));
 try{
  await page.goto('/');await page.getByRole('button',{name:'손패 펼쳐 보기'}).click();
  const normal=await page.locator('[data-card-id="normal"]').evaluate(el=>({width:el.clientWidth,height:el.clientHeight}));
  for(let i=0;i<3;i++){
   const card=page.locator(`[data-card-id="blank-${i}"]`);expect(await card.evaluate(el=>({width:el.clientWidth,height:el.clientHeight}))).toEqual(normal);
   expect(await card.locator('img').evaluate(el=>({width:(el as HTMLImageElement).naturalWidth,height:(el as HTMLImageElement).naturalHeight}))).toEqual({width:488,height:693});
  }
  await page.locator('[data-card-id="blank-0"]').click();await expect(page.getByRole('status').filter({hasText:'Nothing은 꽝 카드예요. 아래 쓰레기통으로 버려주세요.'})).toBeVisible();await expect(page.locator('[data-field-id]')).toHaveCount(0);
  await page.screenshot({path:`docs/screenshots/nothing-hand-${mobile?'mobile':'desktop'}.png`});
  const box=(await page.locator('[data-card-id="blank-0"]').boundingBox())!,x=box.x+box.width/2,y=box.y+box.height/2;
  const touch=mobile&&browserName==='chromium'?await context.newCDPSession(page):null;
  if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(300);await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+12,y:y-12}]});}
  else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+12,y-12);}
  const trash=page.getByRole('region',{name:'카드 버리기'});await expect(trash).toBeVisible();const target=(await trash.boundingBox())!,tx=target.x+target.width/2,ty=target.y+target.height/2;
  if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx,y:ty}]});await expect(trash).toHaveClass(/trash-hover/);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(tx,ty,{steps:10});await page.mouse.up();}
  await expect(page.locator('[data-card-id="blank-0"]')).toHaveCount(0);expect(messages.filter(m=>m.type==='discard').map(m=>m.cardId)).toEqual(['blank-0']);expect(messages.some(m=>m.type==='special')).toBe(false);await expect(page.getByTestId('my-score')).toHaveText('0');expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 }finally{await context.close()}
});
