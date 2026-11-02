import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aiDifficulty,availableAIDifficulties,aiOpponentTier,aiTierBonusPercent,normalizeAIDifficulty,GUEST_RETENTION_MS} from '../shared/progression.js';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore,nextDeadline} from '../server/persistence.js';
import {leagueFor} from '../shared/store.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}} as GameSocket);
test('only the unique winner receives fixed Go rank points',()=>{
 for(const go of [0,1,2,3]){const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);a.score=50;b.score=10;r.leaderId=a.id;r.goCount=go;game.finish(r,'finish');assert.equal(a.reward,go>=3?750:go===2?250:50);assert.equal(b.reward,0);}
});
test('rating separated players wait in distinct rooms; AI seats track the human rating and actual difficulty',()=>{
 const game=new Game(),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B'),far=game.hello(socket(),null,'Far');a.rating=1000;b.rating=1050;far.rating=1600;game.quick(a);game.quick(b);game.quick(far);assert.equal(a.room,b.room);assert.notEqual(a.room,far.room);assert.equal(aiDifficulty(800),'easy');assert.equal(aiDifficulty(1000),'normal');assert.equal(aiDifficulty(1600),'hard');
});
test('guest points and rating survive return and snapshot; expiry is separate from five-minute match expiry',t=>{
 let now=100000;t.mock.method(Date,'now',()=>now);const game=new Game(),p=game.hello(socket(),null,'Guest');p.points=600;p.rating=1040;game.disconnected(p,p.socket!);assert.equal(nextDeadline(game),now+GUEST_RETENTION_MS+1);now+=86400000;game.tick();assert.ok(game.sessions.has(p.token));const fresh=new Game();restore(fresh,snapshot(game));const resumed=fresh.hello(socket(),p.token,'Ignored');assert.equal(resumed.id,p.id);assert.equal(resumed.points,600);assert.equal(resumed.rating,1040);fresh.disconnected(resumed,resumed.socket!);now+=GUEST_RETENTION_MS+1;fresh.tick();assert.equal(fresh.sessions.has(p.token),false);
});

test('AI difficulty choices follow the player league',()=>{
 assert.deepEqual(availableAIDifficulties(1800),['easy','normal','hard','veryHard']);
 assert.deepEqual(availableAIDifficulties(1801),['normal','hard','veryHard']);
 assert.deepEqual(availableAIDifficulties(2801),['hard','veryHard']);
 assert.deepEqual(availableAIDifficulties(3301),['veryHard']);
 assert.equal(normalizeAIDifficulty(3301,'easy'),'veryHard');
 assert.equal(aiOpponentTier(1000,'normal'),leagueFor(1000).tier);
 assert.equal(aiOpponentTier(1000,'hard'),leagueFor(1000).tier+1);
 assert.equal(aiOpponentTier(1000,'veryHard'),leagueFor(1000).tier+2);
 assert.equal(aiOpponentTier(3900,'veryHard'),7);
 const game=new Game({minimumPlayers:2});const player=game.hello(socket(),null,'tier');player.rating=3301;game.quick(player,'easy');const room=game.rooms.get(player.room!)!;assert.equal(room.aiSetting,'veryHard');game.reveal(room);assert.equal(room.players.find(p=>p.ai)?.ai,'veryHard');assert.equal(room.deck.filter(c=>c.kind==='to-infinitive').length,4);assert.equal(game.view(room,player).deckTotal,75);
 const challenger=new Game({minimumPlayers:2}),human=challenger.hello(socket(),null,'challenger');human.rating=1000;challenger.quick(human,'veryHard');const challenge=challenger.rooms.get(human.room!)!;challenger.reveal(challenge);assert.equal(challenge.aiSetting,'veryHard');assert.equal(leagueFor(challenge.players.find(p=>p.ai)!.rating).tier,aiOpponentTier(human.rating,'veryHard'));
});
test('higher-tier AI victory scales coins, points and rating by league difference',()=>{
 for(const [botRating,percent,expectedReward,expectedCoin,expectedRating] of [
  [1050,0,50,170,14],[1400,10,55,187,24],[1900,15,58,196,28],[2400,20,60,204,29]
 ] as const){
  const game=new Game({minimumPlayers:2}),player=game.hello(socket(),null,'human');game.quick(player,'hard');const room=game.rooms.get(player.room!)!;game.reveal(room);game.begin(room);
  const bot=room.players.find(p=>p.ai)!;player.rating=1000;bot.rating=botRating;game.community.record(player).rankGames=3;player.score=25;bot.score=0;game.finish(room,'done');
  assert.equal(aiTierBonusPercent(leagueFor(1000).tier,leagueFor(botRating).tier),percent);
  assert.equal(player.ratingDelta,expectedRating);assert.equal(player.reward,expectedReward);assert.equal(player.coinReward,expectedCoin);assert.equal(player.rewardRatio,1+percent/100);
 }
});
test('a naturally matched very-hard AI pays the displayed bonus',()=>{
 const game=new Game({minimumPlayers:2}),player=game.hello(socket(),null,'challenger');player.rating=1000;game.quick(player,'veryHard');const room=game.rooms.get(player.room!)!;game.reveal(room);game.begin(room);
 const bot=room.players.find(p=>p.ai)!;assert.equal(leagueFor(bot.rating).tier,aiOpponentTier(player.rating,'veryHard'));
 game.community.record(player).rankGames=3;player.score=25;bot.score=0;game.finish(room,'won');
 assert.equal(player.rewardRatio,1.15);assert.equal(player.reward,58);assert.equal(player.coinReward,196);assert.ok(player.ratingDelta>0);
});
