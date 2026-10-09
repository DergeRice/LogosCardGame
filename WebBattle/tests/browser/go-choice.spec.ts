import {test,expect} from '@playwright/test';
import {judgeCards,type Card,type RoomView} from '../../shared/rules.js';

test('20+ score finishes card calculation and score roll before Go/Stop, then Go heats the field',async({page})=>{
 const cards:Card[]=[{id:'a',kind:'pronoun',variant:'pronoun-x2'},{id:'b',kind:'verb'},{id:'c',kind:'article',variant:'article-x2'},{id:'d',kind:'count',variant:'count-plus3'},{id:'e',kind:'adjective',variant:'adjective-plus3'}];
 const me={id:'me',name:'나',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:0,ready:true,connected:true,handCount:5,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'go-ui',players:[me,{...me,id:'other',name:'상대'}],you:'me',hand:cards,handVersion:1,endsAt:0,stageEndsAt:0,nextDealAt:Date.now()+10000,dealSerial:1,deckCount:29,deckTotal:39,usedCards:[],dealIntervalMs:10000,goCount:0,multiplier:1,highScore:0,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 let ws:import('@playwright/test').WebSocketRoute;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',route=>{ws=route;route.onMessage(raw=>{const msg=JSON.parse(String(raw));if(msg.type==='hello'){route.send(JSON.stringify({type:'session',token:'go-ui',name:'나',avatar:'pronoun',rating:1000,points:0}));route.send(JSON.stringify({type:'state',room}));}if(msg.type==='submit'){
  room.judgment={...judgeCards(cards),accepted:true,submissionId:msg.requestId};room.players[0].score=26;room.highScore=26;room.hand=[];room.handVersion++;room.decision={id:'go-choice',playerId:'me',startedAt:Date.now(),expiresAt:0};route.send(JSON.stringify({type:'ack',requestId:msg.requestId}));route.send(JSON.stringify({type:'state',room}));
 }if(msg.type==='choice'){expect(msg.choice).toBe('go');room.goCount=1;room.multiplier=2;room.decision=undefined;route.send(JSON.stringify({type:'state',room}));}});});
 await page.goto('/');await page.getByRole('button',{name:'손패 펼쳐 보기'}).click();for(const card of cards)await page.locator(`[data-card-id="${card.id}"]`).click();
 await page.getByRole('button',{name:'문장 제출'}).click();
 await expect(page.locator('.score-calculation[data-phase="calculating"]')).toBeVisible();
 await expect(page.getByRole('dialog',{name:'고 스톱 선택'})).toHaveCount(0);
 await expect(page.locator('.score-calculation[data-phase="complete"]')).toBeVisible();
 await expect(page.getByTestId('my-score')).toHaveText('26');
 await expect(page.getByRole('dialog',{name:'고 스톱 선택'})).toBeVisible();
 await page.reload();await expect(page.getByRole('dialog',{name:'고 스톱 선택'})).toBeVisible();
 await expect(page.getByText('미선택 시 자동 스톱')).toHaveCount(0);
 await page.getByRole('button',{name:'고!',exact:true}).click();await expect(page.locator('.sentence-area')).toHaveClass(/burn-level-1/);
 await expect(page.locator('.round-strip')).not.toContainText('전원 2배');
 const heat1=await page.locator('.sentence-area').evaluate(el=>getComputedStyle(el).boxShadow);
 room.goCount=3;room.multiplier=4;ws!.send(JSON.stringify({type:'state',room}));await expect(page.locator('.sentence-area')).toHaveClass(/burn-level-3/);
 const heat3=await page.locator('.sentence-area').evaluate(el=>getComputedStyle(el).boxShadow);expect(heat3).not.toBe(heat1);expect(errors).toEqual([]);
 await page.screenshot({path:'docs/screenshots/go-field-heat.png',fullPage:true});
});
