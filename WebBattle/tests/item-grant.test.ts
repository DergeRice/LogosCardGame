import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';import {snapshot,restore} from '../server/persistence.js';
const socket=():GameSocket=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}});
test('item grants validate exact target and whole batch, persist once, preserve wallet and equipment',()=>{
 const g=new Game(),p=g.hello(socket(),null,'부지런한 아기땃쥐'),other=g.hello(socket(),null,'다른 유저'),r=g.community.record(p),before=structuredClone(r.store);
 const ids=['frame-style-15','frame-style-60','emote-love','emote-mistake','board-은하수'];
 assert.throws(()=>g.community.grantItems(p.name,[...ids,'missing'],'invalid'));assert.deepEqual(r.store,before);
 const result=g.community.grantItems(p.name,ids,'grant');assert.deepEqual(result.added,ids);assert.ok(ids.every(id=>r.store.owned.includes(id)));
 assert.equal(r.store.frame,before.frame);assert.equal(r.store.board,before.board);assert.deepEqual(r.store.emotes,before.emotes);assert.equal(p.coins,0);assert.equal(r.store.dust,0);assert.equal(r.store.diamonds,0);
 assert.equal(g.community.grantItems(p.name,ids,'grant').duplicate,true);assert.equal(r.store.revision,1);assert.ok(ids.every(id=>!g.community.record(other).store.owned.includes(id)));
 const fresh=new Game();restore(fresh,snapshot(g));assert.ok(ids.every(id=>fresh.community.records.get(p.id)?.store.owned.includes(id)));
 g.hello(socket(),null,p.name);assert.throws(()=>g.community.grantItems(p.name,ids,'ambiguous'));
 assert.deepEqual(g.community.grantItems(p.name,ids,'explicit',p.id).added,[]);
});
