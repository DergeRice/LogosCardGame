import {test,expect,guestContext} from './fixtures.js';
import {defaultHubSave,openDemoBox,BOXES} from '../../shared/store.js';
for(const size of ['desktop','portrait','landscape'] as const)test(`paid boxes and centered swipe offers ${size}`,async({browser})=>{
 const mobile=size!=='desktop',viewport=size==='desktop'?{width:1366,height:900}:size==='portrait'?{width:390,height:844}:{width:844,height:390};
 const ctx=await guestContext(browser,{viewport,isMobile:mobile,hasTouch:mobile});
 if(mobile)await ctx.addInitScript(({viewport})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:viewport.width,height:viewport.height-60,offsetTop:20,offsetLeft:0,scale:1})}),{viewport});
 const page=await ctx.newPage(),sent:any[]=[],errors:string[]=[];let store=defaultHubSave();store.gold=50000;store.diamonds=1000;
 page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',ws=>{const sync=()=>ws.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store}}));ws.onMessage(raw=>{const m=JSON.parse(String(raw));sent.push(m);if(m.type==='hello'){ws.send(JSON.stringify({type:'session',name:'상점 검사',token:'paid-fixture',avatar:'pronoun',rating:1000,coins:50000,points:0}));sync();}if(m.type==='storeOpen'){const opened=openDemoBox(store,m.box,m.count,()=>0);store={...opened.next,revision:(store.revision??0)+1};sync();ws.send(JSON.stringify({type:'storeResult',source:'box',box:m.box,requestId:m.requestId,rewards:opened.rewards}));}})});
 try{
  await page.goto('/');await page.getByRole('tab',{name:'상점',exact:true}).click({timeout:60000});
  await expect(page.locator('.hub-shop')).not.toContainText(/보상은 저장|상품별 별가루/);
  for(const box of BOXES){
   const row=page.locator(`[data-box=${box.id}]`);await row.scrollIntoViewIfNeeded();
   const img=(await row.locator(':scope>img').boundingBox())!,heading=(await row.getByRole('heading').boundingBox())!,offer=(await row.locator('.store-offers').boundingBox())!;
   expect(Math.abs(img.x+img.width/2-(offer.x+offer.width/2))).toBeLessThan(2);expect(offer.y).toBeGreaterThan(heading.y+heading.height);
   expect(await row.getByRole('heading').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   if(box.id==='diamond'){
    const buttons=row.locator('.store-offers>button'),third=(await buttons.nth(2).boundingBox())!,button=(await buttons.first().boundingBox())!;
    expect((offer.x+offer.width-third.x)/button.width).toBeCloseTo(.5,1);
    await row.locator('.store-offers').evaluate(el=>el.scrollTo({left:el.scrollWidth,behavior:'instant'}));await expect.poll(()=>row.locator('.store-offers').evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await row.locator('.store-offers').evaluate(el=>el.scrollTo({left:0,behavior:'instant'}));
    await row.screenshot({path:`.runtime/v103-diamond-${size}-${test.info().project.name}.png`});
   }
   const offerCount=box.id==='diamond'?1:10,cost=box.offers.find(o=>o.count===offerCount)!.cost;await row.getByRole('button',{name:`${offerCount}회 오픈 ${cost.toLocaleString()}`,exact:true}).click();
   const modal=page.getByRole('dialog',{name:'상자 결과',exact:true});await expect(modal).toHaveAttribute('data-phase','cards');await modal.getByRole('button',{name:'전체 뒤집기',exact:true}).click();await expect(modal.locator('.is-revealed')).toHaveCount(offerCount);await modal.getByRole('button',{name:'확인',exact:true}).click();
  }
  expect(sent.filter(m=>m.type==='storeOpen').map(m=>[m.box,m.count,m.storeVersion])).toEqual([['silver',10,0],['gold',10,1],['diamond',1,2]]);
  await expect(page.locator('.hub-wallet')).toContainText('12,200');await expect(page.locator('.hub-wallet')).toContainText('900');
  expect(errors).toEqual([]);expect(await page.evaluate(()=>scrollY)).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{await ctx.close()}
});
