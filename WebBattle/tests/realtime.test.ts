import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { createBattleServer } from '../server/index.js';
import { chooseMove } from '../server/ai.js';
import { judgeCards, faceKey, type RoomView } from '../shared/rules.js';
const wait = (ms:number)=>new Promise(r=>setTimeout(r,ms));
class Client {
 ws:WebSocket; messages:any[]=[]; room?:RoomView; token='';
 constructor(url:string){this.ws=new WebSocket(url);this.ws.on('message',raw=>{const m=JSON.parse(String(raw));this.messages.push(m);if(m.type==='state')this.room=m.room;if(m.type==='session')this.token=m.token;});}
 send(type:string,extra:Record<string,unknown>={}){this.ws.send(JSON.stringify({type,matchId:this.room?.matchId,...extra}));}
 async until(fn:()=>boolean,timeout=6000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw Error('Timeout '+JSON.stringify(this.messages.slice(-2)));await wait(15);}}
 async hello(name:string,token?:string){if(this.ws.readyState!==1)await new Promise<void>(r=>this.ws.once('open',()=>r()));this.send('hello',{name,token});await this.until(()=>!!this.token);return this;}
 get score(){return this.room!.players.find(p=>p.id===this.room!.you)!.score;}
 move(){const r=this.room!,cards=chooseMove(r.hand,'hard');if(!cards)return null;const request={cards,handVersion:r.handVersion,requestId:randomUUID(),matchId:r.matchId};this.send('submit',request);return request;}
}
async function server(options:Parameters<typeof createBattleServer>[0]){const app=createBattleServer(options);await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));return{app,url:`ws://127.0.0.1:${(app.server.address() as {port:number}).port}/socket`};}

