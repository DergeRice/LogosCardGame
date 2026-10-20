import {test} from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import {HOME_CHARACTERS} from '../shared/homeCharacters.js';import {COSMETICS,defaultHubSave,openDemoBox,LOOT_WEIGHTS,BOX_WEIGHTS} from '../shared/store.js';
test('Hans has ten transparent 512px collectible expressions in all box pools',async()=>{
 const hans=HOME_CHARACTERS.find(c=>c.id==='character-hans')!;assert.equal(hans.name,'한스 대왕');assert.equal(hans.poses[0].name,'한스 대왕 인사');
 const pool=COSMETICS.filter(c=>c.type==='emote'&&!('basic' in c&&c.basic)&&!('dustOnly' in c&&c.dustOnly)),index=LOOT_WEIGHTS.findIndex(c=>c.type==='emote');
 for(const p of hans.poses){const m=await sharp('public'+decodeURIComponent(p.image)).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(m.info.width,512);assert.equal(m.info.height,512);assert.equal(m.data[3],0);assert.ok(!defaultHubSave().owned.includes(p.id));for(const box of ['silver','gold','diamond']as const){let call=0;const roll=(BOX_WEIGHTS[box].slice(0,index).reduce((a,b)=>a+b,0)+.1)/100;const reward=openDemoBox(defaultHubSave(),box,1,()=>call++===0?roll:(pool.findIndex(c=>c.id===p.id)+.5)/pool.length).rewards[0];assert.equal(reward.itemId,p.id);}}
});
