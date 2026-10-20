import {test} from 'node:test';import assert from 'node:assert/strict';
import {COSMETICS,defaultHubSave,migrateProfiles,openDemoBox,LOOT_WEIGHTS,BOX_WEIGHTS} from '../shared/store.js';import {homeCharacterLayout} from '../src/homeCharacterLayout.js';
test('retired table character and garden board disappear and equipped legacy saves migrate without wallet changes',()=>{
 const save=defaultHubSave();save.owned.push('character-table','board-garden');save.character='character-table';save.board='board-garden';const before=[save.gold,save.dust,save.diamonds];migrateProfiles(save);
 for(const id of ['character-table','board-garden']){assert.ok(!COSMETICS.some(c=>c.id===id));assert.ok(!save.owned.includes(id));}assert.equal(save.character,'character-naro');assert.equal(save.board,'board-classic');assert.deepEqual([save.gold,save.dust,save.diamonds],before);
 for(const type of ['character','board']as const){const pool=COSMETICS.filter(c=>c.type===type),category=LOOT_WEIGHTS.findIndex(c=>c.type===type);for(let i=0;i<pool.length;i++){let n=0;const roll=(BOX_WEIGHTS.silver.slice(0,category).reduce((a,b)=>a+b,0)+.1)/100;const item=openDemoBox(defaultHubSave(),'silver',1,()=>n++===0?roll:(i+.5)/pool.length).rewards[0];assert.ok(item.itemId!=='character-table'&&item.itemId!=='board-garden');}}
});
test('portrait mascot moves substantially lower with one floor across narrow and tall artwork',()=>{
 for(const [width,height]of [[512,512],[1536,1024]]){const p=homeCharacterLayout(336,436,width,height,true,false),old=homeCharacterLayout(336,436,width,height,false,false);assert.ok(p.y-old.y>50);assert.equal(p.y+p.height/2,476);assert.equal(p.head,p.y-p.height/2);assert.equal(p.scale,old.scale);}
});
