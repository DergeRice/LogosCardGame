import {test} from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import {BASIC_PROFILES,COLLECTIBLE_PROFILES} from '../shared/profiles.js';
import {COSMETICS,defaultHubSave,migrateProfiles,openDemoBox,BOX_WEIGHTS,LOOT_WEIGHTS,dummyRanking} from '../shared/store.js';
import {GAME_ASSET_URLS} from '../src/preloadGameAssets.js';import {Game,type GameSocket} from '../server/game.js';import {snapshot,restore} from '../server/persistence.js';
const socket=():GameSocket=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}});
test('74 independent profile artworks: five free and 69 collectible, all decoded and preloaded',async()=>{
 assert.equal(COSMETICS.filter(c=>c.type==='profile').length,74);assert.equal(BASIC_PROFILES.length,5);assert.equal(COLLECTIBLE_PROFILES.length,69);
 for(const item of [...BASIC_PROFILES,...COLLECTIBLE_PROFILES]){const image=await sharp('public'+item.image).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(image.info.width,512);assert.equal(image.info.height,512);assert.equal(image.data[3],0);assert.ok(GAME_ASSET_URLS.includes(item.image));assert.equal(defaultHubSave().owned.includes(item.id),BASIC_PROFILES.some(p=>p.id===item.id));}
});
test('every box draws all paid profiles and never the five free profiles',()=>{
 const index=LOOT_WEIGHTS.findIndex(c=>c.type==='profile');
 for(const box of ['silver','gold','diamond'] as const){const roll=(BOX_WEIGHTS[box].slice(0,index).reduce((a,b)=>a+b,0)+.1)/100;
  for(let i=0;i<COLLECTIBLE_PROFILES.length;i++){let n=0;const opened=openDemoBox(defaultHubSave(),box,1,()=>n++===0?roll:(i+.5)/COLLECTIBLE_PROFILES.length);assert.equal(opened.rewards[0].itemId,COLLECTIBLE_PROFILES[i].id);assert.equal(opened.rewards[0].duplicate,false);let m=0;const duplicate=openDemoBox(opened.next,box,1,()=>m++===0?roll:(i+.5)/COLLECTIBLE_PROFILES.length);assert.equal(duplicate.rewards[0].dust,25);}
 }
});
test('new guest/account profile is random, owned and stable after reconnect and server restore',()=>{
 const g=new Game(),seen=new Set<string>();for(let i=0;i<100;i++){const p=g.hello(socket(),null,'Profile guest '+i),r=g.community.record(p);assert.ok(BASIC_PROFILES.some(b=>b.id===r.store.profile));seen.add(r.store.profile!);const again=g.hello(socket(),p.token,p.name);assert.equal(g.community.record(again).store.profile,r.store.profile);}assert.equal(seen.size,5);
 const p=g.hello(socket(),null,'Account'),before=g.community.record(p).store.profile;g.authenticate(p,{type:'register',username:'profileaccount',password:'strong-profile-pass'});assert.ok(p.accountId);assert.equal(g.community.record(p).store.profile,before);
 const next=new Game();restore(next,snapshot(g));assert.equal(next.community.records.get(p.accountId!)?.store.profile,before);
});
test('legacy saves gain five free profiles once without changing character, balances or paid inventory',()=>{
 const s=defaultHubSave();delete s.profile;delete s.profileCatalogVersion;s.owned=s.owned.filter(id=>!id.startsWith('profile-'));s.owned.push(COLLECTIBLE_PROFILES[3].id);s.character='character-king';s.gold=123;s.dust=456;
 migrateProfiles(s,'legacy-account');const first=structuredClone(s);migrateProfiles(s,'legacy-account');assert.deepEqual(s,first);assert.equal(s.character,'character-king');assert.equal(s.gold,123);assert.equal(s.dust,456);assert.ok(s.owned.includes(COLLECTIBLE_PROFILES[3].id));assert.equal(s.owned.filter(id=>BASIC_PROFILES.some(b=>b.id===id)).length,5);
});
test('profile ownership, independent equip, peer/ranking/match propagation and persistence',()=>{
 const messages:any[]=[],g=new Game(),p=g.hello({...socket(),send(raw){messages.push(JSON.parse(raw))}},null,'Portrait buyer'),r=g.community.record(p),item=COLLECTIBLE_PROFILES[0],character=r.store.character,original=r.store.profile;
 g.handle(p,{type:'storeEquip',id:item.id});assert.equal(r.store.profile,original);r.store.dust=300;g.handle(p,{type:'storeRedeem',id:item.id,requestId:'profile-buy',storeVersion:0});g.handle(p,{type:'storeEquip',id:item.id});assert.equal(r.store.dust,0);assert.equal(r.store.profile,item.id);assert.equal(r.store.character,character);assert.equal(g.community.peer(p.id)?.profileId,item.id);
 r.rankGames=3;g.community.ranking(p,1);assert.equal(messages.at(-1).players.find((x:any)=>x.id===p.id).profileId,item.id);
 g.createRoom(p);g.addRoomAI(p);const room=g.rooms.get(p.room!)!,view=g.view(room,p);assert.equal(view.players.find(x=>x.id===p.id)?.profileId,item.id);assert.ok(view.players.filter(x=>x.ai).every(x=>BASIC_PROFILES.some(b=>b.id===x.profileId)));
 const next=new Game();restore(next,snapshot(g));assert.equal(next.community.records.get(p.id)?.store.profile,item.id);assert.ok(dummyRanking(1).every(x=>BASIC_PROFILES.some(b=>b.id===x.profileId)));
});
