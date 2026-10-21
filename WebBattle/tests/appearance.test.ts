import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';
import {restore,snapshot} from '../server/persistence.js';
import {COSMETICS,dummyRanking,EXCHANGE_CATEGORIES} from '../shared/store.js';
const peer=(g:Game)=>{const messages:any[]=[],socket:GameSocket={readyState:1,bufferedAmount:0,send(raw){messages.push(JSON.parse(raw))},close(){},terminate(){}};return{p:g.hello(socket,null,'Appearance'),messages};};

test('some demo ranks and AI wear stable real frames without granting human items or AI accounts',()=>{
 for(let tier=0;tier<8;tier++){
  const rows=dummyRanking(tier),framed=rows.filter(p=>p.frameId);
  assert.equal(framed.length,8);assert.deepEqual(rows,dummyRanking(tier));
  assert.ok(framed.every(p=>COSMETICS.some(c=>c.type==='frame'&&c.id===p.frameId)));
  assert.equal(new Set(rows.map(p=>p.profileId)).size,12);
  assert.ok(rows.every(p=>COSMETICS.some(c=>c.type==='profile'&&c.id===p.profileId)));
  assert.ok(rows.some(p=>p.profileId.startsWith('profile-accessory-')));
 }
 const g=new Game(),a=peer(g),store=structuredClone(g.community.record(a.p).store);
 g.createRoom(a.p);for(let i=0;i<3;i++)g.addRoomAI(a.p);
 const room=g.rooms.get(a.p.room!)!,bots=g.view(room,a.p).players.filter(p=>p.ai);
 assert.deepEqual(bots.map(p=>p.frameId),['frame-style-15','frame-style-30',undefined]);
 assert.deepEqual(g.community.record(a.p).store,store);assert.equal(g.community.records.size,1);
 const fresh=new Game();restore(fresh,snapshot(g));const saved=fresh.sessions.get(a.p.token)!;
 assert.deepEqual(fresh.view(fresh.rooms.get(saved.room!)!,saved).players.filter(p=>p.ai).map(p=>p.frameId),bots.map(p=>p.frameId));
});

test('home background and game board equip independently; character/frame reach peers, ranks, lobby and restore',()=>{
 const g=new Game(),a=peer(g),b=peer(g),r=g.community.record(a.p);
 r.store.owned.push('character-hans','background-해바라기 들판의 시골길','board-우주선','frame-style-15'); // Inventory fixture only.
 const equip=(id:string)=>g.handle(a.p,{type:'storeEquip',id});
 equip('character-hans');assert.equal(r.store.character,'character-hans');assert.equal(r.store.background,'background-garden');assert.equal(r.store.board,'board-classic');
 equip('background-해바라기 들판의 시골길');equip('board-우주선');equip('frame-style-15');assert.equal(r.store.background,'background-해바라기 들판의 시골길');assert.equal(r.store.board,'board-우주선');
 equip('board-forged');assert.equal(r.store.board,'board-우주선');assert.equal(a.messages.at(-1).type,'error');
 assert.deepEqual(g.community.peer(a.p.id),{id:a.p.id,name:a.p.name,avatar:a.p.avatar,profileId:r.store.profile,characterId:'character-hans',frameId:'frame-style-15',online:true});
 r.rankGames=3;g.community.ranking(b.p,1);const ranked=b.messages.at(-1).players.find((p:any)=>p.id===a.p.id);assert.equal(ranked.characterId,'character-hans');assert.equal(ranked.frameId,'frame-style-15');
 g.createRoom(a.p);g.joinRoom(b.p,a.p.room!);const room=g.rooms.get(a.p.room!)!,publicPlayer=g.view(room,b.p).players.find(p=>p.id===a.p.id)!;
 assert.equal(publicPlayer.characterId,'character-hans');assert.equal(publicPlayer.frameId,'frame-style-15');
 const fresh=new Game();restore(fresh,snapshot(g));const saved=fresh.sessions.get(a.p.token)!;const store=fresh.community.record(saved).store;
 assert.deepEqual([store.character,store.background,store.board,store.frame],['character-hans','background-해바라기 들판의 시골길','board-우주선','frame-style-15']);
 assert.equal(fresh.view(fresh.rooms.get(saved.room!)!,saved).players.find(p=>p.id===saved.id)!.characterId,'character-hans');
 assert.ok(EXCHANGE_CATEGORIES.some(([id,label])=>id==='background'&&label==='홈 배경'));
});
