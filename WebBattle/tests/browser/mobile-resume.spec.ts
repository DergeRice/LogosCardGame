import {test,expect} from './fixtures.js';
import type {RoomView} from '../../shared/rules.js';

test('returning from a phone interruption replaces a stale socket and keeps the match',async({page})=>{
 await page.setViewportSize({width:844,height:390});
 await page.addInitScript(()=>{const viewport=Object.assign(new EventTarget(),{width:844,height:350,offsetTop:20,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});});
 const player={id:'me',name:'나',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:0,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'resumed-match',players:[player,{...player,id:'other',name:'상대'}],you:'me',hand:[],handVersion:1,endsAt:0,stageEndsAt:0,nextDealAt:Date.now()+30000,dealSerial:1,deckCount:50,deckTotal:60,usedCards:[],dealIntervalMs:30000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:180000,durationMs:0,log:[],expiresAt:0};
 let sockets=0,ignorePings=false;
 await page.routeWebSocket('**/socket',ws=>{
  const index=++sockets;
  ws.onMessage(raw=>{
   const msg=JSON.parse(String(raw));
   if(msg.type==='hello'){
    ws.send(JSON.stringify({type:'session',token:'resume-token',name:'나',avatar:'pronoun',rating:1000,points:0}));
    ws.send(JSON.stringify({type:'state',room}));
   }
   if(msg.type==='ping'&&!(index===1&&ignorePings))ws.send(JSON.stringify({type:'pong'}));
  });
 });
 await page.goto('/');
 await expect(page.locator('.battle')).toBeVisible();
 ignorePings=true;
 await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
 await expect.poll(()=>sockets,{timeout:15000}).toBe(2);
 await expect(page.locator('.battle')).toBeVisible();
 await expect(page.getByText('상대',{exact:true}).first()).toBeVisible();
});
