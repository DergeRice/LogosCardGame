import {test,expect,guestContext} from './fixtures.js';
import {COSMETICS,defaultHubSave} from '../../shared/store.js';
import type {RoomView} from '../../shared/rules.js';
for(const layout of ['desktop','mobile','portrait'] as const)test(`70 supplied emotes shop loadout and battle ${layout}`,async({browser})=>{
 const mobile=layout!=='desktop',viewport=layout==='portrait'?{width:390,height:844}:mobile?{width:844,height:390}:{width:1366,height:900};const ctx=await guestContext(browser,{viewport,isMobile:mobile,hasTouch:mobile});
 if(mobile)await ctx.addInitScript(({viewport})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:viewport.width,height:viewport.height-60,offsetTop:20,offsetLeft:0,scale:1})}),{viewport});
 const page=await ctx.newPage(),save=defaultHubSave(),added=COSMETICS.filter(c=>c.type==='emote'&&c.image.startsWith('/cosmetics/emotes/')),errors:string[]=[];
 save.owned.push(...added.map(c=>c.id));const selected=['트랜스 미소','트랜스 인사','코리쉬 사랑','코리쉬 고민'].map(name=>added.find(c=>c.name===name)!);
 page.on('pageerror',e=>errors.push(e.message));const me={id:'me',name:'감정표현 검사',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:0,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'new-emote-fixture',players:[me,{...me,id:'other',name:'상대'}],you:'me',hand:[],handVersion:1,fieldVersion:0,endsAt:0,stageEndsAt:0,nextDealAt:Date.now()+30000,dealSerial:1,deckCount:40,deckTotal:71,usedCards:[],dealIntervalMs:30000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 await page.routeWebSocket('**/socket',ws=>{const sync=()=>ws.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store:save}}));ws.onMessage(raw=>{const m=JSON.parse(String(raw));if(m.type==='hello'){ws.send(JSON.stringify({type:'session',id:'me',uuid:'me',name:me.name,token:'emotes-fixture',avatar:'pronoun',rating:1000,coins:0,points:0}));sync();}if(m.type==='storeEmotes'){save.emotes=m.slots;sync();}if(m.type==='quick'){room.emoteLoadout=save.emotes!.filter((id):id is string=>!!id);ws.send(JSON.stringify({type:'state',room}));}if(m.type==='react'){room.players[0].reaction={id:'new-reaction',emoji:m.emoji,at:Date.now()};ws.send(JSON.stringify({type:'state',room}));}})});
 try{
  await page.goto('/');await page.getByRole('tab',{name:'상점',exact:true}).click({timeout:60000});await page.getByRole('tab',{name:'이모티콘',exact:true}).click();await expect(page.locator('.dust-grid article')).toHaveCount(80);
  await expect(page.locator('.dust-grid img[src*="/cosmetics/emotes/"]')).toHaveCount(70);
  for(const item of selected){const image=page.locator('.dust-grid').getByAltText(item.name,{exact:true});await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBe(512);}
  await page.screenshot({path:`.runtime/v109-shop-${layout}-${test.info().project.name}.png`});
  await page.getByRole('tab',{name:'프로필',exact:true}).click();await page.getByRole('button',{name:'감정표현 장착',exact:true}).click();const dialog=page.getByRole('dialog',{name:'감정표현 장착',exact:true});
  for(let i=0;i<4;i++){await dialog.getByRole('button',{name:new RegExp(`^감정표현 슬롯 ${i+1}`)}).click();await dialog.getByRole('button',{name:selected[i].name+' 선택',exact:true}).click();}
  await page.screenshot({path:`.runtime/v109-loadout-${layout}-${test.info().project.name}.png`});await dialog.getByRole('button',{name:'저장',exact:true}).click();
  await page.getByRole('tab',{name:'홈',exact:true}).click();await page.getByRole('button',{name:'빠른 시작',exact:true}).click();await page.getByRole('button',{name:'감정표현 열기',exact:true}).click();await expect(page.locator('.emoji-options button')).toHaveCount(4);
  await page.getByRole('button',{name:selected[1].name+' 감정표현 보내기',exact:true}).click();await expect(page.locator('.reaction-bubble img')).toHaveAttribute('alt',selected[1].name);await expect.poll(()=>page.locator('.reaction-bubble img').evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBe(512);
  await page.screenshot({path:`.runtime/v109-battle-${layout}-${test.info().project.name}.png`});expect(errors).toEqual([]);expect(await page.evaluate(()=>scrollY)).toBe(0);
 }finally{await ctx.close();}
});
