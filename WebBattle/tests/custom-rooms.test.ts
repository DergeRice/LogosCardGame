import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore,nextDeadline} from '../server/persistence.js';

function socket(){const messages:Record<string,any>[]=[];const connection:GameSocket={readyState:1,bufferedAmount:0,send(data){messages.push(JSON.parse(data));},close(){},terminate(){}};return {connection,messages};}

test('custom lobby creates immediately, publishes a list, transfers host and deletes on last exit',()=>{
 const game=new Game(),aSocket=socket(),bSocket=socket(),a=game.hello(aSocket.connection,null,'민지'),b=game.hello(bSocket.connection,null,'현우');
 game.handle(a,{type:'createRoom'});const code=a.room!,room=game.rooms.get(code)!;
 assert.equal(room.phase,'lobby');assert.equal(room.name,'민지님의 방');assert.equal(room.hostId,a.id);
 assert.equal(bSocket.messages.at(-1)?.rooms[0].name,'민지님의 방');
 game.handle(b,{type:'joinRoom',code});assert.equal(room.players.length,2);
 game.handle(b,{type:'renameRoom',name:'잘못된 변경'});assert.equal(room.name,'민지님의 방');
 game.handle(a,{type:'renameRoom',name:'저녁 대전'});assert.equal(room.name,'저녁 대전');
 game.handle(a,{type:'leave'});assert.equal(room.hostId,b.id);assert.equal(room.players.length,1);
 game.handle(b,{type:'leave'});assert.equal(game.rooms.has(code),false);assert.deepEqual(game.roomList(),[]);
});

test('host controls AI up to six and starts everyone without matching delay',()=>{
 const game=new Game(),people=Array.from({length:2},(_,i)=>{const s=socket();return game.hello(s.connection,null,`사람${i}`)});
 game.handle(people[0],{type:'createRoom'});const room=game.rooms.get(people[0].room!)!;
 game.handle(people[1],{type:'joinRoom',code:room.code});
 for(let i=0;i<5;i++)game.handle(people[0],{type:'addRoomAI'});
 assert.equal(room.players.length,6);assert.equal(room.players.filter(p=>p.ai).length,4);
 const bot=room.players.find(p=>p.ai)!;game.handle(people[0],{type:'removeRoomAI',id:bot.id});assert.equal(room.players.length,5);
 game.handle(people[1],{type:'startRoom'});assert.equal(room.phase,'lobby');
 game.handle(people[0],{type:'startRoom'});assert.equal(room.phase,'reveal');assert.equal(room.players.length,5);assert.deepEqual(game.roomList(),[]);
});

test('custom lobby persists, reconnects and cleans disconnected players after grace period',t=>{
 let now=100_000;t.mock.method(Date,'now',()=>now);
 const game=new Game({reconnectMs:1000}),aSocket=socket(),bSocket=socket(),a=game.hello(aSocket.connection,null,'A'),b=game.hello(bSocket.connection,null,'B');
 game.createRoom(a);game.joinRoom(b,a.room!);const code=a.room!;
 const fresh=new Game({reconnectMs:1000});restore(fresh,snapshot(game));const saved=fresh.rooms.get(code)!;
 assert.equal(saved.name,'A님의 방');assert.equal(saved.hostId,a.id);assert.equal(saved.players.length,2);
 const a2=fresh.hello(socket().connection,a.token,'A'),b2=fresh.hello(socket().connection,b.token,'B');assert.equal(a2.room,code);
 fresh.disconnected(a2,a2.socket!);assert.equal(nextDeadline(fresh),now+1000);
 now+=1000;fresh.tick();assert.equal(fresh.rooms.get(code)?.hostId,b.id);
 fresh.disconnected(b2,b2.socket!);now+=1000;fresh.tick();assert.equal(fresh.rooms.has(code),false);assert.equal(b2.room,undefined);
});
