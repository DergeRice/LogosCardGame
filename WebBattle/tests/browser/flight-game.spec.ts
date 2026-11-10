import {test,expect,guestContext} from './fixtures.js';
import {defaultHubSave} from '../../shared/store.js';
import type {FlightRun} from '../../shared/flightGame.js';

for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`irregular verb flight ${viewport.width}x${viewport.height}`,async({browser})=>{
 const context=await guestContext(browser,{viewport,isMobile:true,hasTouch:true});
 await context.addInitScript(({width,height})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width,height:height-40,offsetTop:20,offsetLeft:0,scale:1})}),viewport);
 const page=await context.newPage(),errors:string[]=[],audioResponses:string[]=[];let run:FlightRun|undefined;
 page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.url().includes('/audio/mini/')&&response.ok())audioResponses.push(response.url());});
 const state=()=>{const publicRun=run?(()=>{const {correctLane:_secret,...challenge}=run.challenge,{verbIndex:_index,...visible}=run;return {...visible,challenge,verb:{base:'break',meaning:'깨뜨리다, 부수다'}};})():undefined;return {serverNow:Date.now(),season:'2026-11-01',seasonEndsAt:Date.now()+86400000,bestDistance:0,bestScore:0,plays:0,history:[],ranking:[],...(publicRun?{run:publicRun}:{})};};
 await page.routeWebSocket('**/socket',socket=>socket.onMessage(raw=>{
  const message=JSON.parse(String(raw));
  if(message.type==='hello'){
   socket.send(JSON.stringify({type:'session',id:'me',name:'비행 검사',token:'flight-token',avatar:'pronoun',rating:1000,coins:0,points:0}));
   socket.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store:defaultHubSave()}}));
  }
  if(message.type==='flightStart')run={id:'flight-1',startedAt:Date.now(),hearts:3,distance:0,score:0,coins:0,speed:1,verbIndex:5,stage:'past',challengeId:1,challenge:{id:1,kind:'approach',verbIndex:5,stage:'past',left:'코인',right:'장애물',correctLane:'left',deadline:Date.now()+15000},lastActionAt:0};
  if(message.type==='flightChoose'&&run&&message.challengeId===run.challenge.id){
   const correct=message.side===run.challenge.correctLane,current=run.challenge,stage=run.stage,verbIndex=run.verbIndex;
   if(!correct){run={...run,hearts:run.hearts-1,speed:1,stage:'past',challengeId:current.id+1,challenge:{id:current.id+1,kind:'approach',verbIndex,stage:'past',left:'장애물',right:'코인',correctLane:'right',deadline:Date.now()+15000},lastResult:'collision'};}
   else if(current.kind==='approach')run={...run,score:run.score+1,coins:run.coins+1,challengeId:current.id+1,challenge:{id:current.id+1,kind:'gate',verbIndex,stage,left:stage==='past'?'breaked':'broken',right:stage==='past'?'broke':'broke',correctLane:stage==='past'?'right':'left',deadline:Date.now()+15000},lastResult:'coin'};
   else run={...run,score:run.score+30,distance:run.distance+100,stage:stage==='past'?'participle':'past',challengeId:current.id+1,challenge:{id:current.id+1,kind:'approach',verbIndex,stage:stage==='past'?'participle':'past',left:'코인',right:'장애물',correctLane:'left',deadline:Date.now()+15000},lastResult:'correct',lastWord:stage==='past'?'broke':'broken'};
  }
  if(['flightStatus','flightStart','flightChoose'].includes(message.type))socket.send(JSON.stringify({type:'flightState',data:state()}));
 }));
 try{
  await page.goto('/');await page.getByRole('tab',{name:'미니게임',exact:true}).click();
  await page.getByRole('button',{name:/불규칙 동사 플라이트/}).click();
  await expect(page.getByRole('heading',{name:'불규칙 동사 플라이트'})).toBeVisible();
  await expect(page.getByRole('button',{name:'시작',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'시작',exact:true}).click();
  await expect(page.locator('.flight-question')).toContainText('Break의 과거형');
  await expect(page.locator('.flight-hearts')).toHaveAttribute('aria-label','남은 하트 3개');
  await expect(page.locator('.flight-scene')).toHaveAttribute('data-renderer',/pixi|fallback/);
  await expect.poll(()=>audioResponses.some(url=>url.includes('manifest-v3.json'))).toBe(true);
  await page.waitForTimeout(150);
  await page.screenshot({path:`.runtime/v187-flight-approach-${viewport.width}-${test.info().project.name}.png`});
  const pageBox=await page.locator('.flight-page').boundingBox(),fieldBox=await page.locator('.flight-field').boundingBox();
  expect(fieldBox!.y+fieldBox!.height).toBeLessThanOrEqual(pageBox!.y+pageBox!.height+1);
  await page.getByRole('button',{name:'왼쪽 코인'}).click();
  await expect(page.locator('.flight-hud')).toContainText('1');
  await expect(page.getByRole('button',{name:'오른쪽 broke'})).toBeVisible();
  await page.screenshot({path:`.runtime/v187-flight-gate-${viewport.width}-${test.info().project.name}.png`});
  await page.getByRole('button',{name:'오른쪽 broke'}).click();
  await expect(page.locator('.flight-question')).toContainText('Break의 과거분사');
  await expect(page.locator('.flight-hud')).toContainText('31');
  await page.getByRole('button',{name:'오른쪽 장애물'}).click();
  await expect(page.locator('.flight-hearts')).toHaveAttribute('aria-label','남은 하트 2개');
  await expect(page.locator('.flight-question')).toContainText('Break의 과거형');
  const field=await page.locator('.flight-field').boundingBox(),gates=await page.locator('.flight-gates').boundingBox();
  expect(field!.width).toBeGreaterThan(gates!.width);expect(field!.height).toBeGreaterThan(100);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors.filter(error=>!error.startsWith('ResizeObserver loop completed')&&!error.includes('due to access control checks.'))).toEqual([]);
 }finally{await context.close();}
});
