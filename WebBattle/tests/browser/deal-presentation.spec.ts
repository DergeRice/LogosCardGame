import {test,expect,type WebSocketRoute} from '@playwright/test';
import {DECK_FACES,type RoomView} from '../../shared/rules.js';
test('controlled deal fixture: sequential opaque arrivals, 23-card hand, return without redeal',async({page})=>{
 const cards=DECK_FACES.slice(0,23).map((c,i)=>({...c,id:'deal-'+i}));
 const player={id:'me',name:'게스트',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:5,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'dealing',matchId:'deal-fixture',players:[player],you:'me',hand:cards.slice(0,5),handVersion:1,endsAt:Date.now()+90000,stageEndsAt:Date.now()+2400,nextDealAt:Date.now()+10000,dealSerial:1,deckCount:29,deckTotal:34,usedCards:[],dealIntervalMs:10000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:90000,log:[],expiresAt:Date.now()+600000};
 let socket:WebSocketRoute;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',ws=>{socket=ws;ws.onMessage(raw=>{if(JSON.parse(String(raw)).type!=='hello')return;ws.send(JSON.stringify({type:'session',token:'deal-fixture',name:'게스트',avatar:'pronoun',rating:1000,points:0}));ws.send(JSON.stringify({type:'home',rating:1000,points:0}));});});
 await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:'빠른시작'})).toBeVisible();socket!.send(JSON.stringify({type:'state',room}));await expect(page.locator('.battle')).toBeVisible();
 await expect(page.locator('.card-arriving').first()).toBeVisible();
 expect(await page.locator('.card-arriving').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
 await expect(page.locator('.game-card')).toHaveCount(5);await expect(page.locator('.card-arriving')).toHaveCount(0);
 room.phase='battle';room.hand=cards;room.handVersion++;room.dealSerial++;room.players[0].handCount=23;room.deckCount=11;
 socket!.send(JSON.stringify({type:'state',room}));await expect(page.locator('.game-card')).toHaveCount(23);await expect(page.locator('.card-arriving')).toHaveCount(0);
 await expect(page.locator('header,footer,.used-cards,.event-log')).toHaveCount(0);
 await expect(page.locator('.character-avatar img').first()).toBeVisible();
 await page.getByRole('button',{name:'손패 펼쳐 보기'}).click();await page.locator('[data-card-id="deal-0"]').click();await page.locator('[data-field-id="deal-0"]').click();await expect(page.locator('[data-card-id="deal-0"]')).not.toHaveClass(/card-arriving/);await expect(page.locator('.game-card')).toHaveCount(23);
 expect(errors).toEqual([]);
});