test('four real sockets: unanimous draw, unique shared deck, retained Correct, duplicate/stale requests, result/rematch',async()=>{
 const {app,url}=await server({matchingMs:1200,revealMs:50,dealingMs:50,durationMs:0});
 try{
  const clients=await Promise.all(['A','B','C','D'].map(n=>new Client(url).hello(n)));
  clients[0].send('quick');await clients[0].until(()=>!!clients[0].room);for(const c of clients.slice(1)){c.send('quick');await c.until(()=>!!c.room);}for(const c of clients)await c.until(()=>c.room?.phase==='battle');
  assert.equal(new Set(clients.map(c=>c.room!.code)).size,1);assert.equal(clients[0].room!.deckCount,19);assert.ok(clients.every(c=>c.room!.hand.length===5));
  const seen=new Map<string,string>();const inspect=()=>{for(const c of clients)for(const card of c.room!.hand){const key=faceKey(card);assert.ok(!seen.has(key)||seen.get(key)===card.id);seen.set(key,card.id);}};inspect();
  for(const other of clients.slice(1))assert.deepEqual(clients[0].room!.players.find(p=>p.id===other.room!.you)?.handPreview?.map(c=>c.id),other.room!.hand.map(c=>c.id));
  const approveDraw=async()=>{const before=clients[0].room!.deckCount,voteId=clients[0].room!.drawVote!.id;for(const c of clients)c.send('drawVote',{voteId,approve:true});for(const c of clients)await c.until(()=>c.room!.deckCount===before-4);inspect();};
  await approveDraw();await approveDraw();assert.equal(clients[0].room!.deckCount,11);
  const player=clients.find(c=>c.room!.hand.some(card=>card.kind==='verb'))!;assert.ok(player);const verb=player.room!.hand.find(c=>c.kind==='verb')!;
  const msg={cards:[verb.id],requestId:randomUUID(),handVersion:player.room!.handVersion};player.send('submit',msg);player.send('submit',msg);
  await player.until(()=>player.room!.judgment?.submissionId===msg.requestId);assert.equal(player.room!.judgment!.valid,true);assert.equal(player.room!.judgment!.accepted,false);assert.equal(player.score,0);assert.ok(player.room!.hand.some(c=>c.id===verb.id));await player.until(()=>player.messages.some(m=>m.duplicate));
  await approveDraw();await approveDraw();assert.equal(clients[0].room!.deckCount,3);assert.equal(seen.size,36);assert.equal(clients.flatMap(c=>c.room!.hand).length,36);
  const staleId=randomUUID();player.send('submit',{...msg,requestId:staleId});await player.until(()=>player.messages.some(m=>m.type==='error'&&m.requestId===staleId&&m.message.includes('이전 카드')));assert.equal(player.score,0);
  assert.equal(clients[0].room!.drawVote,undefined);clients[0].send('drawVote',{voteId:randomUUID(),approve:true});await clients[0].until(()=>clients[0].messages.some(m=>m.type==='error'&&m.message.includes('동의할')));
  clients[0].send('leave');for(const c of clients.slice(1))await c.until(()=>c.room?.phase==='result');assert.ok(clients[1].room!.players.every(p=>p.score===0));
  const match=clients[1].room!.matchId;for(const c of clients.slice(1))c.send('rematch');for(const c of clients.slice(1))await c.until(()=>c.room?.phase==='battle'&&c.room.matchId!==match);assert.equal(clients[1].room!.deckCount,24);
 }finally{await app.close();}
});
test('real sockets: reconnect, forfeit grace, session rating, result cleanup and expired session',async()=>{
 const {app,url}=await server({matchingMs:200,revealMs:20,dealingMs:20,reconnectMs:650,durationMs:10000,resultMs:600});
 try{
  const a=await new Client(url).hello('A'),b=await new Client(url).hello('B');a.send('quick');await a.until(()=>!!a.room);b.send('quick');await b.until(()=>b.room?.phase==='battle');await a.until(()=>a.room?.phase==='battle');
  const before=a.room!,token=a.token;a.ws.close();await wait(80);const resumed=await new Client(url).hello('ignored',token);await resumed.until(()=>resumed.room?.phase==='battle');assert.equal(resumed.room!.matchId,before.matchId);assert.deepEqual(resumed.room!.hand,before.hand);
  b.ws.close();await resumed.until(()=>resumed.room?.phase==='result');assert.equal(resumed.room!.winner,resumed.room!.you);assert.match(resumed.room!.reason!,/유예/);assert.equal(resumed.room!.players.find(p=>p.id===resumed.room!.you)!.rating,1012);
  await resumed.until(()=>resumed.messages.some(m=>m.type==='home'&&m.message?.includes('만료')));assert.equal(app.game.rooms.size,0);
  const fresh=await new Client(url).hello('Fresh','nonexistent');assert.ok(fresh.messages.some(m=>m.type==='home'&&m.message?.includes('만료')));
 }finally{await app.close();}
});

