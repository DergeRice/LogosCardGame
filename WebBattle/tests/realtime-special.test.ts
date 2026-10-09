import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {WebSocket} from 'ws';
import {createBattleServer} from '../server/index.js';
import type {Card,RoomView} from '../shared/rules.js';
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
class Client{
 ws:WebSocket;room?:RoomView;token='';messages:any[]=[];
 constructor(url:string){this.ws=new WebSocket(url);this.ws.on('message',raw=>{const m=JSON.parse(String(raw));this.messages.push(m);if(m.type==='session')this.token=m.token;if(m.type==='state')this.room=m.room;});}
 async until(fn:()=>boolean){const start=Date.now();while(!fn()){if(Date.now()-start>7000)throw Error('Timeout '+JSON.stringify(this.messages.slice(-2)));await wait(15);}}
 async hello(name:string){await new Promise<void>(resolve=>this.ws.once('open',resolve));this.send('hello',{name});await this.until(()=>!!this.token);return this;}
 send(type:string,more:Record<string,unknown>={}){this.ws.send(JSON.stringify({type,matchId:this.room?.matchId,...more}));}
}
const card=(kind:Card['kind']):Card=>({id:randomUUID(),kind});
test('real WebSockets: GET draw, protected ROB, private offer and accepted EXCHANGE',async()=>{
 const app=createBattleServer({matchingMs:200,revealMs:20,dealingMs:20,dealMs:10000});
 await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const port=(app.server.address() as {port:number}).port,url=`ws://127.0.0.1:${port}/socket`;
 const a=await new Client(url).hello('A'),b=await new Client(url).hello('B');
 try{
  a.send('quick');b.send('quick');await a.until(()=>a.room?.phase==='battle');await b.until(()=>b.room?.phase==='battle');const r=app.game.rooms.get(a.room!.code)!,pa=app.game.sessions.get(a.token)!,pb=app.game.sessions.get(b.token)!;
  const get=card('get2'),rob=card('rob'),ex=card('exchange'),offer=card('pronoun'),shield=card('protect'),give=card('verb');pa.hand=[get,rob,ex,offer];pb.hand=[shield,give];pa.handVersion++;pb.handVersion++;r.deck=[card('mass'),card('be')];app.game.broadcast(r);await a.until(()=>a.room?.handVersion===pa.handVersion);
  await b.until(()=>b.room?.players.find(p=>p.id===pa.id)?.handPreview?.length===4);
  assert.deepEqual(a.room!.players.find(p=>p.id===pb.id)?.handPreview?.map(c=>c.id),pb.hand.map(c=>c.id));
  const request=()=>({handVersion:a.room!.handVersion,requestId:randomUUID()});a.send('special',{...request(),cardId:get.id});await a.until(()=>a.room!.hand.length===5&&a.room!.deckCount===0);assert.equal(new Set(a.room!.hand.map(c=>c.id)).size,5);
  a.send('inspectRob',{cardId:rob.id});await a.until(()=>a.messages.some(m=>m.type==='robView'));const peek=a.messages.find(m=>m.type==='robView');const robTarget=peek.players.find((p:any)=>p.id===pb.id);assert.deepEqual(robTarget.cards,[]);assert.equal(b.messages.some(m=>m.type==='robView'),false);
  pa.actionAt=0;a.send('special',{...request(),cardId:rob.id,targetId:pb.id,stealId:give.id,stealSource:'hand',targetHandVersion:robTarget.handVersion});await a.until(()=>a.room!.log.some(entry=>entry.text.includes('PROTECT')));assert.equal(a.room!.hand.some(c=>c.id===rob.id),true);assert.equal(b.room!.hand.length,2);assert.equal(a.room!.hand.some(c=>c.id===give.id),false);
  pa.actionAt=0;a.send('inspectExchange',{cardId:ex.id});await a.until(()=>a.messages.some(m=>m.type==='exchangeView'));const exchangeView=a.messages.find(m=>m.type==='exchangeView');assert.ok(exchangeView.players.find((p:any)=>p.id===pb.id).cards.some((c:Card)=>c.id===give.id));assert.equal(b.messages.some(m=>m.type==='exchangeView'),false);
  a.send('special',{...request(),cardId:ex.id,targetId:pb.id,offerId:offer.id,wantedId:give.id,targetHandVersion:exchangeView.players.find((p:any)=>p.id===pb.id).handVersion});await b.until(()=>b.room?.exchange?.offer?.id===offer.id);assert.equal(a.room!.exchange?.offer,undefined);assert.equal(b.room!.exchange?.wanted?.id,give.id);
  b.send('exchangeReply',{exchangeId:b.room!.exchange!.id,accept:true});await a.until(()=>a.room!.hand.some(c=>c.id===give.id));await b.until(()=>b.room!.hand.some(c=>c.id===offer.id));assert.equal(a.room!.exchange,undefined);
  const ex2=card('exchange'),offer2=card('mass');pa.hand.push(ex2,offer2);pa.handVersion++;pa.actionAt=0;app.game.broadcast(r);await a.until(()=>a.room?.hand.some(c=>c.id===ex2.id)===true);
  a.send('inspectExchange',{cardId:ex2.id});await a.until(()=>a.messages.filter(m=>m.type==='exchangeView').length===2);
  a.send('special',{...request(),cardId:ex2.id,targetId:pb.id,offerId:offer2.id,wantedId:offer.id,targetHandVersion:pb.handVersion});await b.until(()=>b.room?.exchange?.wanted?.id===offer.id);
  b.send('exchangeReply',{exchangeId:b.room!.exchange!.id,accept:false,reason:'동사 필요'});await a.until(()=>a.messages.some(m=>m.type==='exchangeResponse'&&m.reason==='동사 필요'));await b.until(()=>b.room?.exchange===undefined);
  assert.equal(b.messages.some(m=>m.type==='exchangeResponse'),false);assert.equal(pa.hand.some(c=>c.id===offer2.id),true);
 }finally{a.ws.close();b.ws.close();await app.close();}
});
test('real WebSockets: ROB takes a chosen field card and removes it from both public boards',async()=>{
 const app=createBattleServer({matchingMs:200,revealMs:20,dealingMs:20,dealMs:10000});
 await new Promise<void>(resolve=>app.server.listen(0,'127.0.0.1',resolve));const port=(app.server.address() as {port:number}).port,url=`ws://127.0.0.1:${port}/socket`;
 const a=await new Client(url).hello('A'),b=await new Client(url).hello('B');
 try{
  a.send('quick');b.send('quick');await a.until(()=>a.room?.phase==='battle');await b.until(()=>b.room?.phase==='battle');
  const r=app.game.rooms.get(a.room!.code)!,pa=app.game.sessions.get(a.token)!,pb=app.game.sessions.get(b.token)!;
  const rob=card('rob'),field=card('verb');pa.hand=[rob];pa.handVersion++;pb.hand=[];pb.handVersion++;pb.lastPlayed=[field];pb.playedSentences=[[field]];pb.fieldVersion=1;pb.score=26;r.discard=[field];app.game.broadcast(r);
  await a.until(()=>Boolean(a.room?.hand.some(c=>c.id===rob.id)&&a.room?.players.find(p=>p.id===pb.id)?.lastPlayed?.some(c=>c.id===field.id)));
  a.send('inspectRob',{cardId:rob.id});await a.until(()=>a.messages.some(m=>m.type==='robView'&&m.players?.some((p:any)=>p.cards?.some((c:Card)=>c.id===field.id))));
  const peek=a.messages.find(m=>m.type==='robView'&&m.players?.some((p:any)=>p.cards?.some((c:Card)=>c.id===field.id))),robTarget=peek.players.find((p:any)=>p.id===pb.id);assert.equal(robTarget.cards.find((c:Card&{source:string})=>c.id===field.id)?.source,'field');assert.equal(b.messages.some(m=>m.type==='robView'),false);
  a.send('special',{cardId:rob.id,targetId:pb.id,stealId:field.id,stealSource:'field',targetFieldVersion:robTarget.fieldVersion,handVersion:a.room!.handVersion,requestId:randomUUID()});
  await a.until(()=>a.room?.hand.some(c=>c.id===field.id)===true);await b.until(()=>b.room?.players.find(p=>p.id===pb.id)?.lastPlayed?.length===0);
  assert.equal(a.room!.players.find(p=>p.id===pb.id)?.playedSentences?.length,0);assert.equal(b.room!.players.find(p=>p.id===pb.id)?.score,26);
  assert.equal(a.room!.usedCards.some(c=>c.id===field.id),false);
  await b.until(()=>b.room?.robNotices?.[0]?.card.id===field.id);assert.equal(b.room!.robNotices![0].fromName,pa.name);assert.equal(b.room!.robNotices![0].source,'field');assert.equal(a.room!.robNotices?.length??0,0);
  b.send('robNoticeRead',{noticeId:b.room!.robNotices![0].id});await b.until(()=>b.room?.robNotices?.length===0);
 }finally{a.ws.close();b.ws.close();await app.close();}
});


