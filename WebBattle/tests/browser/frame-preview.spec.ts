import {test,expect,guestContext} from './fixtures.js';
import {COSMETICS,defaultHubSave} from '../../shared/store.js';
for(const size of ['desktop','portrait','landscape'] as const)test(`frame image opens large preview without buying ${size}`,async({browser})=>{
 const mobile=size!=='desktop',viewport=size==='desktop'?{width:1366,height:900}:size==='portrait'?{width:390,height:844}:{width:844,height:390};
 const ctx=await guestContext(browser,{viewport,isMobile:mobile,hasTouch:mobile});
 if(mobile)await ctx.addInitScript(({viewport})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:viewport.width,height:viewport.height-60,offsetTop:20,offsetLeft:0,scale:1})}),{viewport});
 const page=await ctx.newPage(),save=defaultHubSave(),sent:any[]=[],errors:string[]=[];save.dust=1000;
 page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',ws=>{const sync=()=>ws.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store:save}}));ws.onMessage(raw=>{const m=JSON.parse(String(raw));sent.push(m);if(m.type==='hello'){ws.send(JSON.stringify({type:'session',id:'me',name:'미리보기 검사',token:'frame-preview',avatar:'pronoun',rating:1000,coins:0,points:0}));sync();}if(m.type==='storeRedeem'){const item=COSMETICS.find(c=>c.id===m.id)!;save.dust-=300;save.owned.push(item.id);sync();ws.send(JSON.stringify({type:'storeResult',source:'redeem',requestId:m.requestId,rewards:[{type:'frame',name:item.name,itemId:item.id,image:item.image,duplicate:false}]}));}})});
 try{
  await page.goto('/');await page.getByRole('tab',{name:'상점',exact:true}).click({timeout:60000});await page.getByRole('tab',{name:'프레임',exact:true}).click();
  const item=page.locator('.dust-grid article').first(),trigger=item.getByRole('button',{name:/프레임 크게 보기/});
  await trigger.click();const modal=page.getByRole('dialog',{name:'프레임 미리보기',exact:true});await expect(modal).toBeVisible();
  await expect(modal.locator('.avatar-frame-art')).toHaveAttribute('src','/cosmetics/frames/style-01.webp');
  await expect(modal.locator('.equipped-character-avatar img')).toHaveAttribute('src','/landing/mascots-mobile.webp');
  await page.keyboard.press('Tab');await expect(modal.getByRole('button',{name:'프레임 미리보기 닫기'})).toBeFocused();
  await modal.evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
  const image=(await modal.locator('.avatar-frame-art').boundingBox())!,card=(await modal.boundingBox())!;
  expect(image.width).toBeGreaterThan(100);expect(image.x).toBeGreaterThanOrEqual(card.x);expect(image.x+image.width).toBeLessThanOrEqual(card.x+card.width);
  expect(card.y).toBeGreaterThanOrEqual(mobile?20:0);expect(card.y+card.height).toBeLessThanOrEqual(mobile?viewport.height-40:viewport.height);
  await modal.screenshot({path:`.runtime/v105-preview-${size}-${test.info().project.name}.png`});
  await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);await expect(trigger).toBeFocused();
  await trigger.click();await modal.getByRole('button',{name:'프레임 미리보기 닫기'}).click();
  expect(sent.filter(m=>m.type==='storeRedeem'||m.type==='storeEquip')).toHaveLength(0);expect(save.dust).toBe(1000);expect(save.frame).toBe('');
  await item.getByRole('button',{name:'✧ 300 · 구매',exact:true}).click();await expect(page.getByRole('dialog',{name:'구매 완료',exact:true})).toBeVisible();expect(sent.filter(m=>m.type==='storeRedeem')).toHaveLength(1);expect(save.dust).toBe(700);
  expect(errors).toEqual([]);expect(await page.evaluate(()=>scrollY)).toBe(0);
 }finally{await ctx.close()}
});
