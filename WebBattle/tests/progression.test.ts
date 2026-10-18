import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aiDifficulty,GUEST_RETENTION_MS} from '../shared/progression.js';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore,nextDeadline} from '../server/persistence.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}} as GameSocket);
test('only the unique winner receives fixed Go rank points',()=>{
 for(const go of [0,1,2,3]){const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);a.score=50;b.score=10;r.leaderId=a.id;r.goCount=go;game.finish(r,'finish');assert.equal(a.reward,go>=3?200:go===2?100:50);assert.equal(b.reward,0);}
});
test('rating separated players wait in distinct rooms; AI seats track the human rating and actual difficulty',()=>{
 const game=new Game(),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B'),far=game.hello(socket(),null,'Far');a.rating=1000;b.rating=1050;far.rating=1600;game.quick(a);game.quick(b);game.quick(far);assert.equal(a.room,b.room);assert.notEqual(a.room,far.room);assert.equal(aiDifficulty(800),'easy');assert.equal(aiDifficulty(1000),'normal');assert.equal(aiDifficulty(1600),'hard');
});
test('guest points and rating survive return and snapshot; expiry is separate from five-minute match expiry',t=>{
 let now=100000;t.mock.method(Date,'now',()=>now);const game=new Game(),p=game.hello(socket(),null,'Guest');p.points=600;p.rating=1040;game.disconnected(p,p.socket!);assert.equal(nextDeadline(game),now+GUEST_RETENTION_MS+1);now+=86400000;game.tick();assert.ok(game.sessions.has(p.token));const fresh=new Game();restore(fresh,snapshot(game));const resumed=fresh.hello(socket(),p.token,'Ignored');assert.equal(resumed.id,p.id);assert.equal(resumed.points,600);assert.equal(resumed.rating,1040);fresh.disconnected(resumed,resumed.socket!);now+=GUEST_RETENTION_MS+1;fresh.tick();assert.equal(fresh.sessions.has(p.token),false);
});
