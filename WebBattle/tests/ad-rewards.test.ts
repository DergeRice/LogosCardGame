import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';
import {verifyLevelPlayCallback} from '../server/levelPlayCallback.js';
import {adDay} from '../shared/adRewards.js';

function fixture(){
 const messages:Record<string,any>[]=[];
 const socket={readyState:1,bufferedAmount:0,send(raw:string){messages.push(JSON.parse(raw))},close(){},terminate(){}};
 const game=new Game({adRewardsEnabled:true}),player=game.hello(socket as any,null,'Ad owner');
 return {game,player,messages};
}

test('LevelPlay callback verifies signed ticket and rejects altered reward',()=>{
 const ticket='2f9ea89f52b845fba34194eb54604638',userId='LevelPlayUser123',event='AdEvent123',timestamp='202610221234',key='private-test-key';
 const signature=createHash('md5').update(timestamp+event+userId+'1'+key).digest('hex');
 const url=new URL(`https://example.test/ads/levelplay/callback?timestamp=${timestamp}&eventId=${event}&userId=${userId}&dynamicUserId=${ticket}&rewards=1&placement=logos_rewarded_box&signature=${signature}`);
 assert.deepEqual(verifyLevelPlayCallback(url,key),{ticket,eventId:event});
 url.searchParams.set('rewards','2');assert.equal(verifyLevelPlayCallback(url,key),null);
 url.searchParams.set('rewards','1');url.searchParams.set('placement','wrong');assert.equal(verifyLevelPlayCallback(url,key),null);
 url.searchParams.set('placement','logos_rewarded_box');url.searchParams.set('dynamicUserId','invalid-ticket');assert.equal(verifyLevelPlayCallback(url,key),null);
});

test('reward requires signed server claim, is idempotent and limited to three per Korean day',()=>{
 const {game,player,messages}=fixture();
 assert.equal(game.community.view(player).adEnabled,true);
 for(let i=0;i<3;i++){
  game.handle(player,{type:'adRewardTicket',box:i%2?'gold':'silver'});
  const ticket=messages.filter(m=>m.type==='adTicket').at(-1)?.ticket;
  assert.ok(ticket);
  assert.equal(game.community.record(player).results.length,i);
  assert.equal(game.community.claimAdTicket(ticket,`event${i}`),'granted');
  assert.equal(game.community.claimAdTicket(ticket,`event${i}`),'duplicate');
  assert.equal(game.community.claimAdTicket(ticket,`other${i}`),'missing');
  assert.equal(game.community.record(player).store.adUsage?.[adDay(Date.now())],i+1);
 }
 game.handle(player,{type:'adRewardTicket',box:'silver'});
 assert.equal(messages.filter(m=>m.type==='adTicket').length,3);
 const next=new Game({adRewardsEnabled:true});restore(next,snapshot(game));
 assert.equal(next.community.records.get(game.community.id(player))?.store.adUsage?.[adDay(Date.now())],3);
});
