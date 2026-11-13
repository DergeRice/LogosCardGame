import {test,expect,guestContext} from './fixtures.js';
import {defaultHubSave} from '../../shared/store.js';

for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`verb mini-game layout and sorting ${viewport.width}x${viewport.height}`,async({browser})=>{
 const context=await guestContext(browser,{viewport,isMobile:true,hasTouch:true});
 await context.addInitScript(({width,height})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width,height:height-40,offsetTop:20,offsetLeft:0,scale:1})}),viewport);
 const page=await context.newPage(),errors:string[]=[],sent:Record<string,unknown>[]=[],audioResponses:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.url().includes('/audio/mini/')&&response.ok())audioResponses.push(response.url());});
 let activeRun:Record<string,unknown>|null=null;
 const miniState=(run:Record<string,unknown>|null)=>({serverNow:Date.now(),season:'2026-11-01',seasonEndsAt:Date.now()+86400000,best:0,plays:0,history:[],ranking:Array.from({length:10},(_,i)=>({id:`rank-${i}`,name:`유저 ${i+1}`,score:12-i,frameId:i===0?'frame-style-01':undefined})),...(run?{run}:{})});
 await page.routeWebSocket('**/socket',socket=>socket.onMessage(raw=>{
  const message=JSON.parse(String(raw));sent.push(message);
  if(message.type==='hello'){
   socket.send(JSON.stringify({type:'session',id:'me',name:'미니 검사',token:'mini-token',avatar:'pronoun',rating:1000,coins:0,points:0}));
   socket.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store:defaultHubSave()}}));
  }
  if(message.type==='miniGameStart'){
   const started=Date.now()+3500;
   const words=['run','walk','sleep','go','stand','sit','swim','talk','come','arrive'];
   const cards=words.map((word,index)=>({id:index+1,word,categoryId:'intransitive'}));
   activeRun={id:'run-1',startsAt:started,endsAt:started+60000,lockedUntil:0,correct:0,wrong:0,combo:0,lastClientSeq:0,left:{id:'intransitive',line:1,label:'자동사'},right:{id:'married',line:2,label:'Married 타동사'},card:cards[0],cards,upcoming:cards.slice(1,3),audioWords:words};
  }
  if(message.type==='miniGameStatus'||message.type==='miniGameStart')socket.send(JSON.stringify({type:'miniGameState',data:miniState(activeRun)}));
  if(message.type==='miniGameChoose'&&activeRun){
   const cards=activeRun.cards as {id:number;word:string;categoryId:string}[],card=cards[0];if(!card||message.cardId!==card.id||Date.now()<Number(activeRun.lockedUntil))return;
   const nextCards=cards.slice(1);
   const wrong=message.side==='right';
   activeRun={...activeRun,correct:Number(activeRun.correct)+(wrong?0:1),wrong:Number(activeRun.wrong)+(wrong?1:0),combo:wrong?0:Number(activeRun.combo)+1,lastClientSeq:Number(message.seq),lockedUntil:wrong?Date.now()+1000:0,feedback:wrong?`${card.word}은 자동사 카드예요.`:undefined,missedWord:wrong?card.word:undefined,card:nextCards[0],cards:nextCards,upcoming:nextCards.slice(1,3)};
   const acknowledged=activeRun;
   setTimeout(()=>socket.send(JSON.stringify({type:'miniGameState',data:miniState(acknowledged)})),250);
  }
 }));
 try{
  await page.goto('/');await page.getByRole('tab',{name:'랭킹',exact:true}).click();
  await expect(page.getByRole('heading',{name:'시즌 I'})).toBeVisible();
  await expect(page.locator('.hub-season-countdown')).toContainText(/\d{2}:\d{2}:\d{2} 후 시즌 종료/);
  await page.getByRole('tab',{name:'미니게임',exact:true}).click();
  await expect(page.locator('.mini-page .hub-daily-mission')).toBeVisible();
  const tiles=page.locator('.mini-tile');await expect(tiles).toHaveCount(3);
  await expect(page.locator('.mini-verb-tile img')).toHaveAttribute('src','/mini-games/verb-landscape.webp');
  const boxes=await tiles.evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
  if(viewport.width<viewport.height){expect(boxes[0].y).toBeLessThan(boxes[1].y);expect(boxes[1].y).toBeLessThan(boxes[2].y);}else{expect(boxes[0].x).toBeLessThan(boxes[1].x);expect(boxes[1].x).toBeLessThan(boxes[2].x);}
  await page.getByRole('button',{name:/동사 분류/}).click();
  await expect.poll(()=>audioResponses.some(url=>url.includes('manifest-v3.json'))).toBe(true);
  await expect(page.getByRole('button',{name:'미니게임 목록으로'})).toBeVisible();
  await expect(page.locator('.mini-ranking li')).toHaveCount(10);
  await expect(page.locator('.mini-detail-title img')).toBeVisible();
  expect(await page.locator('.mini-detail-title img').evaluate(img=>(img as HTMLImageElement).currentSrc)).toContain(viewport.width<viewport.height?'verb-portrait.webp':'verb-landscape.webp');
  const rankBounds=await page.locator('.mini-ranking li').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
  const rankingPanel=await page.locator('.mini-ranking').boundingBox();
  expect(rankBounds[0].top).toBeGreaterThanOrEqual(rankingPanel!.y);
  const lastRank=rankBounds[9];expect(lastRank.bottom).toBeLessThanOrEqual(rankingPanel!.y+rankingPanel!.height+1);
  const framed=page.locator('.mini-ranking li').first().locator('.avatar-with-frame');
  await expect(framed).toBeVisible();
  const frame=await framed.boundingBox(),face=await framed.locator('.character-avatar').boundingBox();
  expect(Math.abs(frame!.x+frame!.width/2-face!.x-face!.width/2)).toBeLessThan(2);
  expect(Math.abs(frame!.y+frame!.height/2-face!.y-face!.height/2)).toBeLessThan(2);
  await page.screenshot({path:`.runtime/v181-mini-ready-${viewport.width}-${test.info().project.name}.png`});
  await page.getByRole('button',{name:'시작',exact:true}).click();
  await expect(page.locator('.mini-countdown')).toBeVisible();
  await expect(page.locator('.mini-countdown-pair')).toContainText('자동사');
  await expect(page.locator('.mini-countdown-pair')).toContainText('Married 타동사');
  await page.screenshot({path:`.runtime/v184-mini-countdown-${viewport.width}-${test.info().project.name}.png`});
  await expect(page.locator('.mini-ranking')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'run 발음 듣기'})).toBeVisible();
  await expect(page.locator('.mini-time')).toContainText('남은 시간');
  await expect.poll(()=>audioResponses.filter(url=>url.includes('/clips/')).length).toBeGreaterThan(0);
  await page.screenshot({path:`.runtime/v181-mini-playing-${viewport.width}-${test.info().project.name}.png`});
  await expect(page.locator('.mini-next-card')).toHaveCount(2);
  const stack=await page.locator('.mini-card-stack').boundingBox(),buttons=await page.locator('.mini-sides').boundingBox();
  expect(stack!.y+stack!.height).toBeLessThanOrEqual(buttons!.y+1);
  if(viewport.width<viewport.height)expect((await page.locator('.mini-word').boundingBox())!.height).toBeLessThanOrEqual(251);
  expect(await page.locator('.mini-next-card').first().evaluate(element=>getComputedStyle(element).bottom)).not.toBe('0px');
  const immediate=await page.evaluate(async()=>{document.querySelector<HTMLButtonElement>('.mini-side')?.click();await new Promise(resolve=>requestAnimationFrame(resolve));return {word:document.querySelector('.mini-word span')?.textContent,flying:document.querySelector('.mini-flying-card span')?.textContent};});
  expect(immediate).toEqual({word:'walk',flying:'run'});
  await page.waitForTimeout(55);
  const flyingMotion=await page.locator('.mini-flying-card').first().evaluate(element=>{const style=getComputedStyle(element);return {opacity:Number(style.opacity),x:new DOMMatrixReadOnly(style.transform).m41};});
  if(test.info().project.name==='chromium'){expect(flyingMotion.opacity).toBeGreaterThan(.75);expect(flyingMotion.x).toBeLessThan(0);}
  await page.evaluate(async()=>{for(let i=0;i<2;i++){document.querySelector<HTMLButtonElement>('.mini-side')?.click();await new Promise(resolve=>setTimeout(resolve,50));}});
  await expect(page.locator('.mini-combo')).toContainText('Combo x3');
  const comboBox=await page.locator('.mini-combo').boundingBox(),stageBox=await page.locator('.mini-game-stage').boundingBox();
  expect(Math.abs(comboBox!.x+comboBox!.width/2-(stageBox!.x+stageBox!.width/2))).toBeLessThan(3);
  expect(comboBox!.y).toBeLessThan(stageBox!.y+65);
  await expect(page.locator('.mini-combo-burst')).toHaveAttribute('data-renderer',/pixi|fallback/);
  await page.screenshot({path:`.runtime/v186-mini-combo-${viewport.width}-${test.info().project.name}.png`});
  await page.evaluate(async()=>{for(let i=0;i<3;i++){document.querySelector<HTMLButtonElement>('.mini-side')?.click();await new Promise(resolve=>setTimeout(resolve,50));}});
  await expect.poll(()=>sent.filter(m=>m.type==='miniGameChoose').length).toBe(6);
  expect(new Set(sent.filter(m=>m.type==='miniGameChoose').map(m=>m.cardId)).size).toBe(6);
  await page.locator('.mini-side').last().click();
  await expect(page.locator('.mini-wrong-card')).toContainText('swim');
  await expect(page.locator('.mini-combo')).toHaveCount(0);
  await expect(page.locator('.mini-side').first()).toBeDisabled();
  await expect(page.locator('.mini-wrong-card')).toHaveCount(0,{timeout:2000});
  await expect(page.getByRole('button',{name:'talk 발음 듣기'})).toBeVisible();
  await page.locator('.mini-side').first().click();
  await expect.poll(()=>sent.filter(m=>m.type==='miniGameChoose').length).toBe(8);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors.filter(error=>!error.startsWith('ResizeObserver loop completed')&&!error.includes('due to access control checks.'))).toEqual([]);
 }finally{await context.close();}
});
