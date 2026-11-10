import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';
import {flightLaneAt,flightSpeed,flightWindow,FLIGHT_ARRIVAL_GRACE_MS,type FlightView} from '../shared/flightGame.js';
import {FLIGHT_VERBS} from '../server/flightWords.js';
import {descendingFlightTile} from '../shared/flightVisual.js';

test('flight art moves downward and loops without a jump',()=>{
 const first=descendingFlightTile(99,500,0,0),next=descendingFlightTile(109,500,0,0);
 assert.equal(next.top-first.top,10);
 const beforeSeam=descendingFlightTile(499,500,0,-1),afterSeam=descendingFlightTile(501,500,0,0);
 assert.equal(afterSeam.top-beforeSeam.top,2);
 assert.equal('flipped' in afterSeam,false);
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

test('54 supplied verbs have four distinct plausible wrong forms for each gate',()=>{
 assert.equal(FLIGHT_VERBS.length,54);
 assert.deepEqual(FLIGHT_VERBS.slice(0,3).map(verb=>verb.base),['bear','ride','rise']);
 assert.deepEqual(FLIGHT_VERBS.slice(-3).map(verb=>verb.base),['seek','teach','think']);
 for(const verb of FLIGHT_VERBS){
  for(const [form,wrong] of [[verb.past,verb.wrongPast],[verb.participle,verb.wrongParticiple]] as const){assert.equal(wrong.length,4,verb.base);assert.equal(new Set(wrong).size,4,verb.base);assert.ok(!wrong.includes(form),verb.base);}
 }
 assert.equal(flightSpeed(0),1);assert.equal(flightSpeed(100000),2.4);
 assert.deepEqual([.25,.5,.75].map(x=>flightLaneAt(x)),['left','center','right']);
 assert.deepEqual([.35,.42,.58,.65].map(x=>flightLaneAt(x,.2)),['left','center','center','right']);
});

test('word gates start immediately, connect without pickups, and score 30 each',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.handle(p,{type:'flightStart'});
 let run=view(messages).run!;const first=FLIGHT_VERBS.find(verb=>verb.base===run.verb.base)!;assert.ok(first);assert.equal(run.hearts,3);assert.equal(run.challenge.kind,'gate');assert.ok([run.challenge.left,run.challenge.right].includes(first.past));assert.equal('correctLane' in run.challenge,false);assert.equal('verbOrder' in run,false);assert.equal(run.challenge.coinLane,undefined);assert.equal(run.challenge.hazardLane,undefined);
 const choose=(side:'left'|'right')=>{const current=view(messages).run!;now=current.challenge.deadline-100;game.handle(p,{type:'flightChoose',runId:current.id,challengeId:current.challenge.id,side});};
 game.handle(p,{type:'flightChoose',runId:run.id,challengeId:run.challenge.id,side:answer(game,p.id)});assert.equal(view(messages).run?.score,0);
 choose(answer(game,p.id));run=view(messages).run!;assert.equal(run.distance,100);assert.equal(run.score,30);assert.equal(run.stage,'participle');assert.equal(run.speed,flightSpeed(100));assert.equal(run.challenge.startsAt,now);
 assert.ok([run.challenge.left,run.challenge.right].includes(first.participle));
 const stale=run.challenge.id-1;game.community.flightChoose(p,{runId:run.id,challengeId:stale,side:answer(game,p.id)});assert.equal(view(messages).run?.score,30);
 choose(answer(game,p.id));run=view(messages).run!;assert.equal(run.distance,200);assert.equal(run.score,60);assert.notEqual(run.verb.base,first.base);
 const saved=snapshot(game),restored=new Game();restore(restored,saved);assert.equal(restored.community.records.get(p.id)?.flight?.run?.distance,200);
});

test('a flight shuffles all verbs once per cycle and never repeats across the cycle boundary',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const seen:string[]=[];
 for(let i=0;i<FLIGHT_VERBS.length+1;i++){
  let run=view(messages).run!;seen.push(run.verb.base);
  for(let stage=0;stage<2;stage++){run=view(messages).run!;now=run.challenge.deadline;game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:answer(game,p.id)});}
 }
 assert.equal(new Set(seen.slice(0,FLIGHT_VERBS.length)).size,FLIGHT_VERBS.length);
 assert.notEqual(seen.at(-1),seen.at(-2));
});

