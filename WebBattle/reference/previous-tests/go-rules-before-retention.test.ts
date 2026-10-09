import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { Game } from '../server/game.js';
import type { Kind } from '../shared/rules.js';

test('controlled hand fixtures: high-score ties, authority transfer, pause clocks, stale choice, third-Go cap',t=>{
 // Deterministic unit fixtures. Distinct from unmodified-hand real-socket/browser validation.
 let now=1_000_000;t.mock.method(Date,'now',()=>now);
 const game=new Game(),socket=()=>({readyState:1,bufferedAmount:0,send(){}} as unknown as WebSocket);
 const a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);
 const fill=(p:typeof a,kinds:Kind[])=>{p.hand=kinds.map(kind=>({id:randomUUID(),kind}));p.handVersion++;};
 const submit=(p:typeof a)=>{now+=1600;game.action(p,{requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:[p.hand.find(c=>c.kind==='verb')!.id]});};
 const go=(p:typeof a)=>{game.choice(p,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});};
 fill(a,Array(30).fill('verb'));fill(b,Array(30).fill('verb'));for(let i=0;i<20;i++)submit(a);assert.equal(a.score,20);assert.equal(r.decision!.playerId,a.id);
 const currentDecision=()=>r.decision; const beforeEnd=r.endsAt,beforeDeal=r.nextDealAt,id=r.decision!.id,hand=b.hand.map(c=>c.id);now+=300;
 game.action(b,{requestId:randomUUID(),matchId:r.matchId,handVersion:b.handVersion,cards:[b.hand[0].id]});assert.equal(b.score,0);assert.deepEqual(b.hand.map(c=>c.id),hand);
 go(a);assert.equal(r.goCount,1);assert.equal(r.endsAt,beforeEnd+300);assert.equal(r.nextDealAt,beforeDeal+300);
 game.choice(a,{matchId:r.matchId,decisionId:id,choice:'go'});assert.equal(r.goCount,1);
 for(let i=0;i<10;i++)submit(b);assert.equal(b.score,20);assert.equal(r.decision,undefined,'tie never takes authority');submit(b);assert.equal(b.score,22);assert.equal(r.decision!.playerId,b.id);go(b);assert.equal(r.goCount,2);
 submit(a);assert.equal(a.score,23);assert.equal(r.decision!.playerId,a.id);go(a);assert.equal(r.goCount,3);
 submit(b);assert.equal(b.score,26);go(b);assert.equal(r.goCount,3);assert.ok(r.decision);game.choice(b,{matchId:r.matchId,decisionId:currentDecision()!.id,choice:'stop'});assert.equal(r.phase,'result');assert.equal(r.winner,b.id);assert.equal(b.reward,104);assert.equal(a.reward,92);
 const points=b.points;game.finish(r,'duplicate');assert.equal(b.points,points);
});

test('controlled hand fixtures: partial segment only, stale hand rejected, no immediate refill',()=>{
 const game=new Game(),p=game.hello({readyState:1,bufferedAmount:0,send(){}} as unknown as WebSocket,null,'A');game.quick(p);const r=game.rooms.get(p.room!)!;game.reveal(r);game.begin(r);
 p.hand=(['adjective','verb','adjective'] as Kind[]).map(kind=>({id:randomUUID(),kind}));const before=[...p.hand],version=p.handVersion;
 const msg={requestId:randomUUID(),matchId:r.matchId,handVersion:version,cards:before.map(c=>c.id),score:99999,winner:p.id};game.action(p,msg);game.action(p,msg);assert.equal(p.score,1);assert.deepEqual(p.hand,[before[0],before[2]]);assert.equal(r.discard[0].id,before[1].id);assert.equal(p.judgment!.usedStartIndex,1);assert.equal(p.judgment!.usedLength,1);
 game.action(p,{...msg,requestId:randomUUID()});assert.equal(p.score,1);
});
