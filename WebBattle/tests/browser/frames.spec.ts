import {test,expect,guestContext} from './fixtures.js';
import {COSMETICS,defaultHubSave} from '../../shared/store.js';
for(const mobile of [false,true])test(`frames equip without visible names and box rewards hide names ${mobile?'mobile':'desktop'}`,async({browser})=>{
 const ctx=await guestContext(browser,{viewport:mobile?{width:844,height:390}:{width:1366,height:900},isMobile:mobile,hasTouch:mobile});
 if(mobile)await ctx.addInitScript(()=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:844,height:330,offsetTop:20,offsetLeft:0,scale:1})}));
 const frames=COSMETICS.filter(c=>c.type==='frame'),store=defaultHubSave();store.owned.push(...frames.map(c=>c.id));store.frame='frame-style-15';
 const page=await ctx.newPage(),sent:any[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',ws=>{const sync=()=>ws.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store}}));ws.onMessage(raw=>{const m=JSON.parse(String(raw));sent.push(m);if(m.type==='hello'){ws.send(JSON.stringify({type:'session',name:'프레임 검사',token:'frames-fixture',avatar:'pronoun',rating:1000,points:0,coins:10000}));sync();ws.send(JSON.stringify({type:'roomList',rooms:[]}))}if(m.type==='storeEquip'){store.frame=m.id;sync()}})});
 try{
  await page.goto('/');await page.getByRole('tab',{name:'상점',exact:true}).click({timeout:45000});
  await page.getByRole('tab',{name:'프레임',exact:true}).click();await expect(page.locator('.dust-grid article')).toHaveCount(33);await expect(page.locator('.dust-grid article>b')).toHaveCount(0);await expect(page.locator('.cosmetic-frame-preview')).toHaveCount(30);
  await page.screenshot({path:`.runtime/v95-frames-${mobile?'mobile':'desktop'}-${test.info().project.name}.png`});
  const item=page.locator('.dust-grid article').filter({has:page.locator('img[src$="style-01.webp"]')});await item.getByRole('button',{name:'장착하기',exact:true}).click();await expect(page.locator('.hub-identity .equipped-frame')).toHaveAttribute('src','/cosmetics/frames/style-01.webp');
  await page.getByRole('tab',{name:'프로필',exact:true}).click();await page.getByRole('tab',{name:'프레임',exact:true}).click();await expect(page.locator('.hub-collection button>b')).toHaveCount(0);await expect(page.locator('.hub-profile-summary .equipped-frame')).toHaveAttribute('src','/cosmetics/frames/style-01.webp');
  await page.screenshot({path:`.runtime/v95-profile-${mobile?'mobile':'desktop'}-${test.info().project.name}.png`});
  await page.getByRole('tab',{name:'상점',exact:true}).click();await page.evaluate(()=>{Math.random=()=>.9999});await page.locator('.store-box-rows>article').first().getByRole('button',{name:'1회 오픈 무료',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'상자 결과',exact:true});await expect(modal).toHaveAttribute('data-phase','cards');await modal.getByRole('button',{name:'전체 뒤집기',exact:true}).click();await expect(modal.locator('.is-revealed')).toHaveCount(1);await expect(modal.locator('.reward-card-front>b')).toHaveCount(0);await expect(modal.locator('.reward-card-front')).not.toContainText('style');await expect(modal.locator('.cosmetic-frame-preview')).toHaveCount(1);
  await modal.locator('.reward-flip-inner').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));await page.screenshot({path:`.runtime/v95-reward-${mobile?'mobile':'desktop'}-${test.info().project.name}.png`});
  expect(sent.filter(m=>m.type==='storeOpen')).toHaveLength(0);expect(sent.filter(m=>m.type==='storeEquip')).toHaveLength(1);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{await ctx.close()}
});
