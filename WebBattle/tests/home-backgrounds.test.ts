import {test} from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';import {COSMETICS,defaultHubSave,openDemoBox,BOX_WEIGHTS,LOOT_WEIGHTS,dustPrice,DUPLICATE_DUST,migrateProfiles} from '../shared/store.js';import {Game,type GameSocket} from '../server/game.js';import {snapshot,restore} from '../server/persistence.js';
const backgrounds=COSMETICS.filter(c=>c.type==='background'&&c.image.startsWith('/cosmetics/backgrounds/'));
test('forty home backgrounds retain original aspect ratios and require ownership',async()=>{
 assert.equal(backgrounds.length,40);assert.equal(COSMETICS.filter(c=>c.type==='background').length,41);assert.equal(new Set(backgrounds.map(b=>b.name)).size,40);assert.ok(backgrounds.every(b=>b.name.split(/\s+/).length<=2));
 for(const b of backgrounds){const m=await sharp('public'+decodeURIComponent(b.image)).metadata();assert.ok(m.width!>0&&m.height!>0);assert.ok(Math.max(m.width!,m.height!)<=1536);assert.ok(!defaultHubSave().owned.includes(b.id));}
});
test('all forty backgrounds participate in every box at existing category odds and cost 400 dust',()=>{
 assert.equal(dustPrice('background'),400);assert.equal(DUPLICATE_DUST.background,30);const index=LOOT_WEIGHTS.findIndex(c=>c.type==='background'),pool=COSMETICS.filter(c=>c.type==='background');
 for(const box of ['silver','gold','diamond'] as const){const roll=(BOX_WEIGHTS[box].slice(0,index).reduce((a,b)=>a+b,0)+.1)/100;for(const b of backgrounds){let call=0;const opened=openDemoBox(defaultHubSave(),box,1,()=>call++===0?roll:(pool.findIndex(c=>c.id===b.id)+.5)/pool.length);assert.equal(opened.rewards[0].itemId,b.id);assert.equal(opened.rewards[0].image,b.image);}}
});
test('server background ownership, 400-dust redemption, equip and restore keep battle board independent',()=>{
 for(const b of backgrounds){const socket:GameSocket={readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}},g=new Game(),p=g.hello(socket,null,'Background buyer'),r=g.community.record(p);g.handle(p,{type:'storeEquip',id:b.id});assert.equal(r.store.background,'background-garden');r.store.dust=400;const request={type:'storeRedeem',id:b.id,requestId:'background-buy',storeVersion:0};g.handle(p,request);g.handle(p,request);assert.equal(r.store.dust,0);assert.equal(r.store.owned.filter(id=>id===b.id).length,1);g.handle(p,{type:'storeEquip',id:b.id});assert.equal(r.store.background,b.id);assert.equal(r.store.board,'board-classic');const next=new Game();restore(next,snapshot(g));assert.equal(next.community.records.get(p.id)?.store.background,b.id);}
});

test('removed cosmetics leave inventories and equipped slots clean',()=>{
 const removed=['background-table','profile-accessory-04-09','profile-accessory-06-03'];
 assert.ok(removed.every(id=>!COSMETICS.some(item=>item.id===id)));
 const save=defaultHubSave();save.background='background-table';save.profile='profile-accessory-04-09';save.owned.push(...removed);
 migrateProfiles(save);
 assert.equal(save.background,'background-garden');assert.notEqual(save.profile,'profile-accessory-04-09');assert.ok(removed.every(id=>!save.owned.includes(id)));
});
