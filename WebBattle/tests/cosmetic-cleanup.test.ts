import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COSMETICS,defaultHubSave,migrateEmoteCatalog} from '../shared/store.js';

const retired=['frame-mint','frame-gold','frame-violet','emote-smile','emote-fire','emote-clap','emote-wow'];
test('retired placeholder cosmetics are absent; supplied artwork remains available',()=>{
 assert.ok(retired.every(id=>!COSMETICS.some(c=>c.id===id)));
 assert.equal(COSMETICS.filter(c=>c.type==='frame').length,60);
 assert.equal(COSMETICS.filter(c=>c.type==='emote').length,90);
 assert.ok(COSMETICS.filter(c=>c.type==='emote'||c.type==='frame').every(c=>c.image.startsWith('/')));
 assert.equal(defaultHubSave().frame,'');
});
test('legacy placeholder cleanup preserves balances, real inventory and equipped artwork',()=>{
 const save=defaultHubSave();save.owned.push(...retired,'frame-style-15','emote-love');
 save.frame='frame-gold';save.emote='emote-fire';save.emotes=['emote-fire','emote-love','emote-cheer',null];
 const balances=[save.gold,save.diamonds,save.dust];
 migrateEmoteCatalog(save);
 assert.deepEqual([save.gold,save.diamonds,save.dust],balances);
 assert.ok(retired.every(id=>!save.owned.includes(id)));
 assert.equal(save.frame,'');assert.equal(save.emote,'emote-hello');
 assert.deepEqual(save.emotes,[null,'emote-love','emote-cheer',null]);
 save.frame='frame-style-15';const once=JSON.stringify(save);migrateEmoteCatalog(save);
 assert.equal(JSON.stringify(save),once);
});
