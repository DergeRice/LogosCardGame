import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';
function peer(g:Game,name:string){const messages:any[]=[];const socket:GameSocket={readyState:1,bufferedAmount:0,send(raw){messages.push(JSON.parse(raw))},close(){},terminate(){}};return {p:g.hello(socket,null,name),messages}}
test('quick retry leaves completed room, queues immediately and stale double taps cannot replay rewards',()=>{
 const g=new Game({minimumPlayers:2}),a=peer(g,'A'),b=peer(g,'B');g.quick(a.p,'hard');g.quick(b.p,'hard');const old=g.rooms.get(a.p.room!)!;g.reveal(old);g.begin(old);g.finish(old,'test result');const matchId=old.matchId,coins=a.p.coins,points=a.p.points,rating=a.p.rating;
 g.handle(a.p,{type:'retryMatch',matchId});const next=g.rooms.get(a.p.room!)!;assert.notEqual(next.code,old.code);assert.equal(next.phase,'matching');assert.equal(next.aiSetting,'hard');assert.equal(old.players.includes(a.p),false);assert.equal(b.p.room,old.code);
 g.handle(a.p,{type:'retryMatch',matchId});assert.equal(a.p.room,next.code);assert.deepEqual([a.p.coins,a.p.points,a.p.rating],[coins,points,rating]);assert.equal(a.messages.at(-1).type,'error');
});
test('custom rematch preserves code, host and players even after exhausted-deck final round',()=>{
 const g=new Game(),a=peer(g,'A'),b=peer(g,'B');g.createRoom(a.p);g.joinRoom(b.p,a.p.room!);const room=g.rooms.get(a.p.room!)!;g.reveal(room);g.begin(room);room.finalRound=true;g.finish(room,'deck finished');const matchId=room.matchId,coins=a.p.coins;
 g.handle(a.p,{type:'retryMatch',matchId});assert.equal(room.phase,'result');assert.equal(a.p.rematch,true);g.handle(b.p,{type:'retryMatch',matchId});assert.equal(room.phase,'reveal');assert.equal(a.p.room,room.code);assert.equal(room.hostId,a.p.id);assert.notEqual(room.matchId,matchId);assert.equal(room.finalRound,false);assert.ok(room.deck.length>0);assert.equal(room.players.length,2);assert.equal(a.p.coins,coins);
});
test('solo custom room can retry and battle-phase forged retry cannot reset game',()=>{
 const g=new Game(),a=peer(g,'A');g.createRoom(a.p);const room=g.rooms.get(a.p.room!)!;g.reveal(room);g.begin(room);const first=room.matchId;g.handle(a.p,{type:'retryMatch',matchId:first});assert.equal(room.phase,'battle');g.finish(room,'end');g.handle(a.p,{type:'retryMatch',matchId:first});assert.equal(room.phase,'reveal');assert.equal(a.p.room,room.code);
});
test('real two WebSocket clients can requeue together from a settled quick match',async()=>{
 const {createBattleServer}=await import('../server/index.js'),{WebSocket}=await import('ws');const app=createBattleServer({minimumPlayers:2,matchingMs:50,revealMs:10,dealingMs:10,durationMs:100});await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const clients:any[]=[];
 const wait=async(fn:()=>boolean)=>{const until=Date.now()+6000;while(!fn()){if(Date.now()>until)throw Error('wire timeout');await new Promise(r=>setTimeout(r,5))}};
 try{for(const name of ['RetryA','RetryB']){const ws=new WebSocket(`ws://127.0.0.1:${(app.server.address() as any).port}/socket`),c:any={ws};clients.push(c);ws.on('message',raw=>{const m=JSON.parse(String(raw));if(m.type==='session')c.id=m.id;if(m.type==='state')c.room=m.room});await new Promise<void>(r=>ws.on('open',r));ws.send(JSON.stringify({type:'hello',name}));await wait(()=>!!c.id)}
 const [a,b]=clients;for(const c of clients)c.ws.send(JSON.stringify({type:'quick'}));await wait(()=>a.room?.phase==='result'&&b.room?.phase==='result');assert.equal(a.room.matchId,b.room.matchId);const first=a.room.matchId,code=a.room.code;for(const c of clients)c.ws.send(JSON.stringify({type:'retryMatch',matchId:first}));await wait(()=>a.room?.matchId!==first&&b.room?.matchId!==first&&a.room?.phase==='result'&&b.room?.phase==='result');assert.equal(a.room.matchId,b.room.matchId);assert.notEqual(a.room.code,code);
 }finally{clients.forEach(c=>c.ws.close());await app.close()}
});
