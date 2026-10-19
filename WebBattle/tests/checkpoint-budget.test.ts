import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore,ACTIVITY_CHECKPOINT_MS} from '../server/persistence.js';
const socket=():GameSocket=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}});
const changes=(before:Map<string,string>,after:Map<string,string>)=>[...after].filter(([key,value])=>before.get(key)!==value).length+[...before.keys()].filter(key=>!after.has(key)).length;
function legacy(game:Game){const m=snapshot(game);for(const r of game.rooms.values()){m.set('room:'+r.code,JSON.stringify({...r,players:r.players.map(p=>p.id)}));for(const p of r.players){const {socket,seen,...rest}=p;m.set('player:'+p.id,JSON.stringify({...rest,seen:[...seen]}));}}return m;}
test('runtime-only AI/emoji/notifications do not dirty durable checkpoints, but gameplay and money do',t=>{
 let now=1_800_000;t.mock.method(Date,'now',()=>now);const g=new Game(),p=g.hello(socket(),null,'Human');g.quick(p);const r=g.rooms.get(p.room!)!;g.reveal(r);g.deal(r,5);g.begin(r);const ai=r.players.find(x=>x.ai)!;
 const baseline=snapshot(g);now+=1000;ai.nextAI+=1000;ai.reaction={id:'react',emoji:'👍',at:now};ai.reactionAt=now;ai.lastAction={id:'visual',text:'hello'};r.log.push({id:'log',text:'visual only'});p.touchedAt=now-1;const checkpoint=snapshot(g);assert.equal(changes(baseline,checkpoint),1); // crossed one 15-minute activity bucket
 p.touchedAt=now;const stable=snapshot(g);now+=1000;p.touchedAt=now;ai.nextAI+=2000;assert.equal(changes(stable,snapshot(g)),0);
 const saved=JSON.parse(stable.get('player:'+ai.id)!);for(const field of ['nextAI','reaction','reactionAt','lastAction'])assert.equal(field in saved,false);assert.equal('log' in JSON.parse(stable.get('room:'+r.code)!),false);
 const next=new Game();restore(next,stable);const recovered=next.rooms.get(r.code)!;assert.deepEqual(recovered.deck,r.deck);assert.deepEqual(recovered.players.map(x=>x.hand),r.players.map(x=>x.hand));assert.ok(recovered.players.find(x=>x.ai)!.nextAI>now);assert.deepEqual(snapshot(next),stable);
 p.coins+=100;assert.ok(changes(stable,snapshot(g))>0);const newSave=snapshot(g);r.deck.pop();assert.ok(changes(newSave,snapshot(g))>0);assert.ok(JSON.parse(stable.get('player:'+p.id)!).touchedAt-p.touchedAt<=ACTIVITY_CHECKPOINT_MS);
});
test('two minutes of a real four-player AI wait loop needs far fewer game record writes',t=>{
 let now=1_800_001;t.mock.method(Date,'now',()=>now);const g=new Game(),p=g.hello(socket(),null,'Human');g.quick(p);const r=g.rooms.get(p.room!)!;g.reveal(r);g.deal(r,5);g.begin(r);
 r.deck=Array.from({length:60},(_,i)=>({id:'adj-'+i,kind:'adjective' as const}));r.players.forEach(x=>{x.hand=[];x.judgment=undefined});
 let previous=snapshot(g),old=legacy(g),writes=0,oldWrites=0;
 for(let i=0;i<1200;i++){now+=100;g.tick();const current=snapshot(g),oldCurrent=legacy(g);writes+=changes(previous,current);oldWrites+=changes(old,oldCurrent);previous=current;old=oldCurrent;}
 assert.equal(r.phase,'battle');assert.ok(r.players.every(x=>x.score===0));assert.ok(writes<oldWrites*.6,JSON.stringify({writes,oldWrites}));console.log('CHECKPOINT_BENCHMARK',JSON.stringify({durationSeconds:120,players:4,ai:3,recordWritesBefore:oldWrites,recordWritesAfter:writes,reductionPercent:Math.round((1-writes/oldWrites)*100),excludesAlarmAndAuditWrites:true}));
 const next=new Game();restore(next,snapshot(g));assert.deepEqual(next.rooms.get(r.code)!.players.map(x=>x.hand),r.players.map(x=>x.hand));assert.deepEqual(next.rooms.get(r.code)!.deck,r.deck);
});

