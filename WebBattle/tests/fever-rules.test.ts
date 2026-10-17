import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Game} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';
import {matchGold} from '../shared/matchRewards.js';
import {type Card} from '../shared/rules.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}});
test('fever counts before the scoring threshold for human and AI, including the final score',()=>{
 for(const ai of [false,true]){const game=new Game({minimumPlayers:2}),p=game.hello(socket(),null,'A'),other=game.hello(socket(),null,'B');game.quick(p);game.quick(other);const r=game.rooms.get(p.room!)!;game.reveal(r);game.begin(r);r.goCount=2;r.highScore=100;other.score=100;
  p.hand=[{id:'p',kind:'pronoun',variant:'pronoun-x2'},{id:'v',kind:'verb'},{id:'a',kind:'article'},{id:'n',kind:'count',variant:'count-plus3'},{id:'j',kind:'adjective'}];p.handVersion++;p.nextAI=0;
  if(ai){p.ai='normal';game.tick()}else game.action(p,{requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)});
  assert.equal(p.judgment!.accepted,true);assert.equal(p.score,26);assert.equal(r.phase,'battle');
  p.actionAt=0;r.goCount=3;p.hand=[{id:'p2',kind:'pronoun',variant:'pronoun-x2'},{id:'v2',kind:'verb'},{id:'a2',kind:'article'},{id:'n2',kind:'count',variant:'count-plus3'},{id:'j2',kind:'adjective'}];p.handVersion++;p.nextAI=0;
  if(ai)game.tick();else game.action(p,{requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)});
  assert.equal(p.score,65);assert.equal(r.phase,'result');assert.equal(r.winner,other.id);
 }
});
test('lead changes hands, buffs apply to every player, third Go waits across restart and next score settles once',t=>{
 let now=100000;t.mock.method(Date,'now',()=>now);
 for(const finisher of ['caller','rival','trailing'] as const)for(const bots of [false,true]){
  let game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);let r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);if(bots){a.ai='normal';b.ai='normal';a.nextAI=b.nextAI=now+1000000;}
  const score=(p:typeof a)=>{const hand:Card[]=[{id:randomUUID(),kind:'pronoun',variant:'pronoun-x2'},{id:randomUUID(),kind:'verb'},{id:randomUUID(),kind:'article',variant:'article-x2'},{id:randomUUID(),kind:'count',variant:'count-plus3'},{id:randomUUID(),kind:'adjective',variant:'adjective-plus3'}];p.hand=hand;p.handVersion++;now+=1600;game.action(p,{requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:hand.map(c=>c.id)});};
  const go=(p:typeof a)=>game.choice(p,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});
  score(a);go(a);assert.equal(a.score,26);score(b);assert.equal(r.decision,undefined);score(b);assert.equal(r.decision!.playerId,b.id);go(b);assert.equal(r.goCount,2);assert.equal(game.view(r,a).multiplier,2);
  score(a);assert.equal(a.score,78);assert.equal(r.decision!.playerId,a.id);go(a);assert.equal(r.goCount,3);assert.equal(r.phase,'battle');assert.equal(game.view(r,b).multiplier,3);
  const saved=snapshot(game),fresh=new Game({minimumPlayers:2});restore(fresh,saved);game=fresh;r=game.rooms.get(r.code)!;a=r.players.find(p=>p.id===a.id)!;b=r.players.find(p=>p.id===b.id)!;game.tick();assert.equal(r.phase,'battle');
  if(finisher==='trailing')b.score=-100;
  const who=finisher==='caller'?a:b,before=who.score;score(who);assert.equal(who.score,before+78);assert.equal(r.phase,'result');assert.equal(r.winner,finisher==='rival'?b.id:a.id);assert.equal(Math.abs(a.ratingDelta),36);assert.equal(Math.abs(b.ratingDelta),36);
  const winner=r.players.find(p=>p.id===r.winner)!;assert.ok(winner.coinReward!>=450&&winner.coinReward!<=550);assert.equal(r.players.find(p=>p!==winner)!.coinReward,0);const coins=winner.coins;game.tick();game.finish(r,'repeat');assert.equal(winner.coins,coins);
 }
});
test('gold is bounded by ten percent and difficulty selections partition matching and control actual AI',()=>{
 for(const go of [0,1,2,3])for(const rating of [0,1000,100000])for(const elapsedMs of [0,180000,36000000]){
  const reward=matchGold({go,rating,opponents:[5000],score:100,scores:[100,10],elapsedMs,difficulty:'hard'}),base=go>=3?500:go===2?400:300;assert.equal(reward.base,base);assert.ok(reward.total>=base*.9&&reward.total<=base*1.1);
 }
 const game=new Game();for(const difficulty of ['easy','normal','hard'] as const){const p=game.hello(socket(),null,difficulty);game.quick(p,difficulty);const r=game.rooms.get(p.room!)!;assert.equal(r.aiSetting,difficulty);game.reveal(r);assert.ok(r.players.filter(x=>x.ai).every(x=>x.ai===difficulty));}
 assert.equal(game.rooms.size,3);
});
test('each gold factor affects reward; host owns room difficulty and saved coins resume',()=>{
 const input={go:2,rating:1000,opponents:[1000],score:60,scores:[60,40],elapsedMs:180000,difficulty:'normal' as const};const base=matchGold(input).total;
 assert.ok(matchGold({...input,opponents:[1100]}).total>base);assert.ok(matchGold({...input,score:180}).total>base);assert.ok(matchGold({...input,elapsedMs:360000}).total>base);assert.ok(matchGold({...input,difficulty:'hard'}).total>base);assert.ok(matchGold({...input,difficulty:'easy'}).total<base);
 const game=new Game(),host=game.hello(socket(),null,'Host'),guest=game.hello(socket(),null,'Guest');game.createRoom(host);const r=game.rooms.get(host.room!)!;game.joinRoom(guest,r.code);game.setRoomDifficulty(guest,'hard');assert.equal(r.aiSetting,'normal');game.setRoomDifficulty(host,'hard');assert.equal(r.aiSetting,'hard');game.setRoomDifficulty(host,'forged');assert.equal(r.aiSetting,'hard');game.reveal(r);game.begin(r);host.score=100;r.players.filter(x=>x!==host).forEach(x=>x.score=10);game.finish(r,'stop');assert.ok(host.coins>0);const saved=new Game();restore(saved,snapshot(game));assert.equal(saved.hello(socket(),host.token,'ignored').coins,host.coins);
});
