import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';
import {flightLaneAt,flightSpeed,flightWindow,FLIGHT_ARRIVAL_GRACE_MS,type FlightView} from '../shared/flightGame.js';
import {FLIGHT_VERBS} from '../server/flightWords.js';

function player(game:Game){const messages:Record<string,unknown>[]=[];const socket={readyState:1,bufferedAmount:0,send(text:string){messages.push(JSON.parse(text));},close(){},terminate(){}};return {player:game.hello(socket,undefined,'비행 검사'),messages};}
function view(messages:Record<string,unknown>[]):FlightView{return messages.filter(message=>message.type==='flightState').at(-1)?.data as FlightView;}
function answer(game:Game,id:string){return game.community.records.get(id)!.flight!.run!.challenge.correctLane;}

test('54 supplied verbs have four distinct plausible wrong forms for each gate',()=>{
 assert.equal(FLIGHT_VERBS.length,54);
 assert.deepEqual(FLIGHT_VERBS.slice(0,3).map(verb=>verb.base),['bear','ride','rise']);
 assert.deepEqual(FLIGHT_VERBS.slice(-3).map(verb=>verb.base),['seek','teach','think']);
 for(const verb of FLIGHT_VERBS){
  for(const [form,wrong] of [[verb.past,verb.wrongPast],[verb.participle,verb.wrongParticiple]] as const){assert.equal(wrong.length,4,verb.base);assert.equal(new Set(wrong).size,4,verb.base);assert.ok(!wrong.includes(form),verb.base);}
 }
 assert.equal(flightSpeed(0),1);assert.equal(flightSpeed(100000),2.4);
 assert.deepEqual([.25,.5,.75].map(flightLaneAt),['left','center','right']);
});

test('word gates start immediately; a separate coin is 1 point and each correct gate is 30',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.handle(p,{type:'flightStart'});
 let run=view(messages).run!;assert.equal(run.verb.base,'break');assert.equal(run.hearts,3);assert.equal(run.challenge.kind,'gate');assert.ok([run.challenge.left,run.challenge.right].includes('broke'));assert.equal('correctLane' in run.challenge,false);
 const avoid=()=>{const current=view(messages).run!;if(current.hazardResolved)return;now=current.challenge.deadline-Math.round(flightWindow(current.speed)*.65);game.handle(p,{type:'flightHazard',runId:current.id,challengeId:current.challenge.id,side:current.challenge.hazardLane==='left'?'right':'left'});};
 const choose=(side:'left'|'right')=>{avoid();const current=view(messages).run!;now=current.challenge.deadline-100;game.handle(p,{type:'flightChoose',runId:current.id,challengeId:current.challenge.id,side});};
 const pickup=()=>{avoid();const current=view(messages).run!;now=current.challenge.deadline-Math.round(flightWindow(current.speed)*.3);game.handle(p,{type:'flightPickup',runId:current.id,challengeId:current.challenge.id,side:current.challenge.coinLane});};
 game.handle(p,{type:'flightChoose',runId:run.id,challengeId:run.challenge.id,side:answer(game,p.id)});assert.equal(view(messages).run?.score,0);
 pickup();run=view(messages).run!;assert.equal(run.coins,1);assert.equal(run.score,1);
 game.handle(p,{type:'flightPickup',runId:run.id,challengeId:run.challenge.id,side:run.challenge.coinLane});assert.equal(view(messages).run?.score,1);
 choose(answer(game,p.id));run=view(messages).run!;assert.equal(run.distance,100);assert.equal(run.score,31);assert.equal(run.stage,'participle');assert.equal(run.speed,flightSpeed(100));
 assert.ok([run.challenge.left,run.challenge.right].includes('broken'));
 const stale=run.challenge.id-1;game.community.flightChoose(p,{runId:run.id,challengeId:stale,side:answer(game,p.id)});assert.equal(view(messages).run?.score,31);
 pickup();run=view(messages).run!;assert.equal(run.score,32);
 choose(answer(game,p.id));run=view(messages).run!;assert.equal(run.distance,200);assert.equal(run.score,62);assert.equal(run.verb.base,'drive');
 const saved=snapshot(game),restored=new Game();restore(restored,saved);assert.equal(restored.community.records.get(p.id)?.flight?.run?.distance,200);
});

