import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore,nextDeadline} from '../server/persistence.js';
import {RULES} from '../shared/rules.js';

function socket(){
 const messages:any[]=[];
 return {readyState:1,bufferedAmount:0,messages,send(data:string){messages.push(JSON.parse(data));},close(){},terminate(){}} as GameSocket & {messages:any[]};
}
function match(game:Game){
 const a=game.hello(socket(),null,'전화 받은 사람'),b=game.hello(socket(),null,'상대');
 game.quick(a);game.quick(b);const room=game.rooms.get(a.room!)!;
 game.reveal(room);game.deal(room,5);game.begin(room);
 return {a,b,room};
}

test('a phone interruption within the grace period resumes the same hand and match',t=>{
 let now=1_000_000;t.mock.method(Date,'now',()=>now);
 const game=new Game({minimumPlayers:2,dealMs:999_999}),{a,b,room}=match(game);
 const hand=a.hand.map(card=>card.id),matchId=room.matchId,token=a.token;
 game.disconnected(a,a.socket!);now+=75_000;game.tick();
 assert.equal(room.phase,'battle');assert.equal(a.points,0);assert.equal(b.points,0);
 const resumed=game.hello(socket(),token,'다시 접속');
 assert.equal(resumed.id,a.id);assert.equal(room.matchId,matchId);
 assert.deepEqual(resumed.hand.map(card=>card.id),hand);assert.equal(resumed.disconnectedAt,undefined);
});

test('a long disconnected battle settles once and still shows the result on return',t=>{
 let now=1_000_000;t.mock.method(Date,'now',()=>now);
 const game=new Game({minimumPlayers:2,dealMs:999_999}),{a,b,room}=match(game),token=a.token;
 game.disconnected(a,a.socket!);now+=RULES.reconnectSeconds*1000+1;game.tick();
 assert.equal(room.phase,'result');assert.equal(room.winner,b.id);
 assert.equal(a.reward,0);assert.equal(b.reward,300);assert.equal(a.points,0);assert.equal(b.points,300);
 assert.equal(room.expiresAt,now+game.resultMs);
 const client=socket();game.hello(client,token,'돌아옴');
 assert.equal(client.messages.at(-1)?.type,'state');assert.equal(client.messages.at(-1)?.room.phase,'result');
 game.tick();assert.equal(b.points,300);
});

test('disconnect before cards are played cancels the match without phantom 300P rewards',t=>{
 let now=1_000_000;t.mock.method(Date,'now',()=>now);
 const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');
 game.quick(a);game.quick(b);const room=game.rooms.get(a.room!)!;game.reveal(room);
 const token=a.token;game.disconnected(a,a.socket!);now+=game.reconnectMs+1;game.tick();
 assert.equal(game.rooms.has(room.code),false);assert.equal(a.points,0);assert.equal(b.points,0);
 assert.equal(a.rating,1000);assert.equal(b.rating,1000);
 const client=socket();game.hello(client,token,'A');
 assert.equal(client.messages.at(-1)?.type,'home');assert.match(client.messages.at(-1)?.message,/취소/);
});

test('if every human is disconnected, the match is canceled without arbitrary winners',t=>{
 let now=1_000_000;t.mock.method(Date,'now',()=>now);
 const game=new Game({minimumPlayers:2,dealMs:999_999}),{a,b,room}=match(game);
 game.disconnected(a,a.socket!);game.disconnected(b,b.socket!);now+=game.reconnectMs+1;game.tick();
 assert.equal(game.rooms.has(room.code),false);assert.equal(a.points,0);assert.equal(b.points,0);
 assert.equal(a.rating,1000);assert.equal(b.rating,1000);
});

test('final-round result survives a call and an old human decision gains a deadline on restore',t=>{
 let now=1_000_000;t.mock.method(Date,'now',()=>now);
 const game=new Game({minimumPlayers:2,dealMs:999_999}),{a,room}=match(game),token=a.token;
 room.decision={id:'choice',playerId:a.id,startedAt:now,expiresAt:0};
 const restored=new Game({minimumPlayers:2,dealMs:999_999});restore(restored,snapshot(game));
 const saved=restored.rooms.get(room.code)!;
 assert.equal(saved.decision!.expiresAt,now+restored.humanDecisionMs);
 assert.equal(nextDeadline(restored),now+restored.humanDecisionMs);
 saved.decision=undefined;saved.finalRound=true;saved.endsAt=now+70_000;
 const caller=restored.hello(socket(),token,'A');restored.disconnected(caller,caller.socket!);
 now+=70_001;restored.tick();assert.equal(saved.phase,'result');assert.equal(restored.rooms.has(saved.code),true);
 const client=socket();restored.hello(client,token,'A');
 assert.equal(client.messages.at(-1)?.room.phase,'result');
 now+=restored.resultMs+1;restored.tick();assert.equal(restored.rooms.has(saved.code),false);
});
