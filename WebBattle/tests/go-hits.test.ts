import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Game} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';
import type {Card} from '../shared/rules.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}});
const hand=(points=26):Card[]=>[{id:randomUUID(),kind:'pronoun',variant:'pronoun-x2'},{id:randomUUID(),kind:points===28?'be':'verb',variant:points===28?'be-plus3':undefined},{id:randomUUID(),kind:'article',variant:'article-x2'},{id:randomUUID(),kind:'count',variant:'count-plus3'},{id:randomUUID(),kind:points===28?'adverb':'adjective',variant:points===28?'adverb-plus2':'adjective-plus3'}];
test('effective hits achieve 1/2/3GO; challenges grant cards and 5x/15x without advancing hits',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);
 const g=new Game({minimumPlayers:2}),a=g.hello(socket(),null,'A'),b=g.hello(socket(),null,'B');g.quick(a);g.quick(b);const r=g.rooms.get(a.room!)!;g.reveal(r);g.begin(r);
 const hit=(points=26)=>{a.hand=hand(points);a.handVersion++;now+=1600;g.action(a,{requestId:randomUUID(),matchId:r.matchId,handVersion:a.handVersion,cards:a.hand.map(c=>c.id)});};
 const challenge=()=>g.choice(a,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});
 hit();assert.equal(a.goHits,1);assert.equal(r.goCount,1);assert.equal(r.goTarget,undefined);assert.equal(r.decision?.playerId,a.id);
 let before=[a.hand.length,b.hand.length];challenge();assert.deepEqual([a.hand.length-before[0],b.hand.length-before[1]],[2,1]);assert.equal(a.goHits,1);assert.equal(r.goCount,1);assert.equal(r.goTarget,2);
 // A restart while challenging 2GO must retain both the achieved count and 5x reward.
 const fresh=new Game();restore(fresh,snapshot(g));const saved=fresh.rooms.get(r.code)!;assert.equal(saved.goCount,1);assert.equal(saved.goTarget,2);fresh.finish(saved,'stop');assert.equal(fresh.sessions.get(a.token)!.reward,250);
 hit(28);assert.equal(a.goHits,2);assert.equal(r.goCount,2);assert.equal(a.score,54);before=[a.hand.length,b.hand.length];challenge();assert.deepEqual([a.hand.length-before[0],b.hand.length-before[1]],[2,1]);assert.equal(r.goCount,2);assert.equal(r.goTarget,3);
 hit();assert.equal(a.goHits,3);assert.equal(r.goCount,3);assert.equal(a.score,106);assert.equal(r.phase,'battle');const id=r.decision!.id,deck=r.deck.length;
 challenge();assert.equal(r.decision?.id,id);assert.equal(r.deck.length,deck);assert.equal(r.goCount,3);
 g.choice(a,{matchId:r.matchId,decisionId:id,choice:'stop'});assert.equal(r.phase,'result');assert.equal(a.reward,750);assert.equal(a.coinReward,3300);const paid=[a.points,a.coins];g.finish(r,'duplicate');assert.deepEqual([a.points,a.coins],paid);
});
test('legacy pending first effective hit migrates to 1GO once without granting cards',()=>{
 const g=new Game({minimumPlayers:2}),a=g.hello(socket(),null,'A');g.quick(a);const r=g.rooms.get(a.room!)!;g.reveal(r);g.begin(r);r.rulesVersion=2;r.goCount=0;r.leaderId=undefined;r.decision={id:'legacy',playerId:a.id,startedAt:Date.now(),expiresAt:Date.now()+60000};a.score=26;
 const count=a.hand.length,deck=r.deck.length,fresh=new Game();restore(fresh,snapshot(g));const room=fresh.rooms.get(r.code)!,p=fresh.sessions.get(a.token)!;assert.equal(room.goCount,1);assert.equal(p.goHits,1);assert.equal(room.leaderId,p.id);assert.equal(p.hand.length,count);assert.equal(room.deck.length,deck);
 const twice=new Game();restore(twice,snapshot(fresh));assert.equal(twice.rooms.get(r.code)!.goCount,1);assert.equal(twice.sessions.get(a.token)!.goHits,1);
});
test('scores 13 then 11 open the first 2GO choice at a cumulative 24 points',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);
 const g=new Game({minimumPlayers:2}),a=g.hello(socket(),null,'이상진'),b=g.hello(socket(),null,'온화한 아기하마');g.quick(a);g.quick(b);
 const r=g.rooms.get(a.room!)!;g.reveal(r);g.begin(r);
 const decision=()=>r.decision;
 const submit=(p:typeof a,cards:Card[])=>{p.hand=cards.map(c=>({...c,id:randomUUID()}));p.handVersion++;now+=1600;g.action(p,{requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)});};
 submit(a,[{id:'a',kind:'pronoun',variant:'pronoun-x2'},{id:'b',kind:'verb'},{id:'c',kind:'article'},{id:'d',kind:'count'},{id:'e',kind:'adjective',variant:'adjective-plus3'}]);
 assert.equal(a.score,13);assert.equal(a.goHits,0);assert.equal(decision(),undefined);
 submit(a,[{id:'a',kind:'pronoun',variant:'pronoun-x2'},{id:'b',kind:'verb'},{id:'c',kind:'article'},{id:'d',kind:'count',variant:'count-plus3'}]);
 assert.equal(a.judgment?.awardedPoints,11);assert.equal(a.score,24);assert.equal(a.goHits,1);assert.equal(r.highHitScore,24);assert.equal(a.hitBaseScore,24);assert.equal(decision()?.playerId,a.id);assert.equal(r.goCount,1);
 const restored=new Game();restore(restored,snapshot(g));assert.equal(restored.sessions.get(a.token)?.hitBaseScore,24);
 g.choice(a,{matchId:r.matchId,decisionId:decision()!.id,choice:'go'});
 submit(b,[{id:'a',kind:'pronoun',variant:'pronoun-x2'},{id:'b',kind:'verb'},{id:'c',kind:'article',variant:'article-x2'},{id:'d',kind:'count'},{id:'e',kind:'adjective'}]);
 assert.equal(b.score,20);assert.equal(b.goHits,0);assert.equal(decision(),undefined);
 submit(b,[{id:'a',kind:'pronoun'},{id:'b',kind:'verb'},{id:'c',kind:'article'},{id:'d',kind:'count'},{id:'e',kind:'adjective'}]);
 assert.equal(b.score,25);assert.equal(b.goHits,1);assert.equal(r.highHitScore,25);assert.equal(decision()?.playerId,b.id);
});
test('23, 20, 25, 28 compare hit scores across players while counting each player separately',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);
 const g=new Game({minimumPlayers:3}),a=g.hello(socket(),null,'Player 1'),b=g.hello(socket(),null,'Player 2'),c=g.hello(socket(),null,'Player 3');
 for(const p of [a,b,c])g.quick(p);
 const r=g.rooms.get(a.room!)!;g.reveal(r);g.begin(r);const decision=()=>g.rooms.get(r.code)?.decision;
 const submit=(p:typeof a,verb:'verb'|'be',noun:'count',ending:'adjective'|'adverb'|'preposition',variants:{verb?:string;noun?:string;ending?:string})=>{
  p.hand=[{id:randomUUID(),kind:'pronoun',variant:'pronoun-x2'},{id:randomUUID(),kind:verb,variant:variants.verb},{id:randomUUID(),kind:'article',variant:'article-x2'},{id:randomUUID(),kind:noun,variant:variants.noun},{id:randomUUID(),kind:ending,variant:variants.ending}];
  p.handVersion++;now+=1600;g.action(p,{requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(card=>card.id)});
  return p.judgment?.awardedPoints;
 };
 assert.equal(submit(a,'verb','count','adjective',{ending:'adjective-plus3'}),23);
 assert.equal(a.goHits,1);assert.equal(r.highHitScore,23);assert.equal(decision()?.playerId,a.id);assert.equal(r.goCount,1);
 const records=snapshot(g),restored=new Game();restore(restored,records);assert.equal(restored.rooms.get(r.code)?.highHitScore,23);
 const olderRoom=JSON.parse(records.get('room:'+r.code)!);delete olderRoom.highHitScore;records.set('room:'+r.code,JSON.stringify(olderRoom));const migrated=new Game();restore(migrated,records);assert.equal(migrated.rooms.get(r.code)?.highHitScore,23);
 g.choice(a,{matchId:r.matchId,decisionId:decision()!.id,choice:'go'});assert.equal(r.goTarget,2);
 assert.equal(submit(b,'verb','count','adjective',{}),20);
 assert.equal(b.score,20);assert.equal(b.goHits,0);assert.equal(r.highHitScore,23);assert.equal(decision(),undefined);
 assert.equal(submit(a,'verb','count','adverb',{noun:'count-plus3',ending:'adverb-plus2'}),25);
 assert.equal(a.goHits,2);assert.equal(r.highHitScore,25);assert.equal(decision()?.playerId,a.id);assert.equal(r.goCount,2);
 g.choice(a,{matchId:r.matchId,decisionId:decision()!.id,choice:'go'});assert.equal(r.goTarget,3);
 assert.equal(submit(c,'be','count','adverb',{verb:'be-plus3',noun:'count-plus3',ending:'adverb-plus2'}),28);
 assert.equal(c.goHits,1);assert.equal(r.highHitScore,28);assert.equal(decision()?.playerId,c.id);assert.equal(r.goCount,1);
 assert.equal(a.score,48);assert.equal(r.highScore,48);
});
