import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { Game } from '../server/game.js';
import { DECK_FACES,cardFace,faceKey,type Card } from '../shared/rules.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(){}} as unknown as WebSocket);
const fixture=(mode:20|26|13):Card[]=>[
 {id:randomUUID(),kind:'pronoun',variant:'pronoun-x2'}, {id:randomUUID(),kind:'verb'},
 {id:randomUUID(),kind:'article',variant:mode===13?undefined:'article-x2'},
 {id:randomUUID(),kind:'count',variant:mode===20?undefined:'count-plus3'},
 {id:randomUUID(),kind:'adjective',variant:mode===26?'adjective-plus3':undefined}
];
test('controlled single-recipient fixture: hand retains more than 20 cards without a cap',()=>{
 const game=new Game(),p=game.hello(socket(),null,'Hand capacity');game.quick(p);const r=game.rooms.get(p.room!)!;game.reveal(r);
 // Normal 2–4 player deals divide the 60-card deck. Isolate capacity from distribution.
 r.players=[p];game.begin(r);game.deal(r,20);const before=p.hand.map(c=>c.id);game.deal(r,3);
 assert.equal(p.hand.length,23);assert.deepEqual(p.hand.slice(0,20).map(c=>c.id),before);assert.equal(game.view(r,p).hand.length,23);assert.equal(r.deck.length,37);
});
test('one physical copy per face: 60 cards, no refill/recycling through exhaustion',()=>{
 assert.equal(DECK_FACES.length,60);assert.equal(new Set(DECK_FACES.map(c=>{const f=cardFace({...c,id:''});return`${f.sheet}/${f.col}/${f.row}`;})).size,60);
 const game=new Game();const people=['A','B','C','D'].map(n=>game.hello(socket(),null,n));for(const p of people)game.quick(p);const r=game.rooms.get(people[0].room!)!;
 game.deal(r,5);assert.ok(people.every(p=>p.hand.length===5));assert.equal(r.deck.length,40);
 game.deal(r,10);assert.equal(r.deck.length,0);const cards=people.flatMap(p=>p.hand);assert.equal(cards.length,60);assert.equal(new Set(cards.map(faceKey)).size,60);
 const spent=people[0].hand.pop()!;r.discard.push(spent);const serial=r.dealSerial;game.deal(r,1);assert.equal(r.dealSerial,serial);assert.equal(r.deck.length,0);assert.equal(people.flatMap(p=>p.hand).some(c=>c.id===spent.id),false);
});
test('controlled fixtures: <=20 retains hand, no score even for repeated new requests; >20 consumes only accepted segment',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);const game=new Game(),p=game.hello(socket(),null,'A');game.quick(p);const r=game.rooms.get(p.room!)!;game.reveal(r);game.begin(r);
 p.hand=fixture(20);const before=[...p.hand],version=p.handVersion;
 for(let i=0;i<3;i++){now+=1600;const msg={requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)};game.action(p,msg);game.action(p,msg);assert.equal(p.judgment!.valid,true);assert.equal(p.judgment!.points,20);assert.equal(p.judgment!.accepted,false);assert.equal(p.score,0);assert.deepEqual(p.hand,before);assert.equal(p.handVersion,version);assert.equal(r.discard.length,0);}
 p.hand=[...fixture(26),{id:randomUUID(),kind:'adjective'}];p.handVersion++;const leftover=p.hand.at(-1)!;now+=1600;
 const msg={requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)};game.action(p,msg);game.action(p,msg);
 assert.equal(p.score,26);assert.equal(p.judgment!.usedLength,5);assert.equal(p.judgment!.accepted,true);assert.deepEqual(p.hand,[leftover]);assert.equal(r.discard.length,5);assert.equal(game.view(r,p).usedCards.length,5);assert.equal(r.decision!.playerId,p.id);
});
test('controlled fixtures: Go authority, pause, ties, cap and one-time settlement preserved',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);const game=new Game({durationMs:90000}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);
 const submit=(p:typeof a,mode:20|26|13)=>{p.hand=fixture(mode);p.handVersion++;now+=1600;game.action(p,{requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)});};
 const choice=(p:typeof a,c='go')=>game.choice(p,{matchId:r.matchId,decisionId:r.decision!.id,choice:c});
 submit(a,26);const end=r.endsAt,deal=r.nextDealAt;now+=300;choice(a);assert.equal(r.endsAt,end+300);assert.equal(r.nextDealAt,deal+300);assert.equal(r.leaderId,a.id);assert.equal(r.goCount,1);
 submit(b,13);assert.equal(b.score,26);assert.equal(r.decision,undefined);submit(b,26);assert.equal(b.score,78);assert.equal(r.leaderId,b.id);choice(b);assert.equal(r.goCount,2);
 submit(a,26);assert.equal(a.score,104);choice(a);assert.equal(r.goCount,3);submit(b,26);assert.equal(b.score,182);choice(b);assert.equal(r.goCount,3);choice(b,'stop');assert.equal(r.phase,'result');assert.equal(r.winner,b.id);assert.equal(b.reward,728);const points=b.points;game.finish(r,'duplicate');assert.equal(b.points,points);
});
test('human 20+ score opens a decision that does not auto-stop after ten seconds',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);
 const game=new Game({decisionMs:10000}),p=game.hello(socket(),null,'A');game.quick(p);const r=game.rooms.get(p.room!)!;game.reveal(r);game.begin(r);
 p.hand=fixture(26);p.handVersion++;
 game.action(p,{requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)});
 assert.equal(p.score,26);assert.equal(r.decision?.playerId,p.id);assert.equal(r.decision?.expiresAt,0);
 const id=r.decision!.id;now+=60_000;game.tick();assert.equal(r.phase,'battle');assert.equal(r.decision?.id,id);
 game.choice(p,{matchId:r.matchId,decisionId:id,choice:'go'});assert.equal(r.goCount,1);assert.equal(r.decision,undefined);
});
