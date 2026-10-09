import {test,expect} from '@playwright/test';
import type {RoomView} from '../../shared/rules.js';
test('final countdown and explicit AI winner remain visible',async({page})=>{
 const player={id:'me',name:'나',avatar:'pronoun' as const,rating:1000,ratingDelta:0,points:0,reward:0,score:36,ready:true,connected:true,handCount:0,rematch:false,ai:false};
 const room:RoomView={code:'123456',phase:'battle',matchId:'final',players:[player,{...player,id:'ai3',name:'로고스 AI 3',score:66,ai:true}],you:'me',hand:[],handVersion:1,endsAt:Date.now()+30000,finalRound:true,stageEndsAt:0,nextDealAt:0,dealSerial:1,deckCount:0,deckTotal:60,usedCards:[],dealIntervalMs:30000,goCount:2,multiplier:3,highScore:66,serverNow:Date.now(),actionAt:0,exchangeAt:0,reconnectMs:30000,durationMs:0,log:[],expiresAt:0};
 let route:any;await page.routeWebSocket('**/socket',ws=>{route=ws;ws.onMessage(raw=>{if(JSON.parse(String(raw)).type==='hello'){ws.send(JSON.stringify({type:'session',token:'final',name:'나',avatar:'pronoun',rating:1000,points:0}));ws.send(JSON.stringify({type:'state',room}));}})});
 await page.goto('/');await expect(page.locator('.match-status')).toContainText('자동 정산');await expect(page.locator('.match-status')).toContainText('현재 선두 66점');
 room.phase='result';room.winner='ai3';room.reason='마지막 30초가 끝났어요.';route.send(JSON.stringify({type:'state',room}));await expect(page.getByRole('heading',{name:'패배 · 로고스 AI 3 승리'})).toBeVisible();await expect(page.getByRole('button',{name:'한 판 더! 재대결 ↗'})).toBeVisible();
});
