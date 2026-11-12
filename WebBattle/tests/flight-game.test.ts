import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';
import {flightLaneAt,flightSpeed,flightSpeedForStreak,flightWindow,flightWindowForStreak,flightGateIntervalForStreak,FLIGHT_GATE_SPACING_MS,FLIGHT_ROUND_MS,type FlightView} from '../shared/flightGame.js';
import {FLIGHT_VERBS} from '../server/flightWords.js';
import {descendingFlightTile,flightGateCenterY} from '../shared/flightVisual.js';
import {advanceLocalFlight,startLocalFlight,verifyFlightSteps} from '../shared/flightLocal.js';

test('local flight advances gates without any server response',()=>{
 const started=startLocalFlight(1000),first=started.challenge,side=first.correctLane;
 assert.ok(first.startsAt!>started.startedAt);
 const next=advanceLocalFlight(started,side,first.deadline);
 assert.equal(next.run.score,30);assert.equal(next.run.stage,'participle');
 assert.equal(next.run.challenge.id,first.id+1);
 assert.ok(next.run.challenge.startsAt!>first.deadline);
 assert.deepEqual(verifyFlightSteps(next.run.steps)?.score,30);
});

test('flight gates start at four seconds and gain 300 ms per Speed Up level down to 2.2 seconds',()=>{
 const opening=startLocalFlight(1000).challenge;
 assert.equal(opening.deadline-1000,4000);
 for(let level=0;level<=6;level++){
  const expected=4000-level*300;
  assert.equal(flightGateIntervalForStreak(level*3),expected);
  assert.equal(flightWindowForStreak(level*3)+FLIGHT_GATE_SPACING_MS,expected);
  if(level<6)assert.equal(flightGateIntervalForStreak(level*3+2),expected);
 }
 assert.equal(flightGateIntervalForStreak(21),2200);
 let run=startLocalFlight(1000),milestone=false;
 for(let answer=1;answer<=3;answer++){
  const result=advanceLocalFlight(run,run.challenge.correctLane,run.challenge.deadline);
  run=result.run;milestone=result.speedUp;
  assert.equal(run.challenge.deadline-run.lastActionAt,answer===3?3700:4000);
 }
 assert.equal(milestone,true);
 const wrong=run.challenge.correctLane==='left'?'right':'left';
 run=advanceLocalFlight(run,wrong,run.challenge.deadline).run;
 assert.equal(run.challenge.deadline-run.lastActionAt,4000);
});

test('local wrong answer immediately costs one heart and retries the same gate',()=>{
 const started=startLocalFlight(1000),first=started.challenge,wrong=first.correctLane==='left'?'right':'left';
 const result=advanceLocalFlight(started,wrong,first.deadline);
 assert.equal(result.run.hearts,2);assert.equal(result.run.score,0);
 assert.equal(result.run.challenge.left,first.left);assert.equal(result.run.challenge.right,first.right);
 assert.equal(result.run.verbIndex,started.verbIndex);assert.equal(result.run.stage,'past');
 assert.deepEqual(verifyFlightSteps(result.run.steps)?.hearts,2);
});

test('flight art moves downward and loops without a jump',()=>{
 const first=descendingFlightTile(99,500,0,0),next=descendingFlightTile(109,500,0,0);
 assert.equal(next.top-first.top,10);
 const beforeSeam=descendingFlightTile(499,500,0,-1),afterSeam=descendingFlightTile(501,500,0,0);
 assert.equal(afterSeam.top-beforeSeam.top,2);
 assert.equal('flipped' in afterSeam,false);
});

test('a word gate keeps moving below the plane after contact until it exits the field',()=>{
 const start=1000,deadline=4800,h=600,gateH=54,plane=70;
 const before=flightGateCenterY(deadline-50,start,deadline,h,gateH,plane);
 assert.ok(flightGateCenterY(start,start,deadline,h,gateH,plane)<-gateH,'gate and its label begin above the field');
 const contact=flightGateCenterY(deadline,start,deadline,h,gateH,plane);
 const after=flightGateCenterY(deadline+500,start,deadline,h,gateH,plane);
 const exit=flightGateCenterY(deadline+2000,start,deadline,h,gateH,plane);
 assert.ok(before<contact&&contact<after&&after<exit);
 assert.ok(Math.abs(contact+gateH/2-(h*.83-plane/2))<1e-9);
 assert.ok(exit>h);
});

