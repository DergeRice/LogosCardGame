import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {Game} from '../server/game.js';import {snapshot,restore,nextDeadline} from '../server/persistence.js';import type {Card} from '../shared/rules.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}});
const hand=(points=26):Card[]=>[{id:randomUUID(),kind:'pronoun',variant:'pronoun-x2'},{id:randomUUID(),kind:'verb'},{id:randomUUID(),kind:'article',variant:'article-x2'},{id:randomUUID(),kind:'count',variant:points===20?undefined:'count-plus3'},{id:randomUUID(),kind:'adjective',variant:points===26?'adjective-plus3':undefined}];
function setup(){const g=new Game({minimumPlayers:2,dealMs:1e9,humanDecisionMs:120000}),a=g.hello(socket(),null,'A'),b=g.hello(socket(),null,'B');g.quick(a);g.quick(b);const r=g.rooms.get(a.room!)!;g.reveal(r);g.deal(r,5);g.begin(r);return {g,a,b,r};}
test('first effective GO starts sixty seconds; second GO and other first GO each add exactly twenty once',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);const {g,a,b,r}=setup();assert.equal(r.endsAt,0);
 const hit=(p:typeof a)=>{now+=1600;p.hand=hand();p.handVersion++;const msg={requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)};g.action(p,msg);return msg;};
 const choose=(p:typeof a)=>g.choice(p,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});
 let msg=hit(a),deadline=now+60000;assert.equal(r.endsAt,deadline);assert.equal(nextDeadline(g),deadline);assert.equal(g.view(r,a).countdownStartedAt,now);now+=5000;choose(a);assert.equal(r.endsAt,deadline);
 msg=hit(a);deadline+=20000;assert.equal(a.goHits,2);assert.equal(r.endsAt,deadline);g.action(a,msg);assert.equal(r.endsAt,deadline);choose(a);
 hit(b);deadline+=20000;assert.equal(b.goHits,1);assert.equal(r.endsAt,deadline);assert.equal(r.decision?.playerId,b.id); // A lower-scoring opponent also sees the GO choice.
 choose(b);hit(b);deadline+=20000;assert.equal(b.goHits,2);assert.equal(r.endsAt,deadline);choose(b);
 hit(a);assert.equal(a.goHits,3);assert.equal(r.endsAt,deadline); // Only the requested first-opponent/second-hit bonuses apply.
});
test('twenty-point hit opens 2GO choice and starts sixty seconds without restarting at final distribution',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);const {g,a,r}=setup();a.hand=hand(20);a.handVersion++;g.action(a,{requestId:'threshold-hit',matchId:r.matchId,handVersion:a.handVersion,cards:a.hand.map(c=>c.id)});assert.equal(a.judgment?.awardedPoints,20);assert.equal(a.goHits,1);assert.equal(r.decision?.playerId,a.id);assert.equal(r.endsAt,now+60000);
 r.deck=r.deck.slice(0,r.players.length);g.distribute(r,'automatic');assert.equal(r.deck.length,0);assert.equal(r.finalRound,true);assert.equal(r.endsAt,now+60000);assert.equal(nextDeadline(g),r.endsAt);now+=59999;g.tick();assert.equal(r.phase,'battle');now++;g.tick();assert.equal(r.phase,'result');assert.match(r.reason!,/제한 시간/);
});
test('deck exhaustion never restarts an already-running GO deadline and expiry wins over a pending choice',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);const {g,a,r}=setup();a.hand=hand();a.handVersion++;g.action(a,{requestId:'first',matchId:r.matchId,handVersion:a.handVersion,cards:a.hand.map(c=>c.id)});const deadline=r.endsAt;
 now+=10000;g.choice(a,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});r.deck=[];g.tick();assert.equal(r.endsAt,deadline);r.decision={id:'pending',playerId:a.id,startedAt:now,expiresAt:deadline+60000};assert.equal(nextDeadline(g),deadline);now=deadline;g.tick();assert.equal(r.phase,'result');assert.equal(r.decision,undefined);const coins=a.coins;g.tick();assert.equal(a.coins,coins);
});
test('GO timer and extensions persist exactly across restart and a new match clears them',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);const {g,a,r}=setup();a.hand=hand();a.handVersion++;g.action(a,{requestId:'first',matchId:r.matchId,handVersion:a.handVersion,cards:a.hand.map(c=>c.id)});const firstEnd=r.endsAt;g.choice(a,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});now+=1600;a.hand=hand();a.handVersion++;g.action(a,{requestId:'second',matchId:r.matchId,handVersion:a.handVersion,cards:a.hand.map(c=>c.id)});const deadline=r.endsAt;assert.equal(deadline,firstEnd+20000);
 now+=12345;const fresh=new Game();restore(fresh,snapshot(g));const saved=fresh.rooms.get(r.code)!;assert.equal(saved.endsAt,deadline);assert.equal(saved.countdownStartedAt,r.countdownStartedAt);assert.equal(nextDeadline(fresh),deadline);now=deadline;fresh.tick();assert.equal(saved.phase,'result');fresh.reveal(saved);assert.equal(saved.endsAt,0);assert.equal(saved.countdownStartedAt,undefined);assert.equal(saved.countdownVersion,1);
});
test('old five-minute rooms migrate to at most sixty seconds once; old first-GO rooms gain a deadline',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);const {g,a,r}=setup();r.finalRound=true;r.deck=[];r.endsAt=now+300000;delete r.countdownVersion;const records=snapshot(g),fresh=new Game();restore(fresh,records);const saved=fresh.rooms.get(r.code)!;assert.equal(saved.endsAt,now+60000);now+=10000;const again=new Game();restore(again,snapshot(fresh));assert.equal(again.rooms.get(r.code)!.endsAt,now+50000);
 r.finalRound=false;r.deck=hand();r.endsAt=0;a.goHits=1;const other=new Game();restore(other,snapshot(g));assert.equal(other.rooms.get(r.code)!.endsAt,now+60000);
});
