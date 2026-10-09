import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { createBattleServer } from '../server/index.js';
import type { RoomView } from '../shared/rules.js';
const wait = (ms:number)=>new Promise(r=>setTimeout(r,ms));
class Client {
 ws: WebSocket; messages: any[]=[]; room?:RoomView; token='';
 constructor(url:string){this.ws=new WebSocket(url);this.ws.on('message',data=>{const msg=JSON.parse(data.toString());this.messages.push(msg);if(msg.type==='state')this.room=msg.room;if(msg.type==='session')this.token=msg.token;});}
 async opened(){if(this.ws.readyState!==1)await new Promise<void>(r=>this.ws.once('open',()=>r()));return this;}
 send(type:string,extra:Record<string,unknown>={}){this.ws.send(JSON.stringify({type,...extra}));}
 async until(fn:()=>boolean,timeout=5000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw Error('Timed out: '+JSON.stringify(this.messages.slice(-3)));await wait(15);}}
 async hello(name:string,token?:string){await this.opened();this.send('hello',{name,token});await this.until(()=>Boolean(this.token));return this;}
 submit(extra:Record<string,unknown>={}){const r=this.room!;const cards=['pronoun','verb'].map(kind=>r.hand.find(c=>c.kind===kind)!.id);const msg={type:'submit',cards,matchId:r.matchId,handVersion:r.handVersion,requestId:randomUUID(),...extra};this.send('submit',msg);return msg;}
}
test('real WebSockets: room validation, privacy, simultaneous/double/stale requests, resume, result, rematch, forfeit', async()=>{
 const app=createBattleServer({durationMs:4000,reconnectMs:600}); await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const port=(app.server.address() as {port:number}).port,url=`ws://127.0.0.1:${port}/socket`;
 try{
  const a=await new Client(url).hello('Alpha'), b=await new Client(url).hello('Beta'), c=await new Client(url).hello('Gamma');
  c.send('join',{code:'000000'});await c.until(()=>c.messages.some(m=>m.type==='error'&&m.message.includes('존재')));
  a.send('create');await a.until(()=>Boolean(a.room));assert.match(a.room!.code,/^\d{6}$/);b.send('join',{code:a.room!.code});await b.until(()=>Boolean(b.room));
  c.send('join',{code:a.room!.code});await c.until(()=>c.messages.some(m=>m.type==='error'&&m.message.includes('가득')));
  a.send('ready',{matchId:a.room!.matchId,ready:true});b.send('ready',{matchId:b.room!.matchId,ready:true});await a.until(()=>a.room?.phase==='battle');await b.until(()=>b.room?.phase==='battle');
  assert.equal(a.room!.matchId,b.room!.matchId);assert.equal(a.room!.endsAt,b.room!.endsAt);
  assert.deepEqual(a.room!.hand.map(c=>c.kind).sort(),b.room!.hand.map(c=>c.kind).sort());
  const wire=JSON.stringify(a.room);for(const card of b.room!.hand)assert.ok(!wire.includes(card.id));assert.ok(!wire.includes(b.token));assert.ok(!wire.includes('nextAI'));
  c.send('join',{code:a.room!.code});await c.until(()=>c.messages.some(m=>m.type==='error'&&m.message.includes('대전 중')));
  await wait(1050);
  const duplicate=a.submit({score:999999,winner:a.room!.you});b.submit();a.send('submit',duplicate);
  await a.until(()=>a.room!.players.every(p=>p.score===14));assert.equal(a.room!.players.find(p=>p.id===a.room!.you)!.score,14);await a.until(()=>a.messages.some(m=>m.duplicate===true));
  a.send('submit',{...duplicate,requestId:randomUUID()});await a.until(()=>a.messages.some(m=>m.type==='error'&&m.message.includes('이전 카드')));
  a.send('submit',{...duplicate,cards:[b.room!.hand[0].id,b.room!.hand[1].id],handVersion:a.room!.handVersion,requestId:randomUUID()});
  const token=a.token;const roomCode=a.room!.code;a.ws.close();await wait(60);const resumed=await new Client(url).hello('ignored',token);await resumed.until(()=>resumed.room?.code===roomCode);assert.equal(resumed.room!.players.find(p=>p.id===resumed.room!.you)!.score,14);
  await resumed.until(()=>resumed.room?.phase==='result',6000);assert.equal(resumed.room!.winner,null);
  const oldMatch=resumed.room!.matchId;resumed.send('rematch',{matchId:oldMatch});b.send('rematch',{matchId:oldMatch});await resumed.until(()=>resumed.room?.phase==='battle');assert.notEqual(resumed.room!.matchId,oldMatch);assert.ok(resumed.room!.players.every(p=>p.score===0));
  resumed.send('submit',{...duplicate,requestId:randomUUID(),handVersion:resumed.room!.handVersion});await resumed.until(()=>resumed.messages.some(m=>m.type==='error'&&m.message.includes('이전 카드')));
  b.ws.close();await resumed.until(()=>resumed.room?.phase==='result');assert.equal(resumed.room!.winner,resumed.room!.you);assert.match(resumed.room!.reason!,/유예/);
 }finally{await app.close();}
});
test('expiry, malformed input, invalid hand, rate limit, actual AI score and rematch',async()=>{
 const app=createBattleServer({durationMs:5000,reconnectMs:500,lobbyMs:400,resultMs:800});await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const url=`ws://127.0.0.1:${(app.server.address() as {port:number}).port}/socket`;
 try{
  const a=await new Client(url).hello('Solo');a.send('create');await a.until(()=>Boolean(a.room));await a.until(()=>a.messages.some(m=>m.type==='home'&&m.message?.includes('만료')));assert.equal(app.game.rooms.size,0);
  a.room=undefined;a.send('ai',{difficulty:'hard'});await a.until(()=>Boolean(a.room));a.send('ready',{matchId:a.room!.matchId,ready:true});await a.until(()=>a.room?.phase==='battle');await wait(1050);
  a.submit({cards:[a.room!.hand[0].id,a.room!.hand[0].id]});await a.until(()=>a.messages.some(m=>m.type==='error'&&m.message.includes('서로 다른')));
  a.submit({cards:['forged','forged2']});await a.until(()=>a.messages.some(m=>m.type==='error'&&m.message.includes('없는 카드')));
  a.submit({cards:[a.room!.hand.find(c=>c.kind==='count')!.id,a.room!.hand.find(c=>c.kind==='be')!.id]});await a.until(()=>a.room?.judgment?.valid===false);assert.equal(a.room!.players.find(p=>p.id===a.room!.you)!.score,0);
  a.ws.send('{bad');await a.until(()=>a.messages.some(m=>m.type==='error'&&m.message.includes('읽을 수')));
  await a.until(()=>a.room?.phase==='result',6000);assert.ok(a.room!.players.find(p=>p.ai)!.score>0);const match=a.room!.matchId;a.send('rematch',{matchId:match});await a.until(()=>a.room?.phase==='battle'&&a.room.matchId!==match);
  for(let i=0;i<30;i++)a.send('ping');await a.until(()=>a.messages.some(m=>m.type==='error'&&m.message.includes('너무 빨라')));
 }finally{await app.close();}
});
test('rematch agreement survives disconnect: reconnect starts the agreed match without deadlock',async()=>{
 const app=createBattleServer({durationMs:1200,reconnectMs:1000});await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const url=`ws://127.0.0.1:${(app.server.address() as {port:number}).port}/socket`;
 try {
  const a=await new Client(url).hello('A'),b=await new Client(url).hello('B');a.send('create');await a.until(()=>Boolean(a.room));b.send('join',{code:a.room!.code});await b.until(()=>Boolean(b.room));a.send('ready',{matchId:a.room!.matchId,ready:true});b.send('ready',{matchId:b.room!.matchId,ready:true});await a.until(()=>a.room?.phase==='result');const old=a.room!.matchId;
  b.send('rematch',{matchId:old});await a.until(()=>a.room!.players.find(p=>p.name==='B')!.rematch);b.ws.close();await a.until(()=>!a.room!.players.find(p=>p.name==='B')!.connected);a.send('rematch',{matchId:old});await a.until(()=>a.room!.players.every(p=>p.rematch));assert.equal(a.room!.phase,'result');
  const resumed=await new Client(url).hello('B',b.token);await resumed.until(()=>resumed.room?.phase==='battle');assert.notEqual(resumed.room!.matchId,old);
 } finally {await app.close();}
});
test('server consumes and scores ONLY the recognized segment, preserves leftovers, accepts one VB',async()=>{
 const app=createBattleServer({durationMs:6000});await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const url=`ws://127.0.0.1:${(app.server.address() as {port:number}).port}/socket`;
 try {
  const a=await new Client(url).hello('Partial');a.send('ai',{difficulty:'easy'});await a.until(()=>Boolean(a.room));a.send('ready',{matchId:a.room!.matchId,ready:true});await a.until(()=>a.room?.phase==='battle');await wait(1050);
  const before=[...a.room!.hand], adjectives=before.filter(c=>c.kind==='adjective'), verb=before.find(c=>c.kind==='verb')!;
  const msg={cards:[adjectives[0].id,verb.id,adjectives[1].id],matchId:a.room!.matchId,handVersion:a.room!.handVersion,requestId:randomUUID()};a.send('submit',msg);a.send('submit',msg);
  await a.until(()=>a.room!.judgment?.valid===true);const r=a.room!,j=r.judgment!;assert.equal(j.usedStartIndex,1);assert.equal(j.usedLength,1);assert.equal(j.patternType,1);assert.equal(j.points,12);assert.equal(r.players.find(p=>p.id===r.you)!.score,12);
  assert.equal(r.hand.length,10);assert.ok(!r.hand.some(c=>c.id===verb.id));for(const c of before.filter(c=>c.id!==verb.id))assert.ok(r.hand.some(newCard=>newCard.id===c.id));
  await wait(1550);a.submit({cards:[a.room!.hand.find(c=>c.kind==='verb')!.id]});await a.until(()=>a.room!.players.find(p=>p.id===a.room!.you)!.score===24);
 }finally{await app.close();}
});
