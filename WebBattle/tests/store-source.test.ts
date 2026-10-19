import {test} from 'node:test';import assert from 'node:assert/strict';import {Game,type GameSocket} from '../server/game.js';import {snapshot,restore} from '../server/persistence.js';
import {COSMETICS} from '../shared/store.js';

test('new frame can be redeemed, equipped, shared with opponents and restored without extra payment',()=>{
 const g=new Game({minimumPlayers:2}),messages:any[]=[],socket:GameSocket={readyState:1,bufferedAmount:0,send(raw){messages.push(JSON.parse(raw))},close(){},terminate(){}};
 const p=g.hello(socket,null,'Frame owner'),other=g.hello(socket,null,'Opponent');
 const item=COSMETICS.find(c=>c.id==='frame-style-15');assert.ok(item);assert.equal(item.type,'frame');
 const record=g.community.record(p);record.store.dust=100;
 const request={type:'storeRedeem',id:item.id,requestId:'frame-once',storeVersion:0};g.handle(p,request);g.handle(p,request);
 assert.equal(record.store.dust,0);assert.equal(record.store.owned.filter(id=>id===item.id).length,1);
 g.handle(p,{type:'storeEquip',id:item.id});assert.equal(record.store.frame,item.id);
 g.quick(p);g.quick(other);const room=g.rooms.get(p.room!)!;
 assert.equal(g.view(room,other).players.find(x=>x.id===p.id)?.frameId,item.id);
 const fresh=new Game({minimumPlayers:2});restore(fresh,snapshot(g));const saved=fresh.sessions.get(p.token)!;
 assert.equal(fresh.community.record(saved).store.frame,item.id);assert.equal(fresh.community.record(saved).store.dust,0);
 assert.equal(fresh.view(fresh.rooms.get(saved.room!)!,saved).players.find(x=>x.id===p.id)?.frameId,item.id);
});
test('server distinguishes box and direct rewards, ignores forged source and preserves source on duplicate/persistence',()=>{
 const g=new Game(),messages:any[]=[],socket:GameSocket={readyState:1,bufferedAmount:0,send(raw){messages.push(JSON.parse(raw))},close(){},terminate(){}};const p=g.hello(socket,null,'Loot fixture');p.coins=10000;const r=g.community.record(p);r.store.dust=100;
 const box={type:'storeOpen',box:'silver',count:1,requestId:'box-once',storeVersion:0,source:'redeem'};g.handle(p,box);let result=messages.filter(m=>m.type==='storeResult').at(-1);assert.equal(result.source,'box');assert.equal(result.box,'silver');assert.equal(result.rewards.length,1);assert.equal(p.coins,9000);g.handle(p,{...box,box:'diamond',count:100});assert.equal(p.coins,9000);assert.equal(messages.filter(m=>m.type==='storeResult').at(-1).box,'silver');
 const dustBeforeRedeem=r.store.dust;g.handle(p,{type:'storeRedeem',id:'emote-love',requestId:'direct-once',storeVersion:1,source:'box',box:'diamond'});result=messages.filter(m=>m.type==='storeResult').at(-1);assert.equal(result.source,'redeem');assert.equal(result.box,undefined);assert.equal(result.rewards[0].itemId,'emote-love');assert.equal(r.store.dust,dustBeforeRedeem-100);const fresh=new Game();restore(fresh,snapshot(g));const stored=fresh.community.records.get(p.id)!.results;assert.equal(stored[0].source,'box');assert.equal(stored[1].source,'redeem');assert.equal(stored[0].box,'silver');
});