test('every base, past and participle has a prerecorded Kokoro flight clip',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/audio/flight/manifest-v1.json',import.meta.url),'utf8')) as {engine:string;clips:Record<string,string>};
 const required=new Set(FLIGHT_VERBS.flatMap(verb=>[verb.base,verb.past,verb.participle]));
 assert.equal(manifest.engine,'Kokoro-82M v1.0');
 assert.deepEqual(new Set(Object.keys(manifest.clips)),required);
 for(const word of required){const filename=manifest.clips[word];assert.match(filename,/^[a-f0-9]{20}\.mp3$/);const bytes=readFileSync(new URL(`../public/audio/flight/clips/${filename}`,import.meta.url));assert.ok(bytes.length>1000,word);assert.ok(bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0),word);}
});

test('flight recordings are also packed for immediate gate playback',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/audio/flight/manifest-v2.json',import.meta.url),'utf8')) as {sampleRate:number;segments:Record<string,{start:number;length:number}>};
 const audio=readFileSync(new URL('../public/audio/flight/flight-voice-v2.mp3',import.meta.url));
 assert.equal(manifest.sampleRate,24000);assert.ok(audio.subarray(0,3).toString()==='ID3'||(audio[0]===0xff&&(audio[1]&0xe0)===0xe0));
 const required=new Set(FLIGHT_VERBS.flatMap(verb=>[verb.base,verb.past,verb.participle]));
 assert.deepEqual(new Set(Object.keys(manifest.segments)),required);
 assert.ok(audio.length<1000000,'packed audio should load quickly');
 for(const word of required){const {start,length}=manifest.segments[word];assert.ok(start>=0&&length>2400,word);}
});

function player(game:Game){const messages:Record<string,unknown>[]=[];const socket={readyState:1,bufferedAmount:0,send(text:string){messages.push(JSON.parse(text));},close(){},terminate(){}};return {player:game.hello(socket,undefined,'비행 검사'),messages};}
function view(messages:Record<string,unknown>[]):FlightView{return messages.filter(message=>message.type==='flightState').at(-1)?.data as FlightView;}
function answer(game:Game,id:string){return game.community.records.get(id)!.flight!.run!.challenge.correctLane;}

test('only the final local transcript is submitted and duplicate uploads do not add plays',()=>{
 const game=new Game(),{player:p,messages}=player(game),started=startLocalFlight(1000);
 const after=advanceLocalFlight(started,started.challenge.correctLane,started.challenge.deadline).run;
 game.handle(p,{type:'flightSubmit',runId:started.id,steps:after.steps});
 assert.equal(view(messages).lastResult?.score,30);assert.equal(view(messages).bestScore,30);assert.equal(view(messages).plays,1);
 game.handle(p,{type:'flightSubmit',runId:started.id,steps:after.steps});
 assert.equal(view(messages).plays,1);
 game.handle(p,{type:'flightSubmit',runId:'invalid-run-id',steps:[{...after.steps[0],left:'fake',right:'fake'}]});
 assert.equal(view(messages).plays,1);
});

test('54 supplied verbs have four distinct plausible wrong forms for each gate',()=>{
 assert.equal(FLIGHT_VERBS.length,54);
 assert.deepEqual(FLIGHT_VERBS.slice(0,3).map(verb=>verb.base),['bear','ride','rise']);
 assert.deepEqual(FLIGHT_VERBS.slice(-3).map(verb=>verb.base),['seek','teach','think']);
 for(const verb of FLIGHT_VERBS){
  for(const [form,wrong] of [[verb.past,verb.wrongPast],[verb.participle,verb.wrongParticiple]] as const){assert.equal(wrong.length,4,verb.base);assert.equal(new Set(wrong).size,4,verb.base);assert.ok(!wrong.includes(form),verb.base);}
 }
 assert.ok(Math.abs(flightSpeed(0)/1.5-1.3)<1e-10);assert.ok(flightSpeed(500)>flightSpeed(0));assert.ok(Math.abs(flightSpeed(100000)-6.12*.93*.9)<1e-10);
 assert.ok(flightSpeed(100)>2.0,'the first correct gate accelerates faster than before');
 assert.ok(flightSpeedForStreak(3)-flightSpeedForStreak(2)>flightSpeedForStreak(2)-flightSpeedForStreak(1),'three correct gates add an extra burst');
 assert.equal(flightSpeedForStreak(25),flightSpeedForStreak(24),'a capped run does not gain speed');
 assert.equal(FLIGHT_ROUND_MS,120_000);
 assert.equal(flightWindow(flightSpeed(0)),1949);assert.equal(flightWindow(flightSpeed(100000)),1000);
 assert.deepEqual([.25,.49,.5,.58,.75].map(x=>flightLaneAt(x)),['left','left','right','right','right']);
});

