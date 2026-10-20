import {test,expect,guestContext} from './fixtures.js';import {COSMETICS,defaultHubSave} from '../../shared/store.js';import {HOME_CHARACTERS} from '../../shared/homeCharacters.js';
for(const size of ['desktop','portrait','landscape'] as const)test(`home character purchase selection pose cycle and Pixi lifecycle ${size}`,async({browser})=>{
 const mobile=size!=='desktop',viewport=size==='desktop'?{width:1366,height:900}:size==='portrait'?{width:390,height:844}:{width:844,height:390};
 const ctx=await guestContext(browser,{viewport,isMobile:mobile,hasTouch:mobile});if(mobile)await ctx.addInitScript(({viewport})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:viewport.width,height:viewport.height-60,offsetTop:20,offsetLeft:0,scale:1})}),{viewport});
 const page=await ctx.newPage(),save=defaultHubSave(),sent:any[]=[],errors:string[]=[];save.dust=850;const rabbit=HOME_CHARACTERS.find(c=>c.id==='character-rabbit')!;
 page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',ws=>{const sync=()=>ws.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store:save}}));ws.onMessage(raw=>{const m=JSON.parse(String(raw));sent.push(m);if(m.type==='hello'){ws.send(JSON.stringify({type:'session',id:'me',name:'홈 캐릭터 검사',token:'home-char',avatar:'pronoun',rating:1000,coins:0,points:0}));sync();}if(m.type==='storeRedeem'){const item=COSMETICS.find(c=>c.id===m.id)!;save.dust-=850;save.owned.push(item.id);save.revision=1;sync();ws.send(JSON.stringify({type:'storeResult',source:'redeem',requestId:m.requestId,rewards:[{type:'character',itemId:item.id,name:item.name,image:item.image,duplicate:false}]}));}if(m.type==='storeEquip'){save.character=m.id;sync();}})});
 try{
  await page.goto('/');await page.getByRole('button',{name:'홈 캐릭터 선택',exact:true}).click({timeout:60000});const picker=page.getByRole('dialog',{name:'홈 캐릭터 선택',exact:true});await expect(picker.getByRole('button',{name:/토끼/})).toHaveCount(0);
  await picker.getByRole('button',{name:'상점',exact:true}).click();const item=page.locator('.dust-grid article').filter({has:page.getByText('토끼',{exact:true})});await item.getByRole('button',{name:'✧ 850 · 구매',exact:true}).click();await page.getByRole('dialog',{name:'구매 완료',exact:true}).getByRole('button',{name:'확인',exact:true}).click();
  await page.getByRole('tab',{name:'홈',exact:true}).click();await page.getByRole('button',{name:'홈 캐릭터 선택',exact:true}).click();await picker.getByRole('button',{name:/토끼.*장착하기/}).click();
  const actor=page.getByRole('button',{name:'토끼 다음 표정',exact:true}),image=page.locator('.hub-main-character'),canvas=page.locator('.home-character-canvas');
  await expect(actor).toHaveAttribute('data-renderer','pixi');await expect(image).toHaveAttribute('src',rabbit.image);await expect(canvas).toHaveAttribute('data-texture-source',rabbit.image);
  const before=sent.length;
  for(let i=1;i<=10;i++){await actor.click();await expect(actor).toHaveAttribute('data-pose-index',String(i%10));await expect(image).toHaveAttribute('src',rabbit.poses[i%10].image);await expect(canvas).toHaveAttribute('data-texture-source',rabbit.poses[i%10].image);}
  expect(sent.slice(before).some(m=>['storeEmotes','storeEquip','storeRedeem'].includes(m.type))).toBe(false);expect(save.dust).toBe(0);expect(save.owned.includes(rabbit.poses[0].id)).toBe(false);
  const bounds=(await actor.boundingBox())!;expect(bounds.width).toBeGreaterThan(100);expect(bounds.height).toBeGreaterThan(100);expect(bounds.y).toBeGreaterThanOrEqual(mobile?20:0);expect(bounds.y+bounds.height).toBeLessThanOrEqual(mobile?viewport.height-40:viewport.height);
  await page.screenshot({path:`.runtime/v108-home-${size}-${test.info().project.name}.png`});
  await page.getByRole('tab',{name:'프로필',exact:true}).click();await expect(page.locator('.home-character-canvas')).toHaveCount(0);await expect(page.locator('.hub-profile-summary .equipped-character-avatar img')).toHaveAttribute('src',rabbit.image);
  await page.getByRole('tab',{name:'홈',exact:true}).click();await expect(actor).toHaveAttribute('data-renderer','pixi');await expect(actor).toHaveAttribute('data-pose-index','0');
  await canvas.locator('canvas').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(actor).toHaveAttribute('data-renderer','fallback');await expect(image).toBeVisible();
  expect(errors).toEqual([]);expect(await page.evaluate(()=>scrollY)).toBe(0);
 }finally{await ctx.close()}
});
