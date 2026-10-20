import {test} from 'node:test';import assert from 'node:assert/strict';
import {HOME_CHARACTERS} from '../shared/homeCharacters.js';import {COSMETICS,defaultHubSave,dustPrice,openDemoBox} from '../shared/store.js';
import {GAME_ASSET_URLS} from '../src/preloadGameAssets.js';import {Game,type GameSocket} from '../server/game.js';import {snapshot,restore} from '../server/persistence.js';
test('nine emote characters use first artwork and ten preloaded poses; character draws preserve category odds',()=>{
 assert.equal(HOME_CHARACTERS.length,9);assert.equal(new Set(COSMETICS.map(c=>c.id)).size,COSMETICS.length);
 const pool=COSMETICS.filter(c=>c.type==='character');
 for(const c of HOME_CHARACTERS){assert.equal(c.poses.length,10);assert.equal(new Set(c.poses.map(p=>p.id)).size,10);assert.equal(c.image,c.poses[0].image);assert.equal(defaultHubSave().owned.includes(c.id),false);assert.equal(dustPrice(c.type),850);assert.ok(c.poses.every(p=>GAME_ASSET_URLS.includes(p.image)));
  let n=0;const result=openDemoBox({...defaultHubSave(),owned:[]},'silver',1,()=>n++===0?.6:(pool.findIndex(p=>p.id===c.id)+.5)/pool.length);assert.equal(result.rewards[0].itemId,c.id);
 }
});
test('character redemption and equip persist without granting its expression collectibles',()=>{
 const messages:any[]=[],s:GameSocket={readyState:1,bufferedAmount:0,send(raw){messages.push(JSON.parse(raw))},close(){},terminate(){}},g=new Game(),p=g.hello(s,null,'Character buyer'),r=g.community.record(p),item=HOME_CHARACTERS.find(c=>c.id==='character-horse')!;
 g.handle(p,{type:'storeEquip',id:item.id});assert.equal(r.store.character,'character-naro');
 r.store.dust=850;const slots=structuredClone(r.store.emotes);
 g.handle(p,{type:'storeRedeem',id:item.id,requestId:'horse',storeVersion:0});assert.equal(r.store.dust,0);assert.ok(r.store.owned.includes(item.id));assert.ok(item.poses.every(p=>!r.store.owned.includes(p.id)));
 g.handle(p,{type:'storeEquip',id:item.id});assert.equal(r.store.character,item.id);assert.deepEqual(r.store.emotes,slots);assert.equal(g.community.peer(p.id)?.characterId,item.id);
 const next=new Game();restore(next,snapshot(g));assert.equal(next.community.records.get(p.id)?.store.character,item.id);
});

test('white and brown horse poses belong to one collectible character',()=>{
 const horses=HOME_CHARACTERS.filter(c=>c.id.includes('horse'));assert.equal(horses.length,1);
 assert.deepEqual(horses[0].poses.map(p=>p.name),['트랜스 미소','트랜스 사랑','트랜스 인사','트랜스 고민','트랜스 부끄러움','트랜스 신남','트랜스 놀람','트랜스 화남','트랜스 눈물','트랜스 하품']);
 assert.equal(COSMETICS.filter(c=>c.type==='character'&&c.id.includes('horse')).length,1);
});
