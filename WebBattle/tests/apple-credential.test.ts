import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT,exportJWK,createLocalJWKSet} from 'jose';
import {verifyAppleCredential} from '../server/appleAuth.js';
import {appleAndroidCallback} from '../server/appleCallback.js';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';
test('Apple web and iOS tokens require their configured audience, nonce, signature and expiry',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk=await exportJWK(publicKey);jwk.kid='apple-test';const keys=createLocalJWKSet({keys:[jwk]});
 const nonce='a'.repeat(64),client='com.baragames.logoscardgame';
 const sign=(overrides:Record<string,unknown>={})=>new SignJWT({iss:'https://appleid.apple.com',aud:client,sub:'apple-user',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,nonce,...overrides}).setProtectedHeader({alg:'RS256',kid:'apple-test'}).sign(privateKey);
 assert.equal((await verifyAppleCredential(client,await sign(),nonce,keys)).sub,'apple-user');
 for(const token of [await sign({aud:client+'.web'}),await sign({nonce:'bad'}),await sign({iss:'https://evil.example'}),await sign({exp:1})])await assert.rejects(verifyAppleCredential(client,token,nonce,keys));
});
test('Android Apple callback only relays a bounded form to its fixed app URL',async()=>{
 const request=(body:string)=>new Request('https://worker/auth/apple/android',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
 const response=await appleAndroidCallback(request(new URLSearchParams({state:'a'.repeat(64),id_token:'signed-token',redirect:'https://evil.example'}).toString()));
 assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
 const body=await response.text();assert.match(body,/com\.baragames\.logoscardgame:\/\/auth\/apple/);assert.ok(!body.includes('evil.example'));
 assert.equal((await appleAndroidCallback(request('state=bad&id_token=token'))).status,400);
 assert.equal((await appleAndroidCallback(new Request('https://worker/auth/apple/android'))).status,405);
});
test('one game account can link Google and Apple, survive restart and reject a different linked Apple identity',()=>{
 const messages:any[]=[];const socket:GameSocket={readyState:1,bufferedAmount:0,send(data){messages.push(JSON.parse(data))},close(){},terminate(){}};
 const game=new Game(),p=game.hello(socket,undefined,'guest');p.coins=321;game.community.record(p).store.frame='frame-style-60';
 game.loginGoogle(p,{sub:'google-sub'});const id=p.accountId;game.loginApple(p,{sub:'apple-sub'},'Apple name');
 assert.equal(p.accountId,id);assert.equal(game.accounts.size,1);assert.equal(p.coins,321);
 assert.deepEqual(messages.filter(x=>x.type==='session').at(-1).account.linkedProviders,['google','apple']);
 game.loginApple(p,{sub:'other-apple'},'Wrong');assert.match(messages.at(-1).message,/다른 Apple/);
 const restored=new Game();restore(restored,snapshot(game));restored.sessions.clear();
 const next=restored.hello(socket,undefined,'other guest');restored.loginApple(next,{sub:'apple-sub'},'ignored');assert.equal(next.accountId,id);assert.equal(next.coins,321);assert.equal(restored.community.record(next).store.frame,'frame-style-60');
});