test('wrong word gate removes one heart and repeats the exact same gate while resetting speed',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const choose=(side:'left'|'right')=>{let run=view(messages).run!;if(!run.hazardResolved){now=run.challenge.deadline-Math.round(flightWindow(run.speed)*.65);game.community.flightHazard(p,{runId:run.id,challengeId:run.challenge.id,side:run.challenge.hazardLane==='left'?'right':'left'});run=view(messages).run!;}now=run.challenge.deadline-100;game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side});};
 let run=view(messages).run!;choose(answer(game,p.id));run=view(messages).run!;assert.equal(run.distance,100);
 game.community.flightPickup(p,{runId:run.id,challengeId:run.challenge.id,side:run.challenge.coinLane});assert.equal(view(messages).run?.coins,0);
 const missed=run.challenge,wrong=answer(game,p.id)==='left'?'right':'left';choose(wrong);run=view(messages).run!;
 assert.equal(run.hearts,2);assert.equal(run.distance,100);assert.equal(run.score,30);assert.equal(run.speed,1);assert.equal(run.stage,'participle');assert.equal(run.challenge.startsAt,now);assert.deepEqual([run.challenge.left,run.challenge.right],[missed.left,missed.right]);
 choose(answer(game,p.id)==='left'?'right':'left');run=view(messages).run!;assert.equal(run.hearts,1);
 now=run.challenge.deadline+FLIGHT_ARRIVAL_GRACE_MS+1;game.community.flightStatus(p);
 assert.equal(view(messages).run,undefined);assert.deepEqual(view(messages).lastResult,{distance:100,score:30,coins:0});assert.equal(view(messages).ranking[0].distance,100);
 game.community.flightStart(p);assert.equal(view(messages).run?.hearts,3);assert.equal(view(messages).bestDistance,100);
});

test('straddling the gap between the two gates causes a collision',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const run=view(messages).run!;now=run.challenge.deadline-Math.round(flightWindow(run.speed)*.65);game.community.flightHazard(p,{runId:run.id,challengeId:run.challenge.id,side:run.challenge.hazardLane==='left'?'right':'left'});now=run.challenge.deadline-100;
 game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:'center'});
 assert.equal(view(messages).run?.hearts,2);assert.equal(view(messages).run?.score,0);
});

test('old coin and obstacle requests cannot grant points or remove hearts',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const saved=game.community.records.get(p.id)!.flight!.run!;saved.challenge.hazardLane='left';saved.challenge.coinLane='right';saved.hazardResolved=false;saved.coinResolved=false;
 game.community.flightStatus(p);const run=view(messages).run!;assert.equal(run.challenge.hazardLane,undefined);assert.equal(run.challenge.coinLane,undefined);
 now=run.challenge.deadline-Math.round(flightWindow(run.speed)*.65);
 game.community.flightHazard(p,{runId:run.id,challengeId:run.challenge.id,side:'left'});
 game.community.flightPickup(p,{runId:run.id,challengeId:run.challenge.id,side:'left'});
 const next=view(messages).run!;assert.equal(next.hearts,3);assert.equal(next.score,0);assert.equal(next.coins,0);assert.equal(next.challenge.id,run.challenge.id);
});

test('a gate without a coin or obstacle can be passed directly',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const saved=game.community.records.get(p.id)!.flight!.run!;saved.challenge.coinLane=undefined;saved.challenge.hazardLane=undefined;saved.coinResolved=true;saved.hazardResolved=true;
 const run=view(messages).run!;now=run.challenge.deadline;
 game.community.flightChoose(p,{runId:run.id,challengeId:run.challenge.id,side:answer(game,p.id)});
 assert.equal(view(messages).run?.score,30);assert.equal(view(messages).run?.hearts,3);
});

test('a saved coin-or-obstacle challenge resumes as a word gate',t=>{
 let now=Date.parse('2026-11-10T11:00:00+09:00');t.mock.method(Date,'now',()=>now);
 const game=new Game(),{player:p,messages}=player(game);game.community.flightStart(p);
 const legacy=game.community.records.get(p.id)!.flight!.run!;legacy.challenge={...legacy.challenge,kind:'approach',left:'코인',right:'장애물'};
 game.community.flightStatus(p);
 const current=view(messages).run!;assert.equal(current.challenge.kind,'gate');assert.ok([current.challenge.left,current.challenge.right].includes(FLIGHT_VERBS.find(verb=>verb.base===current.verb.base)!.past));assert.equal(current.score,0);
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
