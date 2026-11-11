import {test,expect,guestContext} from './fixtures.js';
import {defaultHubSave} from '../../shared/store.js';

for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`flight runs locally ${viewport.width}x${viewport.height}`,async({browser})=>{
 const context=await guestContext(browser,{viewport,isMobile:true,hasTouch:true});
 await context.addInitScript(({width,height})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width,height:height-40,offsetTop:20,offsetLeft:0,scale:1})}),viewport);
 const page=await context.newPage(),actions:string[]=[],errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.routeWebSocket('**/socket',socket=>socket.onMessage(raw=>{const message=JSON.parse(String(raw));actions.push(message.type);
  if(message.type==='hello'){socket.send(JSON.stringify({type:'session',id:'me',name:'비행 검사',token:'flight-token',avatar:'pronoun',rating:1000,coins:0,points:0}));socket.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store:defaultHubSave()}}));}
  if(message.type==='flightStatus'||message.type==='flightSubmit')socket.send(JSON.stringify({type:'flightState',data:{serverNow:Date.now(),season:'2026-11-01',seasonEndsAt:Date.now()+86400000,bestDistance:0,bestScore:0,plays:0,history:[],ranking:[]}}));
 }));
 try{
  await page.goto('/');await page.getByRole('tab',{name:'미니게임',exact:true}).click();await page.getByRole('button',{name:/불규칙 동사 플라이트/}).click();
  await expect(page.locator('.flight-ready-intro h2')).toHaveText('불규칙 동사 플라이트');
  await page.getByRole('button',{name:'게임 시작'}).click();
  await expect(page.locator('.flight-field')).toBeVisible();
  const first=Number(await page.locator('.flight-scene').getAttribute('data-gate-id'));
  expect(first).toBe(1);
  await expect.poll(async()=>Number(await page.locator('.flight-scene').getAttribute('data-gate-id')),{timeout:6500}).toBe(2);
  await expect(page.locator('.flight-field')).toBeVisible();
  expect(actions.filter(type=>type.startsWith('flight'))).toEqual(['flightStatus']);
  expect(errors.filter(error=>!error.startsWith('ResizeObserver loop completed'))).toEqual([]);
 }finally{await context.close();}
});
