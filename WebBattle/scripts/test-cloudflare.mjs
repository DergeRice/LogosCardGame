import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {WebSocket} from 'ws';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
const persistence=await mkdtemp(join(tmpdir(),'logos-cloud-test-'));
const make=()=>new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:resolve('.runtime/cloudflare-build/worker.js'),compatibilityDate:'2026-09-01',compatibilityFlags:['nodejs_compat'],durableObjects:{BATTLE:{className:'BattleArena',useSQLite:true}},resourcePersistencePath:persistence,bindings:{ALLOWED_ORIGINS:'https://logos-card-battle.netlify.app',MATCH_SECONDS:'0',RECONNECT_SECONDS:'30'}}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
class Client{
 constructor(url){this.messages=[];this.ws=new WebSocket(url,{origin:'https://logos-card-battle.netlify.app'});this.ws.on('message',raw=>{const m=JSON.parse(raw);this.messages.push(m);if(m.type==='session')this.token=m.token;if(m.type==='state')this.room=m.room;});this.ws.on('error',()=>{});}
 async until(fn){const start=Date.now();while(!fn()){if(Date.now()-start>18000)throw Error('Timeout: '+JSON.stringify(this.messages.slice(-1)).slice(0,400));await wait(25);}}
 send(type,data={}){this.ws.send(JSON.stringify({type,matchId:this.room?.matchId,...data}));}
 async hello(name,token){await this.until(()=>this.ws.readyState===1);this.send('hello',{name,token});await this.until(()=>!!this.token);return this;}
}
let mf=make(),clients=[];
try{
 let url=new URL('/socket',await mf.ready);url.protocol='ws:';
 assert.equal((await (await mf.dispatchFetch('http://localhost/health')).json()).provider,'cloudflare');
 assert.equal((await mf.dispatchFetch('http://localhost/socket',{headers:{Upgrade:'websocket',Origin:'https://untrusted.example'}})).status,403);
 clients=await Promise.all(['A','B','C','D'].map(n=>new Client(url).hello(n)));
 for(const c of clients){c.send('quick');await c.until(()=>!!c.room);}
 for(const c of clients)await c.until(()=>c.room?.phase==='battle');
 assert.ok(clients.every(c=>c.room.endsAt===0&&c.room.expiresAt===0));assert.equal(new Set(clients.map(c=>c.room.code)).size,1);assert.ok(clients.every(c=>c.room.hand.length===5));
 const faces=clients.flatMap(c=>c.room.hand).map(c=>c.kind+':'+(c.variant||'base'));assert.equal(new Set(faces).size,20);
 let actor=clients.find(c=>c.room.hand.some(x=>x.kind==='verb'));
 for(let i=0;!actor&&i<3&&clients[0].room.deckCount>=8;i++){
  const voteId=clients[0].room.drawVote.id,before=clients[0].room.deckCount;
  for(const c of clients)c.send('drawVote',{voteId,approve:true});
  for(const c of clients)await c.until(()=>c.room.deckCount===before-4);
  actor=clients.find(c=>c.room.hand.some(x=>x.kind==='verb'));
 }
 const naturalCorrect=Boolean(actor);actor??=clients[0];const played=actor.room.hand.find(c=>c.kind==='verb')??actor.room.hand[0];
 const message={requestId:randomUUID(),handVersion:actor.room.handVersion,cards:[played.id]};actor.send('submit',message);actor.send('submit',message);
 await actor.until(()=>actor.room.judgment?.submissionId===message.requestId);if(naturalCorrect)assert.equal(actor.room.judgment.valid,true);assert.equal(actor.room.judgment.accepted,false);assert.equal(actor.room.players.find(p=>p.id===actor.room.you).score,0);assert.ok(actor.room.hand.some(c=>c.id===played.id));await actor.until(()=>actor.messages.some(m=>m.duplicate));
 const saved=clients.map(c=>({token:c.token,room:c.room}));for(const c of clients)c.ws.close();await wait(250);await mf.dispose();
 mf=make();url=new URL('/socket',await mf.ready);url.protocol='ws:';
 clients=await Promise.all(saved.map(s=>new Client(url).hello('resumed',s.token)));
 for(let i=0;i<4;i++){await clients[i].until(()=>clients[i].room?.phase==='battle');assert.equal(clients[i].room.matchId,saved[i].room.matchId);assert.deepEqual(clients[i].room.hand,saved[i].room.hand);}
 const restored=clients[saved.findIndex(s=>s.token===actor.token)];restored.send('submit',message);await restored.until(()=>restored.messages.some(m=>m.duplicate));
 const beforeDraw=clients[0].room.deckCount,voteId=clients[0].room.drawVote.id,handSizes=clients.map(c=>c.room.hand.length);for(const c of clients)c.send('drawVote',{voteId,approve:true});for(let i=0;i<clients.length;i++)await clients[i].until(()=>clients[i].room.hand.length===handSizes[i]+1);assert.equal(clients[0].room.deckCount,beforeDraw-4);
 clients[0].send('leave');for(const c of clients.slice(1))await c.until(()=>c.room?.phase==='result');
 for(const c of clients.slice(1))c.send('rematch');for(const c of clients.slice(1))await c.until(()=>c.room?.phase==='battle'&&c.room.matchId!==saved[0].room.matchId);
 console.log(`PASS: real Cloudflare runtime: 4 WebSockets, unique deck, ${naturalCorrect?'Correct':'invalid natural submission'} retention/dedupe, SQLite process restart recovery, unanimous draw, forfeit, rematch, rejected origin. No forced score/hand/winner.`);
}finally{for(const c of clients)c.ws.close();await mf.dispose();}
