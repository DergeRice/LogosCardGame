import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';
import {seasonAt,seasonStartingRating} from '../shared/season.js';
import type {MiniGameView} from '../shared/miniGame.js';

function player(game:Game,name:string){const messages:Record<string,unknown>[]=[];const socket={readyState:1,bufferedAmount:0,send(text:string){messages.push(JSON.parse(text));},close(){},terminate(){}};return {player:game.hello(socket,undefined,name),messages};}
function mini(messages:Record<string,unknown>[]):MiniGameView{return messages.filter(message=>message.type==='miniGameState').at(-1)?.data as MiniGameView;}

test('a one-minute verb run validates sides, blocks repeated wrong taps and survives restore',()=>{
 const game=new Game(),{player:p,messages}=player(game,'미니 게임 검사');
 game.community.miniStart(p);
 const first=mini(messages).run!;
 assert.ok(first.card.word);assert.notEqual(first.left.id,first.right.id);
 const record=game.community.record(p),answer=record.miniGame!.run!.queue[0].categoryId;
 const wrong=first.left.id===answer?'right':'left',right=wrong==='left'?'right':'left';
 assert.ok(first.startsAt>Date.now());
 game.community.miniChoose(p,{runId:first.id,cardId:first.card.id,side:wrong});
 assert.equal(mini(messages).run?.wrong,0);
 record.miniGame!.run!.startsAt=0;
 game.community.miniChoose(p,{runId:first.id,cardId:first.card.id,side:wrong});
 assert.equal(mini(messages).run?.wrong,1);
 game.community.miniChoose(p,{runId:first.id,cardId:first.card.id,side:wrong});
 assert.equal(mini(messages).run?.wrong,1);
 record.miniGame!.run!.lockedUntil=0;
 game.community.miniChoose(p,{runId:first.id,cardId:first.card.id,side:right});
 assert.equal(mini(messages).run?.correct,1);
 assert.notEqual(mini(messages).run?.card.id,first.card.id);
 game.community.miniChoose(p,{runId:first.id,cardId:first.card.id,side:right});
 assert.equal(mini(messages).run?.correct,1);
 record.miniGame!.run!.endsAt=Date.now()-1;
 game.community.miniStatus(p);
 assert.equal(mini(messages).best,1);assert.equal(mini(messages).plays,1);assert.equal(mini(messages).ranking[0].id,p.id);
 const restored=new Game();restore(restored,snapshot(game));
 assert.equal(restored.community.records.get(p.id)?.miniGame?.best,1);
});

test('active days count distinct Korean calendar dates, not reconnects or play time',t=>{
 let now=Date.parse('2026-11-08T23:50:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p}=player(game,'활성 일수 검사');
 assert.equal(game.community.record(p).activeDays,1);
 game.community.markActive(p);assert.equal(game.community.record(p).activeDays,1);
 now=Date.parse('2026-11-09T00:01:00+09:00');game.community.markActive(p);
 assert.equal(game.community.record(p).activeDays,2);
 const saved=snapshot(game),restored=new Game();restore(restored,saved);
 assert.equal(restored.community.records.get(p.id)?.activeDays,2);
 assert.equal(saved.get('community:'+p.id)?.includes('playTimeMs'),false);
 const legacy=new Map(saved),record=JSON.parse(legacy.get('community:'+p.id)!);record.playTimeMs=12345;legacy.set('community:'+p.id,JSON.stringify(record));
 const migrated=new Game();restore(migrated,legacy);
 assert.equal(snapshot(migrated).get('community:'+p.id)?.includes('playTimeMs'),false);
});

test('the November 15 KST season carries 40 percent with the requested floors',()=>{
 const boundary=Date.parse('2026-11-15T00:00:00+09:00');
 assert.equal(seasonAt(boundary-1).id,'2026-11-01');
 assert.equal(seasonAt(boundary).id,'2026-11-15');
 assert.equal(seasonAt(boundary+14*86400000).id,'2026-11-29');
 assert.equal(seasonStartingRating(2600),1040);
 assert.equal(seasonStartingRating(1200),1000);
 assert.equal(seasonStartingRating(999),900);
 const game=new Game(),high=player(game,'높은 점수').player,low=player(game,'낮은 점수').player;
 high.rating=2600;low.rating=950;
 for(const p of [high,low]){const record=game.community.record(p);record.rating=p.rating;record.rankGames=3;record.seasonGames=2;}
 game.rankingSeasonId='2026-11-01';game.rollRankingSeason(boundary);
 assert.equal(game.rankingSeasonId,'2026-11-15');
 assert.equal(high.rating,1040);assert.equal(low.rating,900);
 assert.equal(game.community.records.get(high.id)?.ratingHistory?.[0].rating,2600);
 assert.equal(game.community.records.get(high.id)?.seasonGames,0);
 game.rollRankingSeason(boundary+1000);assert.equal(high.rating,1040);
});

test('mini-game season starts from zero and retains the previous best in profile history',()=>{
 const game=new Game(),{player:p}=player(game,'시즌 미니 검사');
 game.community.miniStart(p);
 const progress=game.community.record(p).miniGame!;
 progress.run=undefined;progress.season='2026-11-01';progress.best=12;progress.plays=3;
 game.community.rollMiniSeason(Date.parse('2026-11-15T00:00:00+09:00'));
 assert.equal(progress.season,'2026-11-15');assert.equal(progress.best,0);
 assert.deepEqual(progress.history.map(item=>[item.season,item.best,item.plays]),[['2026-11-01',12,3]]);
});
