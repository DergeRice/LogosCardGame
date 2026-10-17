import {test} from 'node:test';
import assert from 'node:assert/strict';
import {victoryPoints,aiDifficulty,GUEST_RETENTION_MS} from '../shared/progression.js';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore,nextDeadline} from '../server/persistence.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}} as GameSocket);
test('only the unique winner receives points; losing Go callers, draws and forfeits earn zero',()=>{
 for(const mode of ['winner','draw','forfeit']){
  const game=new Game(),a=game.hello(socket(),null,'A');game.quick(a);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);r.players.forEach((p,i)=>{p.rating=1000;p.score=mode==='draw'?40:50-i*10;p.calledGo=i>0;p.points=100;});
  game.finish(r,mode,mode==='forfeit'?a.id:undefined);
  for(const p of r.players){const expected=r.winner===p.id?300:0;assert.equal(p.reward,expected);assert.equal(p.points,100+expected);if(r.winner!==p.id)assert.equal(p.baseReward,0);}
  if(mode==='draw')assert.equal(r.winner,null);if(mode==='forfeit'){assert.notEqual(r.winner,a.id);assert.equal(a.reward,0);}
 }
});
test('victory points scale by opponent starting rating, independently of sentence score and rating delta',()=>{
 for(const [opponent,points] of [[900,270],[950,285],[1000,300],[1050,315],[1100,330]]){assert.equal(victoryPoints(1000,[opponent]).total,points)}
 const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');a.rating=1000;b.rating=1100;game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);a.score=40;b.score=20;a.calledGo=true;game.finish(r,'Stop');assert.equal(a.reward,330);assert.equal(a.baseReward,330);assert.equal(a.opponentRating,1100);assert.equal(b.reward,0);assert.equal(a.score,40);assert.equal(b.score,20);assert.equal(a.ratingDelta,15);const points=a.points;game.finish(r,'again');assert.equal(a.points,points);
});
test('rating separated players wait in distinct rooms; AI seats track the human rating and actual difficulty',()=>{
 const game=new Game(),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B'),far=game.hello(socket(),null,'Far');a.rating=1000;b.rating=1050;far.rating=1600;game.quick(a);game.quick(b);game.quick(far);assert.equal(a.room,b.room);assert.notEqual(a.room,far.room);
 for(const p of [a,far]){const r=game.rooms.get(p.room!)!;game.reveal(r);const center=r.players.filter(x=>!x.ai).reduce((n,x)=>n+x.rating,0)/r.players.filter(x=>!x.ai).length;for(const bot of r.players.filter(x=>x.ai)){assert.ok(Math.abs(bot.rating-center)<=center*.1);assert.equal(bot.ai,'normal')}}
 assert.equal(aiDifficulty(800),'easy');assert.equal(aiDifficulty(1000),'normal');assert.equal(aiDifficulty(1600),'hard');
});
test('guest points and rating survive return and snapshot; expiry is separate from five-minute match expiry',t=>{
 let now=100000;t.mock.method(Date,'now',()=>now);const game=new Game(),p=game.hello(socket(),null,'Guest');p.points=600;p.rating=1040;game.disconnected(p,p.socket!);assert.equal(nextDeadline(game),now+GUEST_RETENTION_MS+1);now+=86400000;game.tick();assert.ok(game.sessions.has(p.token));const fresh=new Game();restore(fresh,snapshot(game));const resumed=fresh.hello(socket(),p.token,'Ignored');assert.equal(resumed.id,p.id);assert.equal(resumed.points,600);assert.equal(resumed.rating,1040);fresh.disconnected(resumed,resumed.socket!);now+=GUEST_RETENTION_MS+1;fresh.tick();assert.equal(fresh.sessions.has(p.token),false);
});
