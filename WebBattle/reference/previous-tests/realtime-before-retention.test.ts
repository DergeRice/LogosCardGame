import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { createBattleServer } from '../server/index.js';
import { chooseMove } from '../server/ai.js';
import { judgeCards, type RoomView } from '../shared/rules.js';
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

test('four real sockets: quick matching, shared deck, timed draw, valid play, duplicate, Go x2/x3/x4, Stop/rating/rematch',async()=>{
 // Only timers are accelerated; hands, scores and winners use ordinary server play.
 const {app,url}=await server({matchingMs:1200,revealMs:50,dealingMs:50,dealMs:1700,durationMs:90000});
 try{
  const clients=await Promise.all(['A','B','C','D'].map(n=>new Client(url).hello(n)));
  clients[0].send('quick');await clients[0].until(()=>clients[0].room?.phase==='matching');assert.ok(clients[0].room!.players.some(p=>p.ai));
  for(const c of clients.slice(1)){c.send('quick');await c.until(()=>!!c.room);}
  for(const c of clients)await c.until(()=>c.room?.phase==='battle');
  assert.equal(new Set(clients.map(c=>c.room!.code)).size,1);assert.equal(clients[0].room!.players.length,4);assert.ok(clients[0].room!.players.every(p=>!p.ai));
  assert.equal(clients[0].room!.deckCount,100);assert.ok(clients.every(c=>c.room!.hand.length===5));
  const ids=clients.flatMap(c=>c.room!.hand.map(card=>card.id));assert.equal(new Set(ids).size,20);
  for(const other of clients.slice(1))for(const card of other.room!.hand)assert.ok(!JSON.stringify(clients[0].room).includes(card.id));
  assert.ok(!JSON.stringify(clients[0].room).includes('discard'));assert.ok(!JSON.stringify(clients[0].room).includes(clients[1].token));
  const fifth=await new Client(url).hello('E');fifth.send('quick');await fifth.until(()=>!!fifth.room);assert.notEqual(fifth.room!.code,clients[0].room!.code);fifth.send('leave');
  await clients[0].until(()=>clients[0].room!.dealSerial===2);assert.equal(clients[0].room!.deckCount,96);assert.ok(clients[0].room!.players.every(p=>p.handCount===6));
  let duplicated=false,steps=0,gotResult=false;const decisionOwners=new Set<string>();
  while(!gotResult&&steps++<55){
   const state=clients[0].room!;
   if(state.decision){
    const owner=clients.find(c=>c.room!.you===state.decision!.playerId)!;decisionOwners.add(owner.room!.you);
    const intruder=clients.find(c=>c!==owner)!;intruder.send('choice',{decisionId:state.decision.id,choice:'go'});await intruder.until(()=>intruder.messages.some(m=>m.type==='error'&&m.message.includes('주도권')));
    const previousGo=state.goCount,choice=previousGo<3?'go':'stop';const command={decisionId:state.decision.id,choice};owner.send('choice',command);owner.send('choice',command);
    await owner.until(()=>choice==='stop'?owner.room?.phase==='result':owner.room!.goCount===previousGo+1);
    if(choice==='stop'){gotResult=true;break;}assert.equal(owner.room!.multiplier,previousGo+2);
    await wait(50);continue;
   }
   // Concurrent legal submissions. The server serializes a newly opened decision.
   for(const c of clients){if(Date.now()<c.room!.actionAt)continue;const before=c.room!.hand,score=c.score;const cmd=c.move();if(cmd&&!duplicated){duplicated=true;c.send('submit',cmd);await c.until(()=>c.messages.some(m=>m.duplicate));const base=judgeCards(cmd.cards.map(id=>before.find(x=>x.id===id)!));assert.equal(c.score,score+base.points*state.multiplier);for(const id of cmd.cards.slice(base.usedStartIndex,base.usedStartIndex+base.usedLength))assert.ok(!c.room!.hand.some(x=>x.id===id));}}
   await wait(1600);
  }
  assert.ok(gotResult,'ordinary legal moves must finish via Stop');assert.ok(duplicated);assert.ok(decisionOwners.size>=1);
  for(const c of clients)await c.until(()=>c.room?.phase==='result');const final=clients[0].room!;assert.equal(final.goCount,3);assert.equal(final.multiplier,4);
  for(const p of final.players){assert.equal(p.reward,p.score*4);assert.equal(p.rating,1000+p.ratingDelta);assert.equal(p.points,p.reward);}
  const rewards=final.players.map(p=>p.reward);clients[0].send('choice',{choice:'stop',decisionId:'old'});await wait(50);assert.deepEqual(clients[0].room!.players.map(p=>p.reward),rewards);
  const match=final.matchId;for(const c of clients)c.send('rematch');for(const c of clients)await c.until(()=>c.room?.phase==='battle'&&c.room.matchId!==match);assert.ok(clients[0].room!.players.every(p=>p.score===0));assert.equal(clients[0].room!.hand.length,5);
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
  await a.until(()=>a.room?.phase==='result',10000);assert.ok(a.room!.players.find(p=>p.ai)!.score>0);const old=a.room!.matchId;a.send('rematch');await a.until(()=>a.room?.phase==='battle'&&a.room.matchId!==old);
  for(let i=0;i<30;i++)a.send('ping');await a.until(()=>a.messages.some(m=>m.type==='error'&&m.message.includes('너무 빨라')));
 }finally{await app.close();}
});