test('wrong word gate removes one heart, restarts the same verb and resets speed',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const choose=(side:'left'|'right')=>{let run=view(messages).run!;if(!run.hazardResolved){now=run.challenge.deadline-Math.round(flightWindow(run.speed)*.65);game.community.flightHazard(p,{runId:run.id,challengeId:run.challenge.id,side:run.challenge.hazardLane==='left'?'right':'left'});run=view(messages).run!;}now=run.challenge.deadline-100;game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side});};
 let run=view(messages).run!;choose(answer(game,p.id));run=view(messages).run!;assert.equal(run.distance,100);
 game.community.flightPickup(p,{runId:run.id,challengeId:run.challenge.id,side:run.challenge.coinLane});assert.equal(view(messages).run?.coins,0);
 choose(answer(game,p.id)==='left'?'right':'left');run=view(messages).run!;
 assert.equal(run.hearts,2);assert.equal(run.distance,100);assert.equal(run.score,30);assert.equal(run.speed,1);assert.equal(run.stage,'past');assert.equal(run.verb.base,'break');
 choose(answer(game,p.id)==='left'?'right':'left');run=view(messages).run!;assert.equal(run.hearts,1);
 now=run.challenge.deadline+FLIGHT_ARRIVAL_GRACE_MS+1;game.community.flightStatus(p);
 assert.equal(view(messages).run,undefined);assert.deepEqual(view(messages).lastResult,{distance:100,score:30,coins:0});assert.equal(view(messages).ranking[0].distance,100);
 game.community.flightStart(p);assert.equal(view(messages).run?.hearts,3);assert.equal(view(messages).bestDistance,100);
});

test('staying on the center divider at gate arrival causes a collision',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const run=view(messages).run!;now=run.challenge.deadline-Math.round(flightWindow(run.speed)*.65);game.community.flightHazard(p,{runId:run.id,challengeId:run.challenge.id,side:run.challenge.hazardLane==='left'?'right':'left'});now=run.challenge.deadline-100;
 game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:'center'});
 assert.equal(view(messages).run?.hearts,2);assert.equal(view(messages).run?.score,0);
});

test('flying through the moving hazard costs a heart before the word gate',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const run=view(messages).run!;now=run.challenge.deadline-Math.round(flightWindow(run.speed)*.65);
 game.community.flightHazard(p,{runId:run.id,challengeId:run.challenge.id,side:run.challenge.hazardLane});
 const next=view(messages).run!;assert.equal(next.hearts,2);assert.equal(next.stage,'past');assert.notEqual(next.challenge.id,run.challenge.id);
});

test('a saved coin-or-obstacle challenge resumes as a word gate',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const legacy=game.community.records.get(p.id)!.flight!.run!;legacy.challenge={...legacy.challenge,kind:'approach',left:'코인',right:'장애물'};
 game.community.flightStatus(p);
 const current=view(messages).run!;assert.equal(current.challenge.kind,'gate');assert.ok([current.challenge.left,current.challenge.right].includes('broke'));assert.equal(current.score,0);
});

test('flight ranking resets separately each season and retains the prior result',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 for(let i=0;i<1;i++){const run=view(messages).run!;now=run.challenge.deadline-Math.round(flightWindow(run.speed)*.65);game.community.flightHazard(p,{runId:run.id,challengeId:run.challenge.id,side:run.challenge.hazardLane==='left'?'right':'left'});now=run.challenge.deadline-100;game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:answer(game,p.id)});}
 let run=view(messages).run!;assert.equal(run.distance,100);
 for(let i=0;i<3;i++){run=view(messages).run!;now=run.challenge.deadline-Math.round(flightWindow(run.speed)*.65);game.community.flightHazard(p,{runId:run.id,challengeId:run.challenge.id,side:run.challenge.hazardLane==='left'?'right':'left'});now=run.challenge.deadline-100;game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:answer(game,p.id)==='left'?'right':'left'});}
 assert.equal(view(messages).bestDistance,100);
 now=Date.parse('2026-11-15T00:00:00+09:00');game.community.rollFlightSeason(now);game.community.flightStatus(p);
 const next=view(messages);assert.equal(next.bestDistance,0);assert.equal(next.ranking.length,0);assert.deepEqual(next.history.map(item=>({distance:item.bestDistance,rank:item.rank})),[{distance:100,rank:1}]);
});
