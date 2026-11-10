import {test,expect,guestContext} from './fixtures.js';
import {defaultHubSave} from '../../shared/store.js';
import type {FlightResult,FlightRun} from '../../shared/flightGame.js';

for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`irregular verb flight ${viewport.width}x${viewport.height}`,async({browser})=>{
 const context=await guestContext(browser,{viewport,isMobile:true,hasTouch:true});
 await context.addInitScript(({width,height})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width,height:height-40,offsetTop:20,offsetLeft:0,scale:1})}),viewport);
 const page=await context.newPage(),errors:string[]=[],audioResponses:string[]=[],artResponses:string[]=[],actions:string[]=[];let run:FlightRun|undefined,finishedResult:FlightResult|undefined,sendState=()=>{};
 page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.url().includes('/audio/flight/')&&response.ok())audioResponses.push(response.url());if(response.url().includes('/flight/')&&response.ok()&&response.headers()['content-type']?.includes('image/'))artResponses.push(response.url());});
 const state=()=>{const publicRun=run?(()=>{const {correctLane:_secret,...challenge}=run.challenge,{verbIndex:_index,...visible}=run;return {...visible,challenge,verb:{base:'break',meaning:'깨다'}};})():undefined;return {serverNow:Date.now(),season:'2026-11-01',seasonEndsAt:Date.now()+86400000,bestDistance:100,bestScore:30,plays:0,history:[],ranking:[],...(publicRun?{run:publicRun}:{}),...(finishedResult?{lastResult:finishedResult}:{})};};
 await page.routeWebSocket('**/socket',socket=>{sendState=()=>socket.send(JSON.stringify({type:'flightState',data:state()}));socket.onMessage(raw=>{
  const message=JSON.parse(String(raw));
  actions.push(message.type);
  if(message.type==='hello'){
   socket.send(JSON.stringify({type:'session',id:'me',name:'비행 검사',token:'flight-token',avatar:'pronoun',rating:1000,coins:0,points:0}));
   socket.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store:defaultHubSave()}}));
  }
  if(message.type==='flightStart')run={id:'flight-1',startedAt:Date.now(),hearts:3,distance:0,score:0,coins:0,speed:1,verbIndex:5,stage:'past',challengeId:1,coinResolved:true,hazardResolved:true,challenge:{id:1,kind:'gate',verbIndex:5,stage:'past',left:'breaked',right:'broke',correctLane:'right',startsAt:Date.now(),deadline:Date.now()+3800},lastActionAt:0};
  if(message.type==='flightChoose'&&run&&message.challengeId===run.challenge.id){
   const correct=message.side===run.challenge.correctLane,current=run.challenge,stage=run.stage,verbIndex=run.verbIndex;
   if(!correct){run={...run,hearts:run.hearts-1,speed:1,challengeId:current.id+1,challenge:{...current,id:current.id+1,startsAt:Date.now(),deadline:Date.now()+3800},lastResult:'collision',collisionReason:'gate',lastWord:'break'};}
   else run={...run,score:run.score+30,distance:run.distance+100,stage:stage==='past'?'participle':'past',challengeId:current.id+1,coinResolved:true,hazardResolved:true,challenge:{id:current.id+1,kind:'gate',verbIndex,stage:stage==='past'?'participle':'past',left:stage==='past'?'broken':'breaked',right:stage==='past'?'breaken':'broke',correctLane:'left',startsAt:Date.now(),deadline:Date.now()+3800},lastResult:'correct',lastWord:stage==='past'?'broke':'broken'};
  }
  if(['flightStatus','flightStart','flightChoose'].includes(message.type))sendState();
 });});
 try{
  await page.goto('/');await page.getByRole('tab',{name:'미니게임',exact:true}).click();
  await page.getByRole('button',{name:/불규칙 동사 플라이트/}).click();
  await expect(page.getByRole('heading',{name:'불규칙 동사 플라이트'})).toBeVisible();
  await expect(page.getByRole('button',{name:'시작',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'시작',exact:true}).click();
  await page.locator('.flight-field').press('ArrowRight');
  await expect(page.locator('.flight-question')).toContainText('Break');
  await expect(page.locator('.flight-question')).toContainText('깨다');
  await expect(page.locator('.flight-stage')).toHaveText('과거형');
  await expect(page.locator('.flight-field')).toHaveAttribute('aria-label',/breaked.*broke/);
  await expect(page.locator('.flight-hearts')).toHaveAttribute('aria-label','남은 하트 3개');
  await expect(page.locator('.flight-score')).toHaveAttribute('aria-label','점수 0점');
  await expect(page.locator('.flight-field .flight-hearts')).toHaveCount(1);
  await expect(page.locator('.flight-play')).not.toContainText('속도');
  await expect(page.locator('.flight-play')).not.toContainText('거리');
  await expect(page.locator('.flight-scene')).toHaveAttribute('data-renderer',/pixi|fallback/);
  const frameP95=await page.evaluate(()=>new Promise<number>(resolve=>{const frames:number[]=[],end=performance.now()+700;let previous=0;const sample=(now:number)=>{if(previous)frames.push(now-previous);previous=now;if(now<end)requestAnimationFrame(sample);else resolve(frames.sort((a,b)=>a-b)[Math.floor(frames.length*.95)]??0);};requestAnimationFrame(sample);}));
  console.log(`flight ${viewport.width}x${viewport.height} ${test.info().project.name}: frame p95 ${frameP95.toFixed(1)}ms`);
  expect(frameP95).toBeLessThan(100);
  await expect.poll(()=>audioResponses.some(url=>url.includes('manifest-v2.json'))).toBe(true);
  await expect.poll(()=>audioResponses.some(url=>url.includes('flight-voice-v2.wav'))).toBe(true);
  for(const art of ['plane.webp','plane-banking.webp','gate.webp','land.webp','objects-layer.webp','clouds-layer.webp'])await expect.poll(()=>artResponses.some(url=>url.includes(`/flight/${art}`))).toBe(true);
  await page.waitForTimeout(150);
  await page.screenshot({path:`.runtime/v196-flight-opening-${viewport.width}-${test.info().project.name}.png`});
  const pageBox=await page.locator('.flight-page').boundingBox(),fieldBox=await page.locator('.flight-field').boundingBox();
  expect(fieldBox!.y+fieldBox!.height).toBeLessThanOrEqual(pageBox!.y+pageBox!.height+1);
  const heartsBox=await page.locator('.flight-hearts').boundingBox(),scoreBox=await page.locator('.flight-score').boundingBox();
  expect(heartsBox!.x).toBeLessThan(fieldBox!.x+fieldBox!.width*.3);
  expect(Math.abs(scoreBox!.x+scoreBox!.width/2-(fieldBox!.x+fieldBox!.width/2))).toBeLessThan(4);
  expect(await page.locator('.game-hub .flight-page').count()).toBe(1);
  const steer=async(x:number)=>{const box=await page.locator('.flight-field').boundingBox();await page.mouse.move(box!.x+box!.width*.5,box!.y+box!.height*.75);await page.mouse.down();await page.mouse.move(box!.x+box!.width*x,box!.y+box!.height*.75,{steps:5});await page.mouse.up();await expect(page.locator('.flight-field')).toHaveAttribute('data-plane-x',x<.5?/0\.2/:/0\.7/);};
  await expect(page.locator('.flight-field')).toHaveAttribute('data-plane-x',/0\.7/);
  await expect(page.locator('.flight-answer-cue')).toHaveText('broke',{timeout:5000});
  await expect(page.locator('.flight-question')).toHaveCSS('opacity','0');
  await page.screenshot({path:`.runtime/v197-flight-answer-${viewport.width}-${test.info().project.name}.png`});
  await page.waitForTimeout(1100);
  await page.screenshot({path:`.runtime/v196-flight-gate-${viewport.width}-${test.info().project.name}.png`});
  await expect(page.locator('.flight-stage')).toHaveText('과거분사');
  await expect(page.locator('.flight-score')).toHaveText('30');
  await expect(page.locator('.flight-field')).toHaveAttribute('aria-label',/broken.*breaken/);
  if(await page.locator('.flight-scene').getAttribute('data-renderer')==='pixi'){
   await steer(.27);await expect(page.locator('.flight-scene')).toHaveAttribute('data-bank','left');
   await steer(.73);await expect(page.locator('.flight-scene')).toHaveAttribute('data-bank','right');
  }
  await steer(.73);
  await expect(page.locator('.flight-hearts')).toHaveAttribute('aria-label','남은 하트 2개');
  await expect(page.locator('.flight-answer-cue')).toHaveText('break');
  await expect(page.locator('.flight-stage')).toHaveText('과거분사');
  await expect(page.locator('.flight-field')).toHaveAttribute('aria-label',/broken.*breaken/);
  await page.screenshot({path:`.runtime/v196-flight-retry-${viewport.width}-${test.info().project.name}.png`});
  expect(actions).not.toContain('flightHazard');expect(actions).not.toContain('flightPickup');
  const field=await page.locator('.flight-field').boundingBox();
  expect(field!.width).toBeGreaterThan(100);expect(field!.height).toBeGreaterThan(100);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  run=undefined;finishedResult={distance:100,score:30,coins:0};sendState();
  await expect(page.getByRole('dialog',{name:'비행 종료'})).toBeVisible();
  await expect(page.getByRole('dialog',{name:'비행 종료'})).toContainText('30');
  await expect(page.getByRole('button',{name:'다시 비행'})).toBeVisible();
  await expect(page.getByRole('button',{name:'미니게임으로'})).toBeVisible();
  await page.waitForTimeout(450);
  await page.screenshot({path:`.runtime/v196-flight-finished-${viewport.width}-${test.info().project.name}.png`});
  expect(errors.filter(error=>!error.startsWith('ResizeObserver loop completed')&&!error.includes('due to access control checks.'))).toEqual([]);
 }finally{await context.close();}
});
