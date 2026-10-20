import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT,exportJWK,createLocalJWKSet} from 'jose';
import {GoogleChallenges,verifyGoogleCredential} from '../server/googleAuth.js';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';
function socket(){const messages:any[]=[];const peer:GameSocket={readyState:1,bufferedAmount:0,send(raw){messages.push(JSON.parse(raw))},close(){},terminate(){}};return {peer,last:(type:string)=>messages.filter(m=>m.type===type).at(-1)};}
test('Google JWT requires signature, issuer, audience, expiry and the server nonce',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk=await exportJWK(publicKey);jwk.kid='test';
 const keys=createLocalJWKSet({keys:[jwk]}),client='test.apps.googleusercontent.com',nonce='server-nonce';
 const token=async(claims:Record<string,unknown>={})=>new SignJWT({nonce,name:'검증 사용자',iss:'https://accounts.google.com',aud:client,sub:'stable-subject',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,...claims}).setProtectedHeader({alg:'RS256',kid:'test'}).sign(privateKey);
 assert.equal((await verifyGoogleCredential(client,await token(),nonce,keys)).sub,'stable-subject');
 for(const credential of [await token({nonce:'attacker'}),await token({aud:'other'}),await token({iss:'https://attacker.example'}),await token({exp:1})])await assert.rejects(verifyGoogleCredential(client,credential,nonce,keys));
 const other=await generateKeyPair('RS256');const forged=await new SignJWT({nonce}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer('https://accounts.google.com').setAudience(client).setSubject('forged').setIssuedAt().setExpirationTime('5m').sign(other.privateKey);
 await assert.rejects(verifyGoogleCredential(client,forged,nonce,keys));
});
test('Google challenges are single use and bound to the session',()=>{
 const challenges=new GoogleChallenges(),nonce=challenges.issue('alice');
 assert.throws(()=>challenges.take('bob'));assert.equal(challenges.take('alice'),nonce);assert.throws(()=>challenges.take('alice'));
 const before=challenges.issue('alice'),after=challenges.issue('alice');assert.notEqual(before,after);assert.equal(challenges.take('alice'),after);
});
test('Google guest linking retains inventory and persistent account restoration',()=>{
 const game=new Game(),s=socket(),p=game.hello(s.peer,undefined,'게스트');p.coins=123;p.rating=1200;
 const record=game.community.record(p);record.store.owned.push('frame-style-60');record.store.frame='frame-style-60';record.store.dust=77;
 game.loginGoogle(p,{sub:'stable-sub',name:'구글 사용자'});const id=p.accountId!,token=s.last('auth').authToken;
 assert.equal(game.community.record(p).store.dust,77);assert.equal(game.community.record(p).store.frame,'frame-style-60');
 const restored=new Game();restore(restored,snapshot(game));restored.sessions.clear();
 const next=socket(),q=restored.hello(next.peer,undefined,'새 기기',token);assert.equal(q.accountId,id);assert.equal(q.coins,123);assert.equal(next.last('session').account.provider,'google');
 const third=socket(),r=restored.hello(third.peer,undefined,'다른 게스트');r.coins=999;
 restored.loginGoogle(r,{sub:'stable-sub',name:'바뀐 이름'});assert.equal(r.accountId,id);assert.equal(r.coins,123);assert.equal(r.name,'구글 사용자');assert.equal(restored.community.record(r).store.frame,'frame-style-60');
});
test('Google can link an existing password account but cannot merge two accounts or relink identities',()=>{
 const game=new Game(),s=socket(),p=game.hello(s.peer,undefined,'게스트');game.authenticate(p,{type:'register',username:'existing',password:'a secure password'});const id=p.accountId;
 game.loginGoogle(p,{sub:'linked'});assert.equal(p.accountId,id);assert.equal(game.accounts.size,1);
 game.loginGoogle(p,{sub:'different'});assert.match(s.last('error').message,/다른 Google/);
 const t=socket(),q=game.hello(t.peer,undefined,'게스트2');game.authenticate(q,{type:'register',username:'second',password:'another secure password'});
 game.loginGoogle(q,{sub:'linked'});assert.match(t.last('error').message,/다른 게임 계정/);
});
