import {test,expect,guestContext} from './fixtures.js';
import {COSMETICS,defaultHubSave} from '../../shared/store.js';
import type {RoomView} from '../../shared/rules.js';
for(const layout of ['portrait','landscape'] as const)test(`home room popup and outlined match tiers ${layout}`,async({browser})=>{
 const viewport=layout==='portrait'?{width:390,height:844}:{width:844,height:390},ctx=await guestContext(browser,{viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await ctx.addInitScript(({viewport})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:viewport.width,height:viewport.height-60,offsetTop:20,offsetLeft:0,scale:1})}),{viewport});
 const page=await ctx.newPage(),errors:string[]=[],sent:any[]=[],save=defaultHubSave();save.board=COSMETICS.find(c=>c.type==='board'&&c.image&&c.id!=='board-classic')!.id;let socket:any;
 const me={id:'me',name:'이상진',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:0,rematch:false,ai:false};
 const room:RoomView={code:'896615',name:'이상진님의 방',hostId:'me',phase:'lobby',matchId:'popup-check',players:[me],you:'me',hand:[],handVersion:1,fieldVersion:0,endsAt:0,stageEndsAt:0,nextDealAt:0,dealSerial:1,dealIntervalMs:30000,deckCount:40,deckTotal:71,usedCards:[],goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 const sync=()=>socket.send(JSON.stringify({type:'state',room}));page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',ws=>{socket=ws;ws.onMessage(raw=>{const m=JSON.parse(String(raw));sent.push(m);if(m.type==='hello'){ws.send(JSON.stringify({type:'session',id:'me',name:me.name,token:'popup-fixture',avatar:'pronoun',rating:1000,coins:0,points:0}));ws.send(JSON.stringify({type:'community',community:{serverNow:Date.now(),friends:[],incoming:[],outgoing:[],invites:[],store:save}}));sync();}if(m.type==='renameRoom'){room.name=m.name;sync();}})});
 try{
  await page.goto('/');const popup=page.getByRole('dialog',{name:'대기방',exact:true});await expect(popup).toBeVisible({timeout:60000});await expect(page.locator('.game-hub')).toBeVisible();
  for(const label of ['방 이름 편집','게임 시작','방 나가기'])expect(await popup.getByRole('button',{name:label,exact:true}).evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none');
  await popup.getByRole('button',{name:'방 이름 편집'}).click();await popup.getByRole('textbox',{name:'방 이름',exact:true}).fill('친구들의 방');await popup.getByRole('button',{name:'저장',exact:true}).click();await expect(popup.getByRole('heading')).toHaveText('친구들의 방');
  const rect=(await popup.boundingBox())!;expect(rect.y).toBeGreaterThanOrEqual(20);expect(rect.y+rect.height).toBeLessThanOrEqual(viewport.height-40);await page.screenshot({path:`.runtime/v139-room-${layout}-${test.info().project.name}.png`});
  room.phase='reveal';room.players.push({...me,id:'other',name:'친구',rating:2400});room.stageEndsAt=Date.now()+60000;sync();await expect(page.locator('.versus-screen')).toBeVisible();await expect(popup).toHaveCount(0);
  expect(await page.locator('.shell').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain(COSMETICS.find(c=>c.id===save.board)!.image!);
  for(const tier of await page.locator('.match-profile>span').all()){const style=await tier.evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),color:getComputedStyle(el).color,outline:getComputedStyle(el).textShadow}));expect(style.size).toBeGreaterThanOrEqual(18);expect(style.color).toBe('rgb(255, 255, 255)');expect(style.outline).toContain('rgb(23, 35, 30)');}
  await page.screenshot({path:`.runtime/v139-match-${layout}-${test.info().project.name}.png`});expect(errors).toEqual([]);
 }finally{await ctx.close();}
});
