import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';import {snapshot,restore} from '../server/persistence.js';import {fieldCards} from '../shared/cardViews.js';
const socket:GameSocket={readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}};
test('personal storage persists, stays private, retrieves once and rejects foreign or stale requests',()=>{
 const g=new Game({minimumPlayers:2}),a=g.hello(socket,null,'A'),b=g.hello(socket,null,'B');g.quick(a);g.quick(b);const r=g.rooms.get(a.room!)!;g.reveal(r);g.deal(r,5);g.begin(r);const card=a.hand[0],deck=r.deck.length;
 const store={type:'storeCard',matchId:r.matchId,cardId:card.id,requestId:'store',handVersion:a.handVersion};g.handle(a,store);g.handle(a,store);
 assert.equal(a.storage?.length,1);assert.ok(!a.hand.some(c=>c.id===card.id));assert.ok(!r.discard.some(c=>c.id===card.id));assert.equal(g.view(r,a).storage?.[0].id,card.id);assert.equal(g.view(r,b).storage?.length,0);assert.equal(r.deck.length,deck);
 const next=new Game();restore(next,snapshot(g));const rr=next.rooms.get(r.code)!,aa=rr.players.find(p=>p.id===a.id)!;aa.actionAt=0;
 const retrieve={matchId:rr.matchId,cardId:card.id,requestId:'retrieve',storageVersion:aa.storageVersion,handVersion:aa.handVersion};next.retrieveCard(aa,{...retrieve,storageVersion:999});assert.equal(aa.storage?.length,1);next.retrieveCard(b,retrieve);assert.equal(aa.storage?.length,1);next.retrieveCard(aa,retrieve);next.retrieveCard(aa,retrieve);assert.equal(aa.storage?.length,0);assert.equal(aa.hand.filter(c=>c.id===card.id).length,1);assert.equal(rr.deck.length,deck);
 aa.actionAt=0;rr.decision={id:'go',playerId:aa.id,startedAt:Date.now(),expiresAt:Date.now()+10000};next.discardCard(aa,{...store,matchId:rr.matchId,requestId:'blocked',handVersion:aa.handVersion});assert.equal(aa.storage?.length,0);
});
test('storing and retrieving a scored field retains score claims and cannot score the same cards twice',()=>{
 const g=new Game(),a=g.hello(socket,null,'A');g.createRoom(a);g.addRoomAI(a);const r=g.rooms.get(a.room!)!;g.reveal(r);g.begin(r);a.hand=[{id:'p',kind:'pronoun',variant:'pronoun-x2'},{id:'v',kind:'verb'}];g.action(a,{matchId:r.matchId,requestId:'score',cards:['p','v'],handVersion:a.handVersion});assert.equal(a.score,4);
 for(const id of ['p','v']){a.actionAt=0;g.discardCard(a,{matchId:r.matchId,requestId:'store-'+id,cardId:id,handVersion:a.handVersion,fieldVersion:a.fieldVersion});a.actionAt=0;g.retrieveCard(a,{matchId:r.matchId,requestId:'retrieve-'+id,cardId:id,handVersion:a.handVersion,storageVersion:a.storageVersion});}
 assert.equal(fieldCards(a).length,0);assert.equal(a.hand.length,2);assert.equal(a.score,4);a.actionAt=0;g.action(a,{matchId:r.matchId,requestId:'again',cards:['p','v'],handVersion:a.handVersion});assert.equal(a.score,4);assert.ok(a.scoreClaims?.length);
 g.reveal(r);assert.equal(a.storage?.length,0);assert.equal(a.score,0);
});