function readyGate(game:Game,p:ReturnType<typeof player>['player'],messages:Record<string,unknown>[]){const run=view(messages).run!;if(run.challenge.awaitingReady)game.community.flightGateReady(p,{runId:run.id,challengeId:run.challenge.id});return view(messages).run!;}

test('initial and later gates start without a server-side render hold',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.handle(p,{type:'flightStart'});
 let run=view(messages).run!;assert.equal(Boolean(run.challenge.awaitingReady),false);assert.equal(run.hearts,3);assert.equal(run.score,0);
 const initialId=run.challenge.id,initialStart=run.challenge.startsAt;assert.equal(initialStart,now+FLIGHT_GATE_SPACING_MS);
 game.community.flightGateReady(p,{runId:run.id,challengeId:initialId});assert.equal(view(messages).run!.challenge.startsAt,initialStart,'a stale ready signal cannot restart the gate');
 assert.equal(run.endsAt,now+FLIGHT_ROUND_MS);assert.equal(run.challenge.deadline-run.challenge.startsAt!,flightWindow(run.speed));
 now=run.challenge.deadline-100;game.community.flightChoose(p,{runId:run.id,challengeId:initialId,side:answer(game,p.id)});
 run=view(messages).run!;assert.equal(run.score,30);assert.equal(run.stage,'participle');assert.equal(Boolean(run.challenge.awaitingReady),false);assert.equal(run.challenge.startsAt,now+FLIGHT_GATE_SPACING_MS);
 now=run.challenge.deadline-100;game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:answer(game,p.id)});
 run=view(messages).run!;assert.equal(run.score,60);assert.equal(run.stage,'past');assert.equal(Boolean(run.challenge.awaitingReady),false);assert.equal(run.challenge.startsAt,now+FLIGHT_GATE_SPACING_MS);
 const order=game.community.records.get(p.id)!.flight!.run!.verbOrder!;assert.equal(new Set(order).size,FLIGHT_VERBS.length);
});

test('a finished past and participle pair advances through unique verbs until the deck is exhausted',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const seen=new Set<string>();
 for(let index=0;index<FLIGHT_VERBS.length+1;index++){
  let run=view(messages).run!;const base=run.verb.base;
  if(index<FLIGHT_VERBS.length)assert.equal(seen.has(base),false,`${base} repeated before the shuffled deck was exhausted`);
  seen.add(base);
  for(const stage of ['past','participle']){
   run=readyGate(game,p,messages);assert.equal(run.stage,stage);assert.equal(run.verb.base,base);
   now=run.challenge.deadline;const internal=game.community.records.get(p.id)!.flight!.run!;internal.startedAt=now;internal.endsAt=now+FLIGHT_ROUND_MS;
   game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:answer(game,p.id)});
  }
 }
 assert.equal(seen.size,FLIGHT_VERBS.length);
});

test('a resumed run without its shuffled order does not repeat the current verb',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const base=view(messages).run!.verb.base,internal=game.community.records.get(p.id)!.flight!.run!;
 internal.verbOrder=undefined;internal.verbPosition=0;
 for(const stage of ['past','participle']){
  const run=readyGate(game,p,messages);assert.equal(run.stage,stage);now=run.challenge.deadline;
  internal.startedAt=now;internal.endsAt=now+FLIGHT_ROUND_MS;
  game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:answer(game,p.id)});
 }
 assert.notEqual(view(messages).run!.verb.base,base);
});

