import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {WebSocket} from 'ws';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
const persistence=await mkdtemp(join(tmpdir(),'logos-cloud-test-'));
const make=(diagnostics='1')=>new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:resolve('.runtime/cloudflare-build/worker.js'),compatibilityDate:'2026-09-01',compatibilityFlags:['nodejs_compat'],durableObjects:{BATTLE:{className:'BattleArena',useSQLite:true}},resourcePersistencePath:persistence,bindings:{ALLOWED_ORIGINS:'https://logos-card-battle.netlify.app',MATCH_SECONDS:'0',RECONNECT_SECONDS:'180',CAPTURE_DIAGNOSTICS:diagnostics,ADMIN_LOG_TOKEN:'test-admin-secret-32-characters-long'}}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
class Client{
 constructor(url){this.messages=[];this.ws=new WebSocket(url,{origin:'https://logos-card-battle.netlify.app'});this.ws.on('message',raw=>{const m=JSON.parse(raw);this.messages.push(m);if(m.type==='session')this.token=m.token;if(m.type==='state')this.room=m.room;});this.ws.on('error',()=>{});}
 async until(fn){const start=Date.now();while(!fn()){if(Date.now()-start>18000)throw Error('Timeout: '+JSON.stringify(this.messages.slice(-1)).slice(0,400));await wait(25);}}
 send(type,data={}){this.ws.send(JSON.stringify({type,matchId:this.room?.matchId,...data}));}
 async hello(name,token,authToken){await this.until(()=>this.ws.readyState===1);this.send('hello',{name,token,authToken});await this.until(()=>!!this.token);return this;}
}
let mf=make(),clients=[];
try{
 let url=new URL('/socket',await mf.ready);url.protocol='ws:';
 assert.equal((await (await mf.dispatchFetch('http://localhost/health')).json()).provider,'cloudflare');
 assert.equal((await mf.dispatchFetch('http://localhost/socket',{headers:{Upgrade:'websocket',Origin:'https://untrusted.example'}})).status,403);
 assert.equal((await mf.dispatchFetch('http://localhost/admin/accounts?name=dergerice%20dev')).status,401);
 assert.equal((await mf.dispatchFetch('http://localhost/admin/grants/super',{method:'POST',body:JSON.stringify({name:'dergerice dev',id:'forged'})})).status,401);
 clients=await Promise.all(['A','B','C','D'].map(n=>new Client(url).hello(n)));
 clients[0].send('register',{username:'cloud_player',password:'a strong cloud password'});
 await clients[0].until(()=>clients[0].messages.some(m=>m.type==='auth'));
 const accountToken=clients[0].messages.find(m=>m.type==='auth').authToken;
 for(const c of clients){c.send('quick');await c.until(()=>!!c.room);}
 for(const c of clients)await c.until(()=>c.room?.phase==='battle');
 assert.ok(clients.every(c=>c.room.endsAt===0&&c.room.expiresAt===0));assert.equal(new Set(clients.map(c=>c.room.code)).size,1);assert.ok(clients.every(c=>c.room.hand.length===5));
 const faces=clients.flatMap(c=>c.room.hand).map(c=>c.id);assert.equal(new Set(faces).size,20);
 let actor=clients.find(c=>c.room.hand.some(x=>x.kind==='verb'));
 for(let i=0;!actor&&i<3&&clients[0].room.deckCount>=8;i++){
  const voteId=clients[0].room.drawVote.id,before=clients[0].room.deckCount;
  for(const c of clients)c.send('drawVote',{voteId,approve:true});
  for(const c of clients)await c.until(()=>c.room.deckCount===before-4);
  actor=clients.find(c=>c.room.hand.some(x=>x.kind==='verb'));
 }
 const naturalCorrect=Boolean(actor);actor??=clients[0];const played=actor.room.hand.find(c=>c.kind==='verb')??actor.room.hand[0];
 const message={requestId:randomUUID(),handVersion:actor.room.handVersion,cards:[played.id]};actor.send('submit',message);actor.send('submit',message);
 await actor.until(()=>actor.room.judgment?.submissionId===message.requestId);if(naturalCorrect)assert.equal(actor.room.judgment.valid,true);assert.equal(actor.room.judgment.accepted,naturalCorrect);assert.equal(actor.room.players.find(p=>p.id===actor.room.you).score,naturalCorrect?actor.room.judgment.points:0);assert.equal(actor.room.hand.some(c=>c.id===played.id),!naturalCorrect);await actor.until(()=>actor.messages.some(m=>m.duplicate));
 const adminHeaders={Authorization:'Bearer test-admin-secret-32-characters-long',Origin:'https://logos-card-battle.netlify.app'};
 assert.equal((await mf.dispatchFetch('http://localhost/admin/logs')).status,200);
 assert.equal((await mf.dispatchFetch('http://localhost/admin/logs',{headers:{Authorization:'Bearer wrong'}})).status,200);
 assert.equal((await mf.dispatchFetch('http://localhost/admin/logs/access/bootstrap',{method:'POST'})).status,401);
 assert.equal((await mf.dispatchFetch('http://localhost/admin/logs/unknown',{method:'POST',body:'{}'})).status,401);
 const bootstrap=await (await mf.dispatchFetch('http://localhost/admin/logs/access/bootstrap',{method:'POST',headers:adminHeaders})).json();
 const session=await (await mf.dispatchFetch('http://localhost/admin/logs/access/redeem',{method:'POST',headers:{Origin:'https://logos-card-battle.netlify.app'},body:JSON.stringify({code:bootstrap.token})})).json();
 const sessionHeaders={Origin:'https://logos-card-battle.netlify.app',Authorization:'Bearer '+session.token};
 assert.equal((await mf.dispatchFetch('http://localhost/admin/logs',{headers:sessionHeaders})).status,200);
 assert.equal((await mf.dispatchFetch('http://localhost/admin/logs/access/redeem',{method:'POST',body:JSON.stringify({code:bootstrap.token})})).status,401);
 const audit=await (await mf.dispatchFetch('http://localhost/admin/logs?q='+message.requestId,{headers:adminHeaders})).json();
 assert.ok(audit.logs.some(e=>e.event==='submit_result'));
 assert.ok(audit.logs.every(e=>e.event!=='request'&&e.event!=='judgment'));
 assert.ok(audit.inventory.some(row=>row.kind==='player'&&row.count>=4));
 for(let i=0;i<8;i++)actor.send('clientEvent',{event:'ui_actions',events:['select']});
 await wait(300);
 const minimalLogs=await (await mf.dispatchFetch('http://localhost/admin/logs?limit=500',{headers:adminHeaders})).json();
 assert.ok(minimalLogs.logs.every(e=>e.event==='submit_result'||e.level==='error'||e.details.code==='AUDIO_FAILURE'));
 const resultLog=audit.logs.find(e=>e.event==='submit_result');assert.equal(resultLog.details.submittedCards[0].id,played.id);
 const sentenceStats=await (await mf.dispatchFetch('http://localhost/admin/logs/sentences',{headers:adminHeaders})).json();
 assert.equal(sentenceStats.total,naturalCorrect?1:0);assert.equal(sentenceStats.unique,naturalCorrect?1:0);
 const auditId=audit.logs[0].id;
 assert.equal(JSON.stringify(audit).includes(accountToken),false);
 const reviewed=await mf.dispatchFetch('http://localhost/admin/logs/'+auditId,{method:'POST',headers:{...adminHeaders,'Content-Type':'application/json'},body:JSON.stringify({status:'investigating',note:'재시작 저장 검사'})});assert.equal(reviewed.status,200);
 await wait(Math.max(0,actor.room.actionAt-Date.now())+30);
 const trashCard=actor.room.hand.find(c=>c.id!==played.id)??actor.room.hand[0],trashSize=actor.room.hand.length,trashDeck=actor.room.deckCount,trashRequest={requestId:randomUUID(),cardId:trashCard.id,handVersion:actor.room.handVersion};
 actor.send('discard',trashRequest);actor.send('discard',trashRequest);await actor.until(()=>actor.room.hand.length===trashSize-1);await actor.until(()=>actor.messages.some(m=>m.requestId===trashRequest.requestId&&m.duplicate));assert.equal(actor.room.deckCount,trashDeck);assert.equal(actor.room.storage.filter(c=>c.id===trashCard.id).length,1);assert.equal(actor.room.usedCards.filter(c=>c.id===trashCard.id).length,0);
 const saved=clients.map(c=>({token:c.token,room:c.room}));for(const c of clients)c.ws.close();await wait(250);await mf.dispose();
 mf=make();url=new URL('/socket',await mf.ready);url.protocol='ws:';
 clients=await Promise.all(saved.map((s,i)=>new Client(url).hello('resumed',s.token,i===0?accountToken:undefined)));
 for(let i=0;i<4;i++){await clients[i].until(()=>clients[i].room?.phase==='battle');assert.equal(clients[i].room.matchId,saved[i].room.matchId);assert.deepEqual(clients[i].room.hand,saved[i].room.hand);}
 assert.equal(clients[saved.findIndex(s=>s.token===actor.token)].room.storage[0].id,trashCard.id);
 const persistedAudit=await (await mf.dispatchFetch('http://localhost/admin/logs?q='+message.requestId,{headers:adminHeaders})).json();assert.ok(persistedAudit.logs.some(e=>e.id===auditId&&e.note==='재시작 저장 검사'));
 assert.equal((await mf.dispatchFetch('http://localhost/admin/logs',{headers:sessionHeaders})).status,200);
 const persistedStats=await (await mf.dispatchFetch('http://localhost/admin/logs/sentences',{headers:adminHeaders})).json();assert.equal(persistedStats.total,sentenceStats.total);assert.equal(persistedStats.unique,sentenceStats.unique);
 const restored=clients[saved.findIndex(s=>s.token===actor.token)];restored.send('submit',message);await restored.until(()=>restored.messages.some(m=>m.duplicate));
 await wait(Math.max(0,restored.room.actionAt-Date.now())+30);const retrieve={requestId:randomUUID(),cardId:trashCard.id,handVersion:restored.room.handVersion,storageVersion:restored.room.storageVersion};restored.send('retrieveCard',retrieve);restored.send('retrieveCard',retrieve);await restored.until(()=>restored.room.storage.length===0&&restored.room.hand.some(c=>c.id===trashCard.id));await restored.until(()=>restored.messages.some(m=>m.requestId===retrieve.requestId&&m.duplicate));assert.equal(restored.room.hand.filter(c=>c.id===trashCard.id).length,1);
 const beforeDraw=clients[0].room.deckCount,voteId=clients[0].room.drawVote.id,handSizes=clients.map(c=>c.room.hand.length);for(const c of clients)c.send('drawVote',{voteId,approve:true});for(let i=0;i<clients.length;i++)await clients[i].until(()=>clients[i].room.hand.length===handSizes[i]+1);assert.equal(clients[0].room.deckCount,beforeDraw-4);
 clients[0].send('leave');for(const c of clients.slice(1))await c.until(()=>c.room?.phase==='result');
 for(const c of clients.slice(1))c.send('rematch');for(const c of clients.slice(1))await c.until(()=>c.room?.phase==='battle'&&c.room.matchId!==saved[0].room.matchId);
 // Production default: gameplay persists while automatic diagnostics stay off.
 const beforeRestart=clients.slice(1).map(c=>({token:c.token,hand:c.room.hand,matchId:c.room.matchId}));
 for(const c of clients)c.ws.close();await wait(250);await mf.dispose();mf=make('0');url=new URL('/socket',await mf.ready);url.protocol='ws:';
 clients=await Promise.all(beforeRestart.map(s=>new Client(url).hello('restored',s.token)));
 for(let i=0;i<clients.length;i++){await clients[i].until(()=>clients[i].room?.phase==='battle');assert.deepEqual(clients[i].room.hand,beforeRestart[i].hand);}
 const special=['rob','exchange','protect','get2','get3','nothing'];const probe=clients.find(c=>c.room.hand.some(x=>!special.includes(x.kind)));assert.ok(probe);const quietId=randomUUID(),card=probe.room.hand.find(x=>!special.includes(x.kind));
 await wait(Math.max(0,probe.room.actionAt-Date.now())+30);
 probe.send('submit',{requestId:quietId,handVersion:probe.room.handVersion,cards:[card.id]});
 await probe.until(()=>probe.room.judgment?.submissionId===quietId);
 const quiet=await(await mf.dispatchFetch('http://localhost/admin/logs?q='+quietId)).json();assert.equal(quiet.logs.length,0);
 probe.send('discard',{requestId:randomUUID(),cardId:card.id,handVersion:probe.room.handVersion});
 // A rejected action must still obey cooldown. Send the actual discard after it.
 await wait(Math.max(0,probe.room.actionAt-Date.now())+30);
 if(probe.room.hand.some(c=>c.id===card.id))probe.send('discard',{requestId:randomUUID(),cardId:card.id,handVersion:probe.room.handVersion});
 await probe.until(()=>!probe.room.hand.some(c=>c.id===card.id));
 const quietSaved=clients.map(c=>({token:c.token,hand:c.room.hand}));for(const c of clients)c.ws.close();await wait(250);await mf.dispose();mf=make('0');url=new URL('/socket',await mf.ready);url.protocol='ws:';
 clients=await Promise.all(quietSaved.map(s=>new Client(url).hello('restored',s.token)));for(let i=0;i<clients.length;i++){await clients[i].until(()=>clients[i].room?.phase==='battle');assert.deepEqual(clients[i].room.hand,quietSaved[i].hand);}
 // A distinct synthetic account verifies destructive account deletion locally.
 // No production account or real user data is involved.
 const victim=await new Client(url).hello('Deletion fixture');clients.push(victim);
 victim.send('register',{username:'cloud_delete',password:'synthetic delete password'});await victim.until(()=>victim.messages.some(m=>m.type==='auth'));
 const deletionAuth=victim.messages.find(m=>m.type==='auth').authToken,deletedToken=victim.token;
 victim.send('deleteAccount',{authToken:deletionAuth,confirmation:'탈퇴',acknowledge:false});await victim.until(()=>victim.messages.some(m=>m.type==='accountDeletionResult'&&m.ok===false));
 victim.send('deleteAccount',{authToken:deletionAuth,confirmation:'탈퇴',acknowledge:true});await victim.until(()=>victim.messages.some(m=>m.type==='accountDeleted'));
 assert.equal((await(await mf.dispatchFetch('http://localhost/admin/accounts?name=cloud_delete',{headers:adminHeaders})).json()).accounts.length,0);
 for(const c of clients)c.ws.close();await wait(250);await mf.dispose();mf=make('0');url=new URL('/socket',await mf.ready);url.protocol='ws:';
 const deleted=await new Client(url).hello('Deleted check',deletedToken,deletionAuth);clients.push(deleted);assert.equal(deleted.messages.find(m=>m.type==='session').account,null);
 assert.equal((await(await mf.dispatchFetch('http://localhost/admin/accounts?name=cloud_delete',{headers:adminHeaders})).json()).accounts.length,0);
 console.log('PASS: authenticated account deletion persists across SQLite restart; deleted auth cannot restore the account.');
 console.log('PASS: production diagnostics disabled, human judgment/discard and restart recovery persist without new audit records.');
 console.log(`PASS: real Cloudflare runtime: 4 WebSockets, unique deck, ${naturalCorrect?'Correct':'invalid natural submission'} retention/dedupe, discard/dedupe, SQLite process restart recovery, unanimous draw, forfeit, rematch, rejected origin. No forced score/hand/winner.`);
}finally{for(const c of clients)c.ws.close();await mf.dispose();}

