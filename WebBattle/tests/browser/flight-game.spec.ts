import {test,expect,guestContext} from './fixtures.js';
import {defaultHubSave} from '../../shared/store.js';
import {FLIGHT_VERBS} from '../../server/flightWords.js';

for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`flight runs locally ${viewport.width}x${viewport.height}`,async({browser})=>{
 const context=await guestContext(browser,{viewport,isMobile:true,hasTouch:true});
 await context.addInitScript(({width,height})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width,height:height-40,offsetTop:20,offsetLeft:0,scale:1})}),viewport);
 const page=await context.newPage(),actions:string[]=[],errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.routeWebSocket('**/socket',socket=>socket.onMessage(raw=>{const message=JSON.parse(String(raw));actions.push(message.type);
  if(message.type==='hello'){socket.send(JSON.stringify({type:'session',id:'me',name:'비행 검사',token:'flight-token',avatar:'pronoun',rating:1000,coins:0,points:0}));socket.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store:defaultHubSave()}}));}
  if(message.type==='flightStatus'||message.type==='flightSubmit')socket.send(JSON.stringify({type:'flightState',data:{serverNow:Date.now(),season:'2026-11-01',seasonEndsAt:Date.now()+86400000,bestDistance:0,bestScore:0,plays:0,history:[],ranking:Array.from({length:4},(_,i)=>({id:`rank-${i}`,name:`유저 ${i+1}`,score:120-i,frameId:i===0?'frame-style-01':undefined}))}}));
 }));
 try{
  await page.goto('/');await page.getByRole('tab',{name:'미니게임',exact:true}).click();await page.getByRole('button',{name:/불규칙 동사 플라이트/}).click();
  await expect(page.locator('.flight-title-button img')).toBeVisible();
  expect(await page.locator('.flight-title-button img').evaluate(img=>(img as HTMLImageElement).currentSrc)).toContain('flight-landscape.webp');
  await expect(page.locator('.flight-ranking li')).toHaveCount(4);
  const lastRank=await page.locator('.flight-ranking li').last().boundingBox(),ranking=await page.locator('.flight-ranking').boundingBox();
  expect(lastRank!.y+lastRank!.height).toBeLessThanOrEqual(ranking!.y+ranking!.height+1);
  const framed=page.locator('.flight-ranking li').first().locator('.avatar-with-frame');
  await expect(framed).toBeVisible();
  const frame=await framed.boundingBox(),face=await framed.locator('.character-avatar').boundingBox();
  expect(Math.abs(frame!.x+frame!.width/2-face!.x-face!.width/2)).toBeLessThan(2);
  expect(Math.abs(frame!.y+frame!.height/2-face!.y-face!.height/2)).toBeLessThan(2);
  await page.screenshot({path:`.runtime/v219-flight-ready-${viewport.width}-${test.info().project.name}.png`});
  await page.getByRole('button',{name:'게임 시작',exact:true}).click();
  await expect(page.locator('.flight-field')).toBeVisible();
  const first=Number(await page.locator('.flight-scene').getAttribute('data-gate-id'));
  expect(first).toBe(1);
  await expect.poll(async()=>Number(await page.locator('.flight-scene').getAttribute('data-gate-id')),{timeout:10000}).toBe(2);
  await expect(page.locator('.flight-field')).toBeVisible();
  expect(actions.filter(type=>type.startsWith('flight'))).toEqual(['flightStatus']);
  if(viewport.width===390){
   for(let miss=0;miss<3;miss++){
    const hearts=Number((await page.locator('.flight-hearts').getAttribute('aria-label'))?.match(/\d+/)?.[0]);
    if(hearts===0)break;
    const gateId=Number(await page.locator('.flight-scene').getAttribute('data-gate-id'));
    const base=await page.locator('.flight-scene').getAttribute('data-word');
    const stage=await page.locator('.flight-scene').getAttribute('data-stage-word');
    const label=await page.locator('.flight-field').getAttribute('aria-label');
    const options=label?.match(/왼쪽 (.*), 오른쪽 (.*)\.$/);
    expect(options).not.toBeNull();
    const verb=FLIGHT_VERBS.find(item=>item.base===base)!;
    const answer=stage?.includes('과거분사')?verb.participle:verb.past;
    await page.locator('.flight-field').press(options![1]===answer?'ArrowRight':'ArrowLeft');
    if(hearts>1)await expect.poll(async()=>Number(await page.locator('.flight-scene').getAttribute('data-gate-id')),{timeout:10000}).toBe(gateId+1);
   }
   await expect(page.getByRole('dialog',{name:'비행 종료'})).toBeVisible({timeout:10000});
   expect(actions.filter(type=>type.startsWith('flight'))).toEqual(['flightStatus','flightSubmit']);
  }
  expect(errors.filter(error=>!error.startsWith('ResizeObserver loop completed'))).toEqual([]);
 }finally{await context.close();}
});
