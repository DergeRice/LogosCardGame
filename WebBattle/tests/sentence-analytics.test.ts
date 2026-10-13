import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {AuditStore} from '../cloudflare/audit-store.js';
import {observedSentence} from '../shared/sentence-analytics.js';
import {makeAudit} from '../server/audit.js';
import {Game} from '../server/game.js';
const cards=[{id:'unused',kind:'adjective'},{id:'s',kind:'pronoun',variant:'pronoun-x2'},{id:'v',kind:'verb'},{id:'o',kind:'mass',variant:'mass-plus2'}];
const event=(requestId:string,overrides:Record<string,unknown>={})=>makeAudit('submit_result','info',{playerId:'p',matchId:'m',requestId},{valid:true,accepted:true,patternType:3,usedStartIndex:1,usedLength:3,submittedCards:cards,...overrides});
function storage(){const db=new DatabaseSync(':memory:');return {db,sql:{exec(query:string,...bindings:any[]){const s=db.prepare(query);const rows=s.columns().length?s.all(...bindings):(s.run(...bindings),[]);return {toArray:()=>rows,one:()=>{assert.equal(rows.length,1);return rows[0]}}}}};}
test('administrator bootstrap is single-use; hashed browser sessions persist, expire and revoke',async()=>{
 const {db,sql}=storage(),store=new AuditStore(sql as any);
 const created=await (await store.access(new Request('https://local/admin/logs/access/bootstrap',{method:'POST'}))).json();
 const redeem=()=>store.access(new Request('https://local/admin/logs/access/redeem',{method:'POST',body:JSON.stringify({code:created.token})}));
 const [a,b]=await Promise.all([redeem(),redeem()]);assert.deepEqual([a.status,b.status].sort(),[200,401]);
 const session=await (a.status===200?a:b).json();assert.equal(store.authorized('Bearer '+session.token),true);assert.equal(store.authorized('Bearer '+created.token),false);assert.equal(store.authorized('Bearer wrong'),false);
 assert.equal(JSON.stringify(sql.exec('SELECT * FROM admin_access').toArray()).includes(session.token),false);
 const restored=new AuditStore(sql as any);assert.equal(restored.authorized('Bearer '+session.token),true);
 await restored.access(new Request('https://local/admin/logs/access/revoke',{method:'POST',headers:{Authorization:'Bearer '+session.token}}));assert.equal(restored.authorized('Bearer '+session.token),false);
 const expired=await (await restored.access(new Request('https://local/admin/logs/access/session',{method:'POST'}))).json();sql.exec('UPDATE admin_access SET expires=0');assert.equal(restored.authorized('Bearer '+expired.token),false);db.close();
});
test('POS normalization retains order and repetition, excludes unrecognized cards and merges effects',()=>{
 const a=observedSentence(event('a'))!;assert.equal(a.key,'PRP VB NNU');assert.deepEqual(a.cards.map(c=>c.id),['s','v','o']);
 const b=observedSentence(event('b',{submittedCards:cards.map(c=>({...c,variant:undefined}))}))!;assert.equal(a.key,b.key);
 assert.notEqual(observedSentence(event('c',{submittedCards:[cards[0],cards[1],cards[3],cards[2]]}))!.key,a.key);
 assert.equal(observedSentence(event('bad',{valid:false})),null);
 assert.equal(observedSentence(event('missing',{submittedCards:[]})),null);
});
test('SQLite cumulative statistics survive log deletion, dedupe requests and backfill old snapshots',async()=>{
 const {db,sql}=storage();const store=new AuditStore(sql as any);
 store.insert(event('a'));store.insert(event('b',{accepted:false,submittedCards:cards.map(c=>({...c,variant:undefined})),actorAI:true}));store.insert(event('a'));
 let stats=await (await store.handle(new Request('https://local/admin/logs/sentences'))).json();assert.equal(stats.total,2);assert.equal(stats.unique,1);assert.equal(stats.scoredTotal,1);assert.equal(stats.combinations[0].aiCount,1);
 const legacy=event('legacy',{submittedCards:undefined,selectedCards:[]});store.insert(makeAudit('judgment','info',{playerId:'p',matchId:'m',requestId:'legacy'},{selectedCards:cards}));
 // Simulate pre-migration rows (no aggregate yet), then recreate the store.
 sql.exec('INSERT INTO audit_logs(id,time,level,event,action,player,room,request_id,data) VALUES(?,?,?,?,?,?,?,?,?)',legacy.id,legacy.time,legacy.level,legacy.event,legacy.action,'p','r','legacy',JSON.stringify(legacy));
 sql.exec("DELETE FROM sentence_meta WHERE key='backfilled'");new AuditStore(sql as any);
 stats=await (await store.handle(new Request('https://local/admin/logs/sentences'))).json();assert.equal(stats.total,3);assert.equal(stats.unique,1);
 const logs=await (await store.handle(new Request('https://local/admin/logs?q=legacy'))).json();assert.equal(logs.logs.find((e:any)=>e.event==='submit_result').details.submittedCards.length,4);
 sql.exec('DELETE FROM audit_logs');new AuditStore(sql as any);stats=await (await store.handle(new Request('https://local/admin/logs/sentences'))).json();assert.equal(stats.total,3);assert.equal(stats.unique,1);db.close();
});
test('scored submission snapshot survives removal from hand and records only one result on duplicate',()=>{
 const game=new Game({minimumPlayers:2}),socket={readyState:1,bufferedAmount:0,send(){},terminate(){},close(){}};
 const p=game.hello(socket,null,'fixture');game.quick(p);const r=game.rooms.get(p.room!)!;game.reveal(r);game.begin(r);
 // Fixture hands test logging only; this is not normal gameplay validation.
 p.hand=[{id:'s',kind:'pronoun',variant:'pronoun-x2'},{id:'v',kind:'verb'},{id:'o',kind:'article',variant:'article-x2'},{id:'n',kind:'count'},{id:'to',kind:'to-infinitive',variant:'to-infinitive-x2'}];p.handVersion++;
 const msg={type:'submit',requestId:'scored',matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)};game.handle(p,msg);game.handle(p,msg);
 assert.equal(p.hand.length,0);const results=game.audits.filter(e=>e.event==='submit_result');assert.equal(results.length,1);assert.equal((results[0].details.submittedCards as any[]).length,5);assert.equal(observedSentence(results[0])!.key,'PRP VB DT_THE NNC TO_VB');
});
