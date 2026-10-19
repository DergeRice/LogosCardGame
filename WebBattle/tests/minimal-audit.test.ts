import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import type {SqlStorage} from '@cloudflare/workers-types';
import {AuditStore} from '../cloudflare/audit-store.js';
import {makeAudit} from '../server/audit.js';

test('cloud audit drops routine and AI traffic, throttles errors, and preserves its daily cap across restarts',async()=>{
 const db=new DatabaseSync(':memory:');
 const sql={exec(query:string,...args:any[]){const stmt=db.prepare(query);const rows=stmt.columns().length?stmt.all(...args):(stmt.run(...args),[]);return {toArray:()=>rows,one:()=>{assert.equal(rows.length,1);return rows[0];},[Symbol.iterator]:()=>rows[Symbol.iterator]()};}} as unknown as SqlStorage;
 try{
  let audit=new AuditStore(sql);
  const event=(name:string,ai=false)=>makeAudit(name,'info',{playerId:'human'},{actorAI:ai,valid:false});
  for(let i=0;i<2000;i++){audit.insert(event('request'));audit.insert(event('client'));audit.insert(event('submit_result',true));}
  const count=()=>Number(db.prepare('SELECT COUNT(*) AS n FROM audit_logs').get()!.n);
  assert.equal(count(),0);
  const failure=makeAudit('client','error',{playerId:'human'},{code:'CLIENT_ERROR'});
  audit.insert(failure);audit.insert({...failure,id:'duplicate'});assert.equal(count(),1);
  for(let i=0;i<1100;i++)audit.insert(event('submit_result'));
  assert.equal(count(),1000);
  audit=new AuditStore(sql);audit.insert(event('submit_result'));assert.equal(count(),1000);
  assert.equal(Number(db.prepare('SELECT COUNT(*) AS n FROM sentence_combos').get()!.n),0);
  db.exec("CREATE TABLE records(key TEXT PRIMARY KEY,value TEXT); INSERT INTO records VALUES('account:sample','{}')");
  const changes=()=>Number(db.prepare('SELECT total_changes() AS n').get()!.n);
  const before=changes();
  const response=await audit.handle(new Request('https://example.test/admin/logs?limit=1'));
  assert.equal(response.status,200);assert.equal(changes(),before);
  assert.deepEqual((await response.json()).inventory,[{kind:'account',count:1}]);
 }finally{db.close();}
});
