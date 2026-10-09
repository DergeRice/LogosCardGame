import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore,nextDeadline} from '../server/persistence.js';
const socket=():GameSocket=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}});
test('cloud snapshots restore deck order, sessions, dedupe, scores and shared player identity without sockets',()=>{
 const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.deal(r,5);game.begin(r);a.seen.add('used-request');
 const records=snapshot(game),fresh=new Game({minimumPlayers:2});const people=restore(fresh,records);
 assert.deepEqual(snapshot(fresh),records);const saved=fresh.rooms.get(r.code)!;assert.deepEqual(saved.deck,r.deck);assert.equal(saved.players[0],fresh.sessions.get(a.token));assert.equal(people.get(a.id),saved.players[0]);assert.equal(saved.players[0].socket,undefined);assert.ok(saved.players[0].seen.has('used-request'));assert.deepEqual(saved.players[0].hand,a.hand);
 const resumed=fresh.hello(socket(),a.token,'ignored');assert.equal(resumed.id,a.id);assert.equal(resumed.room,r.code);assert.deepEqual(resumed.hand,a.hand);
});
test('cloud schedules game deadlines and sleeps when no work remains',t=>{
 let now=100000;t.mock.method(Date,'now',()=>now);const game=new Game({minimumPlayers:2});assert.equal(nextDeadline(game),null);const a=game.hello(socket(),null,'A');assert.equal(nextDeadline(game),null);game.quick(a);assert.equal(nextDeadline(game),now+6000);
 now+=6000;game.tick();assert.equal(nextDeadline(game),now+3000);now+=3000;game.tick();assert.equal(nextDeadline(game),now+2400);now+=2400;game.tick();assert.ok(nextDeadline(game)!>now);
 const r=game.rooms.get(a.room!)!;r.decision={id:'choice',playerId:a.id,startedAt:now,expiresAt:now+10000};assert.equal(nextDeadline(game),now+10000);
});

test('unlimited matches survive 24 hours, accept actions and restore old timed rooms without expired alarms',t=>{
 let now=100000;t.mock.method(Date,'now',()=>now);const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.deal(r,5);game.begin(r);
 assert.equal(r.endsAt,0);assert.equal(r.expiresAt,0);now+=86400000;game.tick();assert.equal(r.phase,'battle');assert.ok(game.rooms.has(r.code));
 a.hand=[{id:'verb-after-day',kind:'verb'}];a.handVersion++;game.action(a,{requestId:'after-day',matchId:r.matchId,handVersion:a.handVersion,cards:[a.hand[0].id]});assert.ok(a.judgment);assert.equal(r.phase,'battle');assert.equal(nextDeadline(game),now+game.dealMs);
 r.endsAt=now-1;r.expiresAt=now-1;const fresh=new Game({minimumPlayers:2});restore(fresh,snapshot(game));const restored=fresh.rooms.get(r.code)!;fresh.tick();assert.equal(restored.phase,'battle');assert.equal(restored.endsAt,0);assert.equal(restored.expiresAt,0);
 restored.decision={id:'stop',playerId:a.id,startedAt:now,expiresAt:now+10000};fresh.choice(restored.players[0],{decisionId:'stop',matchId:restored.matchId,choice:'stop'});assert.equal(restored.phase,'result');assert.ok(restored.expiresAt>now);
});

test('legacy cloud vote migrates to the 30-second shared consent timer',t=>{
 let now=123000;t.mock.method(Date,'now',()=>now);
 const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);
 const r=game.rooms.get(a.room!)!;game.reveal(r);game.deal(r,5);game.begin(r);
 const records=snapshot(game),key='room:'+r.code;
 const legacy=JSON.parse(records.get(key)!);
 legacy.nextDealAt=0;legacy.drawVote={id:'old',requesterId:a.id,approved:[a.id],expiresAt:now+10000};
 records.set(key,JSON.stringify(legacy));
 const fresh=new Game({minimumPlayers:2});restore(fresh,records);const saved=fresh.rooms.get(r.code)!;
 assert.equal(saved.nextDealAt,now+fresh.dealMs);
 assert.notEqual(saved.drawVote?.id,'old');
 assert.deepEqual(saved.drawVote?.approved,saved.players.filter(p=>p.ai).map(p=>p.id));
 assert.equal(nextDeadline(fresh),now+fresh.dealMs);
});


test('exhausted four-player match gives a final chance, survives restart and settles the actual winner',t=>{
 let now=100000;t.mock.method(Date,'now',()=>now);
 const game=new Game(),a=game.hello(socket(),null,'Me');game.quick(a);const r=game.rooms.get(a.room!)!;game.reveal(r);game.deal(r,5);game.begin(r);
 r.deck=[];r.players.forEach(p=>p.nextAI=Infinity);a.score=36;r.players[3].score=66;r.goCount=2;
 game.tick();assert.equal(r.phase,'battle');assert.equal(r.finalRound,true);assert.equal(r.endsAt,now+30000);
 now+=10000;game.tick();assert.equal(r.endsAt,120000+10000);
 const fresh=new Game();restore(fresh,snapshot(game));const saved=fresh.rooms.get(r.code)!;assert.equal(saved.endsAt,r.endsAt);assert.equal(saved.finalRound,true);
 now+=20000;game.tick();assert.equal(r.phase,'result');assert.equal(r.winner,r.players[3].id);
});
