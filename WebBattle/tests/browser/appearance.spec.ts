import {test,expect,guestContext} from './fixtures.js';
import {COSMETICS,defaultHubSave} from '../../shared/store.js';
import type {RoomView} from '../../shared/rules.js';
for(const mobile of [false,true])test(`character portrait home background and game board ${mobile?'mobile':'desktop'}`,async({browser})=>{
 const ctx=await guestContext(browser,{viewport:mobile?{width:844,height:390}:{width:1366,height:900},isMobile:mobile,hasTouch:mobile});
 if(mobile)await ctx.addInitScript(()=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:844,height:330,offsetTop:20,offsetLeft:0,scale:1})}));
 const page=await ctx.newPage(),store=defaultHubSave(),errors:string[]=[];store.owned.push('character-table','background-table','board-garden','frame-style-15');
 page.on('pageerror',e=>errors.push(e.message));
 const me={id:'me',name:'외형 검사',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:0,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'appearance-fixture',players:[me,{...me,id:'other'}],you:'me',hand:[],handVersion:1,fieldVersion:0,endsAt:0,stageEndsAt:0,nextDealAt:Date.now()+30000,dealSerial:1,deckCount:40,deckTotal:71,usedCards:[],dealIntervalMs:30000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 await page.routeWebSocket('**/socket',ws=>{const sync=()=>ws.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store}}));ws.onMessage(raw=>{const m=JSON.parse(String(raw));if(m.type==='hello'){ws.send(JSON.stringify({type:'session',id:'me',uuid:'me',name:me.name,token:'appearance-fixture',avatar:'pronoun',rating:1000,coins:0,points:0}));sync();}if(m.type==='storeEquip'){const item=COSMETICS.find(c=>c.id===m.id)!;(store as any)[item.type]=item.id;sync();}if(m.type==='quick'){room.players[0]={...me,characterId:store.character,frameId:store.frame};ws.send(JSON.stringify({type:'state',room}));}})});
 try{
  await page.goto('/');await page.getByRole('tab',{name:'프로필',exact:true}).click({timeout:60000});await expect(page.getByRole('tablist',{name:'치장 분류'}).getByRole('tab')).toHaveCount(4);
  await page.locator('.hub-collection>button').filter({hasText:'카드 테이블'}).click();await expect(page.locator('.hub-profile-summary .equipped-character-avatar img')).toHaveAttribute('src','/brand-ui/loading-under.png');
  await page.getByRole('tab',{name:'홈 배경',exact:true}).click();await page.locator('.hub-collection>button').filter({hasText:'로고스 테이블'}).click();
  await page.getByRole('tab',{name:'보드판',exact:true}).click();await page.locator('.hub-collection>button').filter({hasText:'정원 보드'}).click();await expect(page.locator('.hub-collection .equipped')).toContainText('정원 보드');
  await page.getByRole('tab',{name:'프레임',exact:true}).click();await page.locator('.hub-collection>button').filter({has:page.locator('img[src$="style-15.webp"]')}).click();
  await page.getByRole('button',{name:'프로필 설정',exact:true}).click();const modal=page.getByRole('dialog',{name:'프로필 설정',exact:true});await expect(modal).toContainText('홈에 장착한 캐릭터');await expect(modal.locator('.equipped-character-avatar img')).toHaveAttribute('src','/brand-ui/loading-under.png');await modal.getByRole('button',{name:'닫기',exact:true}).click();
  await page.getByRole('tab',{name:'홈',exact:true}).click();await expect(page.locator('.hub-main-character')).toHaveAttribute('src','/brand-ui/loading-under.png');await expect(page.locator('.hub-identity .equipped-character-avatar img')).toHaveAttribute('src','/brand-ui/loading-under.png');
  expect(await page.locator('.game-hub').evaluate(el=>(el as HTMLElement).style.getPropertyValue('--hub-background'))).toContain('/brand-ui/game-back.png');
  await page.screenshot({path:`.runtime/v101-home-${mobile?'mobile':'desktop'}-${test.info().project.name}.png`});
  await page.getByRole('button',{name:'빠른 시작',exact:true}).click();await expect(page.locator('.table-player.self .equipped-character-avatar img')).toHaveAttribute('src','/brand-ui/loading-under.png');await expect(page.locator('.table-player.self .avatar-frame-art')).toHaveAttribute('src','/cosmetics/frames/style-15.webp');await expect(page.locator('.shell')).toHaveCSS('background-image',/landing\/background.jpg/);
  await page.screenshot({path:`.runtime/v101-battle-${mobile?'mobile':'desktop'}-${test.info().project.name}.png`});expect(errors).toEqual([]);expect(await page.evaluate(()=>scrollY)).toBe(0);
 }finally{await ctx.close();}
});
