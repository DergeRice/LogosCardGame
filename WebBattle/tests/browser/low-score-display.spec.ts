import {test,expect,guestContext} from './fixtures.js';import type {RoomView} from '../../shared/rules.js';
for(const size of ['desktop','portrait','landscape'] as const)test(`low sentence scores appear without increasing totals ${size}`,async({browser})=>{
 const mobile=size!=='desktop',viewport=size==='desktop'?{width:1366,height:900}:size==='portrait'?{width:390,height:844}:{width:844,height:390};
 const ctx=await guestContext(browser,{viewport,isMobile:mobile,hasTouch:mobile});if(mobile)await ctx.addInitScript(({viewport})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:viewport.width,height:viewport.height-60,offsetTop:20,offsetLeft:0,scale:1})}),{viewport});
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const me={id:'me',name:'플레이어',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:2,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'low-score-display',players:[{...me,lastAction:{id:'low-human',text:'문장 2점 · 기준 미달'}},{...me,id:'ai',name:'로고스 AI 1',ai:true,lastAction:{id:'low-ai',text:'문장 13점 · 기준 미달'}}],you:'me',hand:[],handVersion:1,fieldVersion:0,endsAt:0,stageEndsAt:0,nextDealAt:Date.now()+30000,dealSerial:1,deckCount:40,deckTotal:71,usedCards:[],dealIntervalMs:30000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const m=JSON.parse(String(raw));if(m.type==='hello')ws.send(JSON.stringify({type:'session',id:'me',uuid:'me',name:me.name,token:'low-display',avatar:'pronoun',rating:1000,coins:0,points:0}));if(m.type==='quick')ws.send(JSON.stringify({type:'state',room}));}));
 try{
  await page.goto('/');await page.getByRole('button',{name:'빠른 시작',exact:true}).click({timeout:60000});
  const ai=page.locator('.table-player[data-player-id=ai] .player-last-action'),human=page.locator('.table-player.self .player-last-action');
  await expect(ai).toHaveText('문장 13점 · 기준 미달');await expect(human).toHaveText('문장 2점 · 기준 미달');
  await expect(page.getByTestId('my-score')).toHaveText('0');await expect(page.getByTestId('opponent-score')).toHaveText('0');
  for(const el of [ai,human]){const r=(await el.boundingBox())!;expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(viewport.width);expect(r.y).toBeGreaterThanOrEqual(mobile?20:0);}
  await page.screenshot({path:`.runtime/v107-low-scores-${size}-${test.info().project.name}.png`});await expect(ai).toHaveCount(0);await expect(human).toHaveCount(0);
  await expect(page.getByTestId('opponent-score')).toHaveText('0');expect(errors).toEqual([]);expect(await page.evaluate(()=>scrollY)).toBe(0);
 }finally{await ctx.close()}
});
