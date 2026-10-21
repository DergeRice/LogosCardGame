import {test,expect,guestContext} from './fixtures.js';
import {defaultHubSave} from '../../shared/store.js';
import type {RoomView} from '../../shared/rules.js';

for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`equipped constellation board loads at source resolution ${viewport.width}x${viewport.height}`,async({browser})=>{
 const ctx=await guestContext(browser,{viewport,isMobile:true,hasTouch:true}),page=await ctx.newPage(),save=defaultHubSave();
 save.board='board-은하수';save.owned.push(save.board);
 const me={id:'me',name:'보드 확인',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:0,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'board-fixture',players:[me,{...me,id:'other'}],you:'me',hand:[],handVersion:1,fieldVersion:0,endsAt:0,stageEndsAt:0,nextDealAt:0,dealSerial:1,dealIntervalMs:30000,deckCount:40,deckTotal:71,usedCards:[],goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const m=JSON.parse(String(raw));if(m.type==='hello'){ws.send(JSON.stringify({type:'session',id:'me',name:me.name,token:'board-fixture',avatar:'pronoun',rating:1000,coins:0,points:0}));ws.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store:save}}));}if(m.type==='quick')ws.send(JSON.stringify({type:'state',room}));}));
 try{await page.goto('/');await page.getByRole('button',{name:'빠른 시작',exact:true}).click({timeout:60000});await expect(page.locator('.shell:has(.battle)')).toHaveCSS('background-image',/cosmetics\/boards\/.+\.webp/);const image=await page.evaluate(async()=>{const css=getComputedStyle(document.querySelector('.shell')!).backgroundImage,url=css.match(/url\("?([^"\)]+)/)?.[1];if(!url)return null;const img=new Image();img.src=url;await img.decode();return {width:img.naturalWidth,height:img.naturalHeight};});expect(image).toEqual({width:1850,height:850});await page.screenshot({path:`.runtime/v148-board-${viewport.width}.png`});}finally{await ctx.close();}
});
