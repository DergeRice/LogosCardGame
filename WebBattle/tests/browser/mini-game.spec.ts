import {test,expect,guestContext} from './fixtures.js';
import {defaultHubSave} from '../../shared/store.js';

for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`verb mini-game layout and sorting ${viewport.width}x${viewport.height}`,async({browser})=>{
 const context=await guestContext(browser,{viewport,isMobile:true,hasTouch:true});
 await context.addInitScript(({width,height})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width,height:height-40,offsetTop:20,offsetLeft:0,scale:1})}),viewport);
 const page=await context.newPage(),errors:string[]=[],sent:Record<string,unknown>[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.routeWebSocket('**/socket',socket=>socket.onMessage(raw=>{
  const message=JSON.parse(String(raw));sent.push(message);
  if(message.type==='hello'){
   socket.send(JSON.stringify({type:'session',id:'me',name:'미니 검사',token:'mini-token',avatar:'pronoun',rating:1000,coins:0,points:0}));
   socket.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store:defaultHubSave()}}));
  }
  if(message.type==='miniGameStatus'||message.type==='miniGameStart')socket.send(JSON.stringify({type:'miniGameState',data:{serverNow:Date.now(),season:'2026-11-01',seasonEndsAt:Date.now()+86400000,best:0,plays:0,history:[],ranking:[],...(message.type==='miniGameStart'?{run:{id:'run-1',endsAt:Date.now()+60000,lockedUntil:0,correct:0,wrong:0,left:{id:'move',line:1,label:'움직임'},right:{id:'think',line:2,label:'생각하기'},card:{id:1,word:'run'}}}:{})}}));
 }));
 try{
  await page.goto('/');await page.getByRole('tab',{name:'미니게임',exact:true}).click();
  const tiles=page.locator('.mini-tile');await expect(tiles).toHaveCount(3);
  const boxes=await tiles.evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
  if(viewport.width<viewport.height){expect(boxes[0].y).toBeLessThan(boxes[1].y);expect(boxes[1].y).toBeLessThan(boxes[2].y);}else{expect(boxes[0].x).toBeLessThan(boxes[1].x);expect(boxes[1].x).toBeLessThan(boxes[2].x);}
  await page.getByRole('button',{name:/동사 분류/}).click();await page.getByRole('button',{name:'60초 시작'}).click();
  await expect(page.getByRole('button',{name:'run 발음 듣기'})).toBeVisible();
  await page.locator('.mini-side').first().click();await expect.poll(()=>sent.filter(m=>m.type==='miniGameChoose').length).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors.filter(error=>!error.startsWith('ResizeObserver loop completed')&&!error.includes('due to access control checks.'))).toEqual([]);
 }finally{await context.close();}
});
