import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { Game } from '../server/game.js';
import { DECK_FACES,cardFace,faceKey,judgeCards,type Card } from '../shared/rules.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(){}} as unknown as WebSocket);
const fixture=(mode:20|26|13):Card[]=>[
 {id:randomUUID(),kind:'pronoun',variant:'pronoun-x2'}, {id:randomUUID(),kind:'verb'},
 {id:randomUUID(),kind:'article',variant:mode===13?undefined:'article-x2'},
 {id:randomUUID(),kind:'count',variant:mode===20?undefined:'count-plus3'},
 {id:randomUUID(),kind:'adjective',variant:mode===26?'adjective-plus3':undefined}
];
test('controlled single-recipient fixture: hand retains more than 20 cards without a cap',()=>{
 const game=new Game({minimumPlayers:2}),p=game.hello(socket(),null,'Hand capacity');game.quick(p);const r=game.rooms.get(p.room!)!;game.reveal(r);
 // Normal 2–4 player deals draw from the shared deck. Isolate capacity from distribution.
 r.players=[p];game.begin(r);game.deal(r,20);const before=p.hand.map(c=>c.id);game.deal(r,3);
 assert.equal(p.hand.length,23);assert.deepEqual(p.hand.slice(0,20).map(c=>c.id),before);assert.equal(game.view(r,p).hand.length,23);assert.equal(r.deck.length,DECK_FACES.length-23);
});
test('71 physical cards including requested extra copies, no refill/recycling through exhaustion',()=>{
 assert.equal(DECK_FACES.length,71);assert.equal(new Set(DECK_FACES.map(c=>{const f=cardFace({...c,id:''});return`${f.sheet}/${f.col}/${f.row}`;})).size,59);
 const game=new Game({minimumPlayers:2});const people=['A','B','C','D'].map(n=>game.hello(socket(),null,n));for(const p of people)game.quick(p);const r=game.rooms.get(people[0].room!)!;
 game.reveal(r);game.deal(r,5);assert.ok(people.every(p=>p.hand.length===5));assert.equal(r.deck.length,DECK_FACES.length-20);
 game.deal(r,13);assert.equal(r.deck.length,0);const cards=[...people.flatMap(p=>p.hand),...r.deck];assert.equal(cards.length,71);assert.equal(new Set(cards.map(faceKey)).size,59);assert.equal(new Set(cards.map(c=>c.id)).size,71);const expected=new Map<string,number>();for(const c of DECK_FACES)expected.set(faceKey(c),(expected.get(faceKey(c))??0)+1);const actual=new Map<string,number>();for(const c of cards)actual.set(faceKey(c),(actual.get(faceKey(c))??0)+1);assert.deepEqual(actual,expected);
 const spent=people[0].hand.pop()!;r.discard.push(spent);const serial=r.dealSerial;game.deal(r,1);assert.equal(r.dealSerial,serial);assert.equal(r.deck.length,0);assert.equal(people.flatMap(p=>p.hand).some(c=>c.id===spent.id),false);
});
test('low scores accumulate and the twenty point threshold requires a new hit above twenty',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);const game=new Game({minimumPlayers:2}),p=game.hello(socket(),null,'A');game.quick(p);const r=game.rooms.get(p.room!)!;game.reveal(r);game.begin(r);
 for(const points of [13,20]){p.hand=fixture(points as 13|20);p.handVersion++;now+=1600;const msg={requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)};game.action(p,msg);game.action(p,msg);assert.equal(p.judgment!.accepted,true);assert.equal(p.hand.length,0);if(points===13){assert.equal(p.score,13);assert.equal(r.decision,undefined);}}
 assert.equal(p.score,33);assert.equal(r.decision,undefined);assert.equal(p.goHits??0,0);assert.equal(r.highScore,33);
});

test('controlled fixtures: Go authority, takeover and one-time settlement preserved',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);const game=new Game({minimumPlayers:2,durationMs:90000}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);
 const submit=(p:typeof a,mode:20|26|13)=>{p.hand=fixture(mode);p.handVersion++;now+=1600;game.action(p,{requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)});};
 submit(a,26);const end=r.endsAt;now+=300;game.choice(a,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});assert.equal(r.endsAt,end);assert.equal(r.leaderId,a.id);assert.equal(r.goCount,1);
 a.score=27;r.highScore=27;b.score=2;submit(b,26);assert.equal(b.score,28);assert.equal(r.decision!.playerId,b.id);game.choice(b,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});assert.equal(r.goCount,1);assert.equal(r.leaderId,b.id);assert.equal(a.score,13);
 game.finish(r,'settle');assert.equal(r.winner,b.id);assert.equal(b.reward,250);const points=b.points;game.finish(r,'duplicate');assert.equal(b.points,points);
});
test('human 20+ score gets a bounded choice and settles once if the phone suspends it',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);
 const game=new Game({minimumPlayers:2,decisionMs:10000,humanDecisionMs:60000}),p=game.hello(socket(),null,'A');game.quick(p);const r=game.rooms.get(p.room!)!;game.reveal(r);game.begin(r);
 p.hand=fixture(26);p.handVersion++;
 game.action(p,{requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)});
 assert.equal(p.score,26);assert.equal(r.decision?.playerId,p.id);assert.equal(r.decision?.expiresAt,now+60_000);
 now+=59_999;game.tick();assert.equal(r.phase,'battle');
 now+=2;game.tick();assert.equal(r.phase,'result');assert.match(r.reason!,/제한 시간/);assert.equal(r.decision,undefined);assert.equal(r.goCount,1);
 const points=p.points;game.tick();assert.equal(p.points,points);
});



test('Do Not begins a playable negative imperative',()=>{const result=judgeCards([{id:'do',kind:'do'},{id:'not',kind:'not'},{id:'verb',kind:'verb'}]);assert.equal(result.valid,true);assert.equal(result.points,3);});