test('actual AI from quick start through timed result and rematch; invalid input and rate limiting',async()=>{
 const {app,url}=await server({matchingMs:20,revealMs:20,dealingMs:20,durationMs:5500,decisionMs:400,dealMs:300});
 try{
  const a=await new Client(url).hello('Solo');a.send('quick');await a.until(()=>a.room?.phase==='battle');assert.ok(a.room!.players.some(p=>p.ai));
  a.send('submit',{cards:['forged'],requestId:randomUUID(),handVersion:a.room!.handVersion});await a.until(()=>a.messages.some(m=>m.type==='error'&&m.message.includes('없는 카드')));
  a.ws.send('{bad');await a.until(()=>a.messages.some(m=>m.type==='error'&&m.message.includes('읽을 수')));
  await a.until(()=>a.room?.phase==='result',10000);assert.ok(a.room!.players.find(p=>p.ai)!.score===0||a.room!.players.find(p=>p.ai)!.score>20);const old=a.room!.matchId;a.send('rematch');await a.until(()=>a.room?.phase==='battle'&&a.room.matchId!==old);
  for(let i=0;i<30;i++)a.send('ping');await a.until(()=>a.messages.some(m=>m.type==='error'&&m.message.includes('너무 빨라')));
 }finally{await app.close();}
});
test('two real sockets with controlled 26-point hand: human decision waits and Go is shared',async()=>{
 const {app,url}=await server({matchingMs:1000,revealMs:20,dealingMs:20,durationMs:0,decisionMs:200,dealMs:10000});
 try{
  const a=await new Client(url).hello('A'),b=await new Client(url).hello('B');a.send('quick');await a.until(()=>!!a.room);b.send('quick');await b.until(()=>b.room?.phase==='battle');await a.until(()=>a.room?.phase==='battle');
  const room=app.game.rooms.get(a.room!.code)!,player=room.players.find(p=>p.id===a.room!.you)!;
  player.hand=[{id:randomUUID(),kind:'pronoun',variant:'pronoun-x2'},{id:randomUUID(),kind:'verb'},{id:randomUUID(),kind:'article',variant:'article-x2'},{id:randomUUID(),kind:'count',variant:'count-plus3'},{id:randomUUID(),kind:'adjective',variant:'adjective-plus3'}];player.handVersion++;app.game.broadcast(room);
  await a.until(()=>a.room?.handVersion===player.handVersion);
  a.send('submit',{cards:a.room!.hand.map(c=>c.id),handVersion:a.room!.handVersion,requestId:randomUUID()});
  await a.until(()=>a.room?.decision?.playerId===a.room?.you);await b.until(()=>!!b.room?.decision);assert.equal(a.score,26);assert.equal(a.room!.decision!.expiresAt,0);
  assert.equal(a.room!.players.find(p=>p.id===a.room!.you)?.lastPlayed?.length,5);
  assert.equal(b.room!.players.find(p=>p.id===a.room!.you)?.playedSentences?.[0].length,5);
  assert.equal(b.room!.players.find(p=>p.id===a.room!.you)?.lastAction?.text.includes('+26점'),true);
  await wait(450);assert.equal(a.room!.phase,'battle');assert.equal(a.room!.decision?.playerId,a.room!.you);
  a.send('choice',{decisionId:a.room!.decision!.id,choice:'go'});await a.until(()=>a.room?.goCount===1);await b.until(()=>b.room?.goCount===1);assert.equal(a.room!.multiplier,2);
  const before=a.room!.deckCount;b.send('drawRequest',{requestId:randomUUID()});await b.until(()=>b.messages.some(m=>m.type==='error'&&m.message.includes('최고점')));assert.equal(b.room!.deckCount,before);
  a.send('drawRequest',{requestId:randomUUID()});await a.until(()=>a.room!.deckCount===before-2);await b.until(()=>b.room!.deckCount===before-2);assert.ok(a.room!.drawVote);
  const rival=room.players.find(p=>p.id===b.room!.you)!;rival.hand=[{id:randomUUID(),kind:'pronoun',variant:'pronoun-x2'},{id:randomUUID(),kind:'verb'},{id:randomUUID(),kind:'article',variant:'article-x2'},{id:randomUUID(),kind:'count',variant:'count-plus3'},{id:randomUUID(),kind:'adjective',variant:'adjective-plus3'}];rival.handVersion++;app.game.broadcast(room);await b.until(()=>b.room!.handVersion===rival.handVersion);
  b.send('submit',{cards:b.room!.hand.map(c=>c.id),handVersion:b.room!.handVersion,requestId:randomUUID()});await b.until(()=>b.room?.decision?.playerId===b.room?.you);assert.equal(b.room!.leaderId,b.room!.you);assert.equal(b.score,52);
  b.send('choice',{decisionId:b.room!.decision!.id,choice:'go'});await b.until(()=>b.room?.goCount===2);room.nextDrawRequestAt=0;const next=b.room!.deckCount;
  a.send('drawRequest',{requestId:randomUUID()});await a.until(()=>a.messages.some(m=>m.type==='error'&&m.message.includes('최고점')));assert.equal(a.room!.deckCount,next);
  b.send('drawRequest',{requestId:randomUUID()});await b.until(()=>b.room!.deckCount===next-2);
 }finally{await app.close();}
});
