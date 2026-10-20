import {test,expect,guestContext} from './fixtures.js';
import {COSMETICS,defaultHubSave} from '../../shared/store.js';
for(const width of [320,390])test(`portrait frames fit shop profile ranks and ten rewards ${width}`,async({browser})=>{
 const ctx=await guestContext(browser,{viewport:{width,height:844},isMobile:true,hasTouch:true});
 await ctx.addInitScript(({width})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width,height:764,offsetTop:24,offsetLeft:0,scale:1})}),{width});
 const page=await ctx.newPage(),store=defaultHubSave(),errors:string[]=[];store.owned.push('frame-style-15');store.frame='frame-style-15';store.gold=20000;
 page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',ws=>{const sync=()=>ws.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store}}));ws.onMessage(raw=>{const m=JSON.parse(String(raw));if(m.type==='hello'){ws.send(JSON.stringify({type:'session',id:'me',name:'프레임 검사',avatar:'pronoun',rating:1000,token:'portrait-frames',coins:store.gold,points:0}));sync();}if(m.type==='storeOpen'){store.gold-=9800;sync();ws.send(JSON.stringify({type:'storeResult',requestId:m.requestId,source:'box',box:'silver',rewards:COSMETICS.filter(c=>c.type==='frame').slice(0,10).map(c=>({type:'frame',itemId:c.id,name:c.name,image:c.image,duplicate:false}))}));}})});
 try{
  await page.goto('/');await page.getByRole('tab',{name:'상점',exact:true}).click({timeout:60000});await page.getByRole('tab',{name:'프레임',exact:true}).click();
  const shop=page.locator('.dust-grid .cosmetic-frame-preview').first();await shop.scrollIntoViewIfNeeded();
  const fits=async(selector:string,parent:string)=>page.locator(selector).evaluateAll((imgs,parent)=>imgs.every(img=>{const a=img.getBoundingClientRect(),b=img.closest(parent)!.getBoundingClientRect();return a.width>0&&a.height>0&&a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1}),parent);
  expect(await fits('.dust-grid .cosmetic-frame-preview>img','.dust-grid article')).toBe(true);
  await page.getByRole('tab',{name:'프로필',exact:true}).click();await page.getByRole('tab',{name:'프레임',exact:true}).click();expect(await fits('.hub-collection .cosmetic-frame-preview>img','.hub-collection button')).toBe(true);
  await page.getByRole('tab',{name:'랭킹',exact:true}).click();await expect(page.locator('.hub-ranking-list .avatar-frame-art').first()).toBeVisible();
  await page.getByRole('tab',{name:'상점',exact:true}).click();await page.locator('[data-box=silver]').getByRole('button',{name:'10회 오픈 9,800 골드',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'상자 결과',exact:true});await expect(modal).toHaveAttribute('data-phase','cards');await modal.getByRole('button',{name:'전체 뒤집기',exact:true}).click();await expect(modal.locator('.is-revealed')).toHaveCount(10);
  await modal.locator('.reward-flip-inner').first().evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
  await expect(modal.locator('.cosmetic-frame-preview>img')).toHaveCount(10);expect(await fits('.reward-card-front .cosmetic-frame-preview>img','.reward-card-front')).toBe(true);
  await modal.screenshot({path:`.runtime/v104-frames-${width}-${test.info().project.name}.png`});
  const bounds=(await modal.boundingBox())!;expect(bounds.y).toBeGreaterThanOrEqual(24);expect(bounds.y+bounds.height).toBeLessThanOrEqual(788);
  expect(errors).toEqual([]);expect(await page.evaluate(()=>scrollY)).toBe(0);
 }finally{await ctx.close()}
});