test('wrong gate repeats the same words and acceleration rebuilds one step at a time',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const choose=(correct:boolean)=>{let run=readyGate(game,p,messages);now=run.challenge.deadline-100;const side=answer(game,p.id);game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:correct?side:side==='left'?'right':'left'});return view(messages).run!;};
 let run=choose(true);assert.equal(run.speed,flightSpeedForStreak(1));run=choose(true);run=choose(true);assert.equal(run.speedSteps,3);assert.equal(run.speed,flightSpeedForStreak(3));
 run=choose(true);assert.equal(run.speedSteps,4);run=choose(true);assert.equal(run.speedSteps,5);assert.equal(run.speed,flightSpeedForStreak(5));
 const missed=run.challenge;run=choose(false);assert.equal(run.hearts,2);assert.equal(run.speedSteps,0);assert.equal(run.speed,flightSpeedForStreak(0));assert.equal(Boolean(run.challenge.awaitingReady),false);assert.deepEqual([run.challenge.left,run.challenge.right],[missed.left,missed.right]);
 run=choose(true);assert.equal(run.speedSteps,1);assert.equal(run.speed,flightSpeedForStreak(1));assert.equal(run.score,180);
});

test('flight ends at exactly two minutes and the completed score is ranked',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);let run=readyGate(game,p,messages);
 now=run.challenge.deadline-100;game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:answer(game,p.id)});
 run=view(messages).run!;assert.equal(run.score,30);now=run.startedAt+FLIGHT_ROUND_MS-1;game.community.flightStatus(p);assert.equal(view(messages).run?.score,30);
 now++;game.community.flightStatus(p);assert.equal(view(messages).run,undefined);assert.equal(view(messages).lastResult?.score,30);assert.equal(view(messages).bestScore,30);assert.equal(view(messages).ranking[0]?.score,30);
 const season=view(messages).season;now=Date.parse('2026-11-15T00:00:00+09:00');game.community.rollFlightSeason(now);game.community.flightStatus(p);assert.equal(view(messages).history.at(-1)?.season,season);assert.equal(view(messages).history.at(-1)?.bestScore,30);
});

test('a gate crossing the center lane costs one heart and cannot double-trigger',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);const run=readyGate(game,p,messages);now=run.challenge.deadline-100;
 game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:'center'});let next=view(messages).run!;assert.equal(next.hearts,2);assert.equal(Boolean(next.challenge.awaitingReady),false);
 game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:'center'});next=view(messages).run!;assert.equal(next.hearts,2);assert.equal(next.score,0);
});

test('overthrow uses overthrew, with one score award at the gate',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const index=FLIGHT_VERBS.findIndex(verb=>verb.base==='overthrow'),verb=FLIGHT_VERBS[index];assert.equal(verb.past,'overthrew');
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);const saved=game.community.records.get(p.id)!.flight!.run!;saved.verbIndex=index;saved.challenge={...saved.challenge,verbIndex:index,left:'overthrew',right:'overthrowed',correctLane:'left'};game.community.flightStatus(p);
 const run=readyGate(game,p,messages);now=run.challenge.deadline;game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:'left'});
 assert.equal(view(messages).run?.score,30);assert.equal(view(messages).run?.lastWord,'overthrew');game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:'left'});assert.equal(view(messages).run?.score,30);
});

test('legacy pickup and hazard messages cannot grant points',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);const run=readyGate(game,p,messages);
 game.community.flightPickup(p,{runId:run.id,challengeId:run.challenge.id,side:'left'});game.community.flightHazard(p,{runId:run.id,challengeId:run.challenge.id,side:'right'});
 assert.equal(view(messages).run?.score,0);assert.equal(view(messages).run?.hearts,3);
});

test('flight leaderboard orders by points even when another player has more distance',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),a=player(game),b=player(game);game.community.flightStart(a.player);game.community.flightStart(b.player);
 const first=game.community.records.get(a.player.id)!.flight!,second=game.community.records.get(b.player.id)!.flight!;
 first.bestDistance=900;first.bestScore=30;second.bestDistance=100;second.bestScore=60;
 game.community.flightStatus(a.player);assert.deepEqual(view(a.messages).ranking.map(entry=>entry.score),[60,30]);
});
