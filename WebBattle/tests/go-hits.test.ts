import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Game} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';
import type {Card} from '../shared/rules.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}});
const hand=():Card[]=>[{id:randomUUID(),kind:'pronoun',variant:'pronoun-x2'},{id:randomUUID(),kind:'verb'},{id:randomUUID(),kind:'article',variant:'article-x2'},{id:randomUUID(),kind:'count',variant:'count-plus3'},{id:randomUUID(),kind:'adjective',variant:'adjective-plus3'}];
test('effective hits achieve 1/2/3GO; challenges grant cards and 5x/15x without advancing hits',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);
 const g=new Game({minimumPlayers:2}),a=g.hello(socket(),null,'A'),b=g.hello(socket(),null,'B');g.quick(a);g.quick(b);const r=g.rooms.get(a.room!)!;g.reveal(r);g.begin(r);
 const hit=()=>{a.hand=hand();a.handVersion++;now+=1600;g.action(a,{requestId:randomUUID(),matchId:r.matchId,handVersion:a.handVersion,cards:a.hand.map(c=>c.id)});};
 const challenge=()=>g.choice(a,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});
 hit();assert.equal(a.goHits,1);assert.equal(r.goCount,1);assert.equal(r.goTarget,undefined);assert.equal(r.decision?.playerId,a.id);
 let before=[a.hand.length,b.hand.length];challenge();assert.deepEqual([a.hand.length-before[0],b.hand.length-before[1]],[2,1]);assert.equal(a.goHits,1);assert.equal(r.goCount,1);assert.equal(r.goTarget,2);
 // A restart while challenging 2GO must retain both the achieved count and 5x reward.
 const fresh=new Game();restore(fresh,snapshot(g));const saved=fresh.rooms.get(r.code)!;assert.equal(saved.goCount,1);assert.equal(saved.goTarget,2);fresh.finish(saved,'stop');assert.equal(fresh.sessions.get(a.token)!.reward,250);
 hit();assert.equal(a.goHits,2);assert.equal(r.goCount,2);assert.equal(a.score,58);before=[a.hand.length,b.hand.length];challenge();assert.deepEqual([a.hand.length-before[0],b.hand.length-before[1]],[2,1]);assert.equal(r.goCount,2);assert.equal(r.goTarget,3);
 hit();assert.equal(a.goHits,3);assert.equal(r.goCount,3);assert.equal(a.score,110);assert.equal(r.phase,'battle');const id=r.decision!.id,deck=r.deck.length;
 challenge();assert.equal(r.decision?.id,id);assert.equal(r.deck.length,deck);assert.equal(r.goCount,3);
 g.choice(a,{matchId:r.matchId,decisionId:id,choice:'stop'});assert.equal(r.phase,'result');assert.equal(a.reward,750);assert.equal(a.coinReward,3300);const paid=[a.points,a.coins];g.finish(r,'duplicate');assert.deepEqual([a.points,a.coins],paid);
});
test('legacy pending first effective hit migrates to 1GO once without granting cards',()=>{
 const g=new Game({minimumPlayers:2}),a=g.hello(socket(),null,'A');g.quick(a);const r=g.rooms.get(a.room!)!;g.reveal(r);g.begin(r);r.rulesVersion=2;r.goCount=0;r.leaderId=undefined;r.decision={id:'legacy',playerId:a.id,startedAt:Date.now(),expiresAt:Date.now()+60000};a.score=26;
 const count=a.hand.length,deck=r.deck.length,fresh=new Game();restore(fresh,snapshot(g));const room=fresh.rooms.get(r.code)!,p=fresh.sessions.get(a.token)!;assert.equal(room.goCount,1);assert.equal(p.goHits,1);assert.equal(room.leaderId,p.id);assert.equal(p.hand.length,count);assert.equal(room.deck.length,deck);
 const twice=new Game();restore(twice,snapshot(fresh));assert.equal(twice.rooms.get(r.code)!.goCount,1);assert.equal(twice.sessions.get(a.token)!.goHits,1);
});
