import {test,expect,guestContext} from './fixtures.js';
import {defaultHubSave} from '../../shared/store.js';

for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`verb mini-game layout and sorting ${viewport.width}x${viewport.height}`,async({browser})=>{
 const context=await guestContext(browser,{viewport,isMobile:true,hasTouch:true});
 await context.addInitScript(({width,height})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width,height:height-40,offsetTop:20,offsetLeft:0,scale:1})}),viewport);
 const page=await context.newPage(),errors:string[]=[],sent:Record<string,unknown>[]=[],audioResponses:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.url().includes('/audio/mini/')&&response.ok())audioResponses.push(response.url());});
 let activeRun:Record<string,unknown>|null=null;
 const miniState=(run:Record<string,unknown>|null)=>({serverNow:Date.now(),season:'2026-11-01',seasonEndsAt:Date.now()+86400000,best:0,plays:0,history:[],ranking:Array.from({length:4},(_,i)=>({id:`rank-${i}`,name:`유저 ${i+1}`,score:12-i})),...(run?{run}:{})});
 await page.routeWebSocket('**/socket',socket=>socket.onMessage(raw=>{
  const message=JSON.parse(String(raw));sent.push(message);
  if(message.type==='hello'){
   socket.send(JSON.stringify({type:'session',id:'me',name:'미니 검사',token:'mini-token',avatar:'pronoun',rating:1000,coins:0,points:0}));
   socket.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store:defaultHubSave()}}));
  }
  if(message.type==='miniGameStart'){
   const started=Date.now()+3500;
   activeRun={id:'run-1',startsAt:started,endsAt:started+60000,lockedUntil:0,correct:0,wrong:0,left:{id:'intransitive',line:1,label:'자동사'},right:{id:'married',line:2,label:'Married 타동사'},card:{id:1,word:'run'},upcoming:[{id:2,word:'walk'},{id:3,word:'sleep'}],audioWords:['run','walk','sleep','go','stand','sit','swim','talk']};
  }
  if(message.type==='miniGameStatus'||message.type==='miniGameStart')socket.send(JSON.stringify({type:'miniGameState',data:miniState(activeRun)}));
  if(message.type==='miniGameChoose'&&activeRun){
   const card=activeRun.card as {id:number;word:string};if(message.cardId!==card.id)return;
   const next=card.id+1;
   const wrong=message.side==='right';
   activeRun={...activeRun,correct:wrong?activeRun.correct:next-1,wrong:wrong?Number(activeRun.wrong)+1:activeRun.wrong,lockedUntil:wrong?Date.now()+1000:0,feedback:wrong?`${card.word}은 자동사 카드예요.`:undefined,missedWord:wrong?card.word:undefined,card:{id:next,word:['run','walk','sleep','go','stand','sit','swim','talk','come'][Math.min(next-1,8)]},upcoming:[{id:next+1,word:'come'},{id:next+2,word:'arrive'}]};
   setTimeout(()=>socket.send(JSON.stringify({type:'miniGameState',data:miniState(activeRun)})),5);
  }
 }));
 try{
  await page.goto('/');await page.getByRole('tab',{name:'랭킹',exact:true}).click();
  await expect(page.getByRole('heading',{name:'시즌 I'})).toBeVisible();
  await expect(page.locator('.hub-season-countdown')).toContainText(/\d{2}:\d{2}:\d{2} 후 시즌 종료/);
  await page.getByRole('tab',{name:'미니게임',exact:true}).click();
  await expect(page.locator('.mini-page .hub-daily-mission')).toBeVisible();
  const tiles=page.locator('.mini-tile');await expect(tiles).toHaveCount(3);
  const boxes=await tiles.evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
  if(viewport.width<viewport.height){expect(boxes[0].y).toBeLessThan(boxes[1].y);expect(boxes[1].y).toBeLessThan(boxes[2].y);}else{expect(boxes[0].x).toBeLessThan(boxes[1].x);expect(boxes[1].x).toBeLessThan(boxes[2].x);}
  await page.getByRole('button',{name:/동사 분류/}).click();
  await expect.poll(()=>audioResponses.some(url=>url.includes('manifest-v2.json'))).toBe(true);
  await expect(page.getByRole('button',{name:'미니게임 목록으로'})).toBeVisible();
  await expect(page.locator('.mini-ranking li')).toHaveCount(3);
  const rankBounds=await page.locator('.mini-ranking li').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
  const rankingPanel=await page.locator('.mini-ranking').boundingBox();
  expect(rankBounds[2].bottom).toBeLessThanOrEqual(rankingPanel!.y+rankingPanel!.height+1);
  const moreBox=await page.getByRole('button',{name:'더보기'}).boundingBox(),launchBox=await page.getByRole('button',{name:'시작',exact:true}).boundingBox();
  expect(moreBox!.y+moreBox!.height).toBeLessThanOrEqual(launchBox!.y+1);
  await page.screenshot({path:`.runtime/v181-mini-ready-${viewport.width}-${test.info().project.name}.png`});
  await page.getByRole('button',{name:'더보기'}).click();await expect(page.locator('.mini-ranking li')).toHaveCount(10);
  await page.getByRole('button',{name:'시작',exact:true}).click();
  await expect(page.locator('.mini-countdown')).toBeVisible();
  await expect(page.locator('.mini-ranking')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'run 발음 듣기'})).toBeVisible();
  await expect(page.locator('.mini-time')).toContainText('남은 시간');
  await expect.poll(()=>audioResponses.filter(url=>url.includes('/clips/')).length).toBeGreaterThan(0);
  await page.screenshot({path:`.runtime/v181-mini-playing-${viewport.width}-${test.info().project.name}.png`});
  await expect(page.locator('.mini-next-card')).toHaveCount(2);
  const stack=await page.locator('.mini-card-stack').boundingBox(),buttons=await page.locator('.mini-sides').boundingBox();
  expect(stack!.y+stack!.height).toBeLessThanOrEqual(buttons!.y+1);
  expect(await page.locator('.mini-next-card').first().evaluate(element=>getComputedStyle(element).bottom)).not.toBe('0px');
  await page.evaluate(async()=>{for(let i=0;i<6;i++){document.querySelector<HTMLButtonElement>('.mini-side')?.click();await new Promise(resolve=>setTimeout(resolve,50));}});
  await expect.poll(()=>sent.filter(m=>m.type==='miniGameChoose').length).toBe(6);
  expect(new Set(sent.filter(m=>m.type==='miniGameChoose').map(m=>m.cardId)).size).toBe(6);
  await page.locator('.mini-side').last().click();
  await expect(page.locator('.mini-wrong-card')).toContainText('swim');
  await expect(page.locator('.mini-side').first()).toBeDisabled();
  await expect(page.locator('.mini-wrong-card')).toHaveCount(0,{timeout:2000});
  await expect(page.getByRole('button',{name:'talk 발음 듣기'})).toBeVisible();
  await page.locator('.mini-side').first().click();
  await expect.poll(()=>sent.filter(m=>m.type==='miniGameChoose').length).toBe(8);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors.filter(error=>!error.startsWith('ResizeObserver loop completed')&&!error.includes('due to access control checks.'))).toEqual([]);
 }finally{await context.close();}
});
