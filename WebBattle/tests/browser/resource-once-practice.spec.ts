import {test,expect,guestContext} from './fixtures.js';
import {COSMETICS,defaultHubSave} from '../../shared/store.js';
import {BUILD_VERSION} from '../../src/buildVersion.js';

for(const layout of ['portrait','landscape'] as const)test(`resources load once and practice uses equipped board ${layout}`,async({browser})=>{
 const viewport=layout==='portrait'?{width:390,height:844}:{width:844,height:390};
 const ctx=await guestContext(browser,{viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await ctx.addInitScript(({viewport})=>{
  Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:viewport.width,height:viewport.height-60,offsetTop:20,offsetLeft:0,scale:1})});
  const NativeImage=window.Image;let count=0;
  (window as any).__imagesCreated=()=>count;
  (window as any).Image=class extends NativeImage{constructor(width?:number,height?:number){super(width,height);count++;}};
 },{viewport});
 const page=await ctx.newPage(),save=defaultHubSave(),board=COSMETICS.find(c=>c.type==='board'&&c.id!=='board-classic'&&c.image)!;
 save.board=board.id;save.owned.push(board.id);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',socket=>{socket.onMessage(raw=>{if(JSON.parse(String(raw)).type==='hello'){socket.send(JSON.stringify({type:'session',id:'me',uuid:'resource-check',name:'리소스 검사',token:'resource-fixture',avatar:'pronoun',rating:1000,coins:0,points:0}));socket.send(JSON.stringify({type:'community',community:{serverNow:Date.now(),friends:[],incoming:[],outgoing:[],invites:[],store:save}}));}})});
 try{
  await page.goto('/');await expect(page.locator('.game-hub')).toBeVisible({timeout:60000});
  const first=await page.evaluate(()=>(window as any).__imagesCreated());expect(first).toBeGreaterThan(300);
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('logos-assets-ready'))).toBe(BUILD_VERSION);
  await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('logos-equipped-board-id'))).toBe(board.id);
  await page.reload();await expect(page.locator('.game-hub')).toBeVisible({timeout:30000});expect(await page.evaluate(()=>(window as any).__imagesCreated())).toBeLessThanOrEqual(2);
  await expect(page.locator('.card-preload-screen')).toHaveCount(0);
  await page.goto('/practice');await expect(page.getByRole('main',{name:'연습 모드'})).toBeVisible();
  expect(await page.locator('.practice-shell').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain(board.image);
  await page.screenshot({path:`.runtime/v140-practice-${layout}-${test.info().project.name}.png`});
  await page.goto('/');await expect(page.locator('.game-hub')).toBeVisible({timeout:30000});expect(await page.evaluate(()=>(window as any).__imagesCreated())).toBeLessThanOrEqual(2);
  expect(errors.filter(message=>!message.includes('/landing/mascots-mobile.webp due to access control checks.'))).toEqual([]);
 }finally{await ctx.close();}
});
