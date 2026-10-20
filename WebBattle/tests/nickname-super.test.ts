import {test} from 'node:test';import assert from 'node:assert/strict';import {Game,type GameSocket} from '../server/game.js';import {snapshot,restore} from '../server/persistence.js';import {grantSuperAccount,findAccounts} from '../server/superAccount.js';import {COSMETICS,BOXES} from '../shared/store.js';import {HOME_CHARACTERS} from '../shared/homeCharacters.js';import {BASIC_PROFILES} from '../shared/profiles.js';
const peer=(g:Game,name:string)=>{const messages:any[]=[],socket:GameSocket={readyState:1,bufferedAmount:0,send(raw){messages.push(JSON.parse(raw))},close(){},terminate(){}};return {p:g.hello(socket,null,name),socket,messages}};
test('named characters change labels across characters, profiles and emotes without changing IDs or paths',()=>{
 for(const [id,name]of [['rabbit','아리'],['dog','프로나운'],['spotted','버프'],['hamster','두두']]){assert.equal(HOME_CHARACTERS.find(c=>c.id==='character-'+id)?.name,name);assert.ok(BASIC_PROFILES.some(c=>c.name===name+' 얼굴'));}
 assert.equal(COSMETICS.find(c=>c.id==='emote-토끼 인사')?.name,'아리 인사');assert.ok(COSMETICS.find(c=>c.id==='emote-토끼 인사')?.image.includes(encodeURIComponent('토끼')));
 assert.ok(!COSMETICS.some(c=>/토끼|강아지|점박이|햄스터/.test(c.name)));
});
test('nickname costs exactly 1500 once, keeps login ID/identity/inventory and survives login and restore',()=>{
 const g=new Game(),a=peer(g,'Original');g.authenticate(a.p,{type:'register',username:'loginid',password:'long-test-password'});a.p.coins=3000;const r=g.community.record(a.p),id=r.id,owned=[...r.store.owned],token=a.messages.find(m=>m.type==='auth').authToken;
 const req={type:'renameNickname',requestId:'rename-1',name:'새 이름',previousName:a.p.name,storeVersion:r.store.revision??0,confirm:true,price:0};g.handle(a.p,req);g.handle(a.p,req);assert.equal(a.p.coins,1500);assert.equal(a.p.name,'새 이름');assert.equal(r.id,id);assert.deepEqual(r.store.owned,owned);assert.equal(g.accounts.get('loginid')?.username,'loginid');assert.equal(g.accounts.get('loginid')?.nickname,'새 이름');assert.equal(g.accounts.get('loginid')?.coins,1500);
 const next=new Game();restore(next,snapshot(g));const b=peer(next,'Other');next.authenticate(b.p,{type:'login',username:'loginid',password:'long-test-password'});assert.equal(b.p.name,'새 이름');assert.equal(b.p.accountId,id);assert.equal(b.p.coins,1500);assert.equal(next.community.record(b.p).nicknameChanges?.length,1);
 const c=peer(next,'Auth');const session=next.hello(c.socket,null,null,token);assert.equal(session.name,'새 이름');assert.equal(session.accountId,id);
});
test('invalid, duplicate, stale, unconfirmed, insufficient and in-game nickname requests never charge',()=>{
 const g=new Game(),a=peer(g,'User'),b=peer(g,'Taken');a.p.coins=1499;const r=g.community.record(a.p),base={type:'renameNickname',requestId:'r',previousName:'User',storeVersion:0,confirm:true};
 for(const change of [{name:'New'},{name:'Taken'},{name:'user'},{name:'<script>'},{name:'a'.repeat(17)},{name:'New',confirm:false},{name:'New',storeVersion:1},{name:'New',previousName:'stale'},{name:'New',superUser:true,price:0}]){g.handle(a.p,{...base,...change});assert.equal(a.p.coins,1499);assert.equal(a.p.name,'User');assert.equal(a.messages.at(-1).ok,false);}
 a.p.coins=1500;g.createRoom(a.p);g.handle(a.p,{...base,name:'Ingame'});assert.equal(a.p.coins,1500);assert.equal(a.p.name,'User');assert.equal(b.p.name,'Taken');assert.equal(r.nicknameChanges,undefined);
});
test('guest nickname persists, updates peers and ranking, and keeps profile and identity',()=>{
 const g=new Game(),a=peer(g,'Guest'),r=g.community.record(a.p),profile=r.store.profile;r.rankGames=3;a.p.coins=1500;g.handle(a.p,{type:'renameNickname',name:'바뀐 게스트',previousName:'Guest',storeVersion:0,confirm:true,requestId:'guest'});assert.equal(g.community.peer(a.p.id)?.name,'바뀐 게스트');assert.equal(r.store.profile,profile);g.community.ranking(a.p,1);assert.equal(a.messages.at(-1).players[0].name,'바뀐 게스트');const next=new Game();restore(next,snapshot(g));assert.equal(next.hello(a.socket,a.p.token,null).name,'바뀐 게스트');
});
test('super grant binds to existing ID, unlocks all, preserves balances and has no name-based escalation',()=>{
 const g=new Game(),owner=peer(g,'dergerice dev'),r=g.community.record(owner.p);owner.p.coins=10;r.store.diamonds=0;r.store.dust=0;
 const target=findAccounts(g,'DERGERICE DEV');assert.equal(target.length,1);assert.throws(()=>grantSuperAccount(g,'dergerice dev','forged'));const result=grantSuperAccount(g,'dergerice dev',r.id);assert.equal(result.superUser,true);assert.ok(COSMETICS.every(c=>r.store.owned.includes(c.id)));assert.equal(owner.p.coins,10);assert.equal(grantSuperAccount(g,'dergerice dev',r.id).duplicate,true);
 for(const box of BOXES){g.handle(owner.p,{type:'storeOpen',box:box.id,count:1,storeVersion:r.store.revision??0,requestId:'free-'+box.id});assert.equal(owner.p.coins,10);assert.equal(r.store.diamonds,0);}
 g.handle(owner.p,{type:'renameNickname',name:'Owner renamed',previousName:owner.p.name,storeVersion:r.store.revision??0,confirm:true,requestId:'free-name'});assert.equal(owner.p.coins,10);assert.equal(owner.p.name,'Owner renamed');assert.equal(g.community.view(owner.p).superUser,true);
 const impostor=peer(g,'dergerice dev');assert.equal(g.community.view(impostor.p).superUser,undefined);assert.throws(()=>g.handle(impostor.p,{type:'storeOpen',box:'silver',count:1,storeVersion:0,requestId:'forged',superUser:true,free:true}),/재화가 부족/);
 const next=new Game();restore(next,snapshot(g));assert.equal(next.community.records.get(r.id)?.superUser,true);assert.equal(next.community.records.get(impostor.p.id)?.superUser,undefined);
});
