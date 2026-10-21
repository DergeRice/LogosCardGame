import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore,nextDeadline} from '../server/persistence.js';
import {aiGoChoice,aiStopChance} from '../server/aiStrategy.js';
import {scoreChimeDelays} from '../src/gameSfx.js';
const socket=()=>({readyState:1,bufferedAmount:0,messages:[] as any[],send(raw:string){this.messages.push(JSON.parse(raw))},close(){},terminate(){}});
function fixture(){const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.deal(r,5);game.begin(r);return{game,a,b,r}}
test('each player selects exactly one rescue card per match, including preposition and restart',t=>{
 let now=100000;t.mock.method(Date,'now',()=>now);const{game,a,b,r}=fixture(),before=a.hand.length;
 const msg={type:'claimBasic',matchId:r.matchId,requestId:'rescue-once',kind:'preposition'};
 game.handle(a,msg);assert.equal(a.hand.length,before);r.deck=[];game.handle(a,msg);assert.equal(a.hand.length,before+1);assert.equal(a.hand.at(-1)!.kind,'preposition');assert.equal(a.basicSupplyUsed,true);game.handle(a,msg);assert.equal(a.hand.length,before+1);
 now+=300000;game.claimBasic(a,{...msg,requestId:'new-id',kind:'verb'});assert.equal(a.hand.length,before+1);
 const fresh=new Game({minimumPlayers:2});restore(fresh,snapshot(game));const saved=fresh.sessions.get(a.token)!;fresh.claimBasic(saved,{...msg,requestId:'restart',kind:'pronoun'});assert.equal(saved.hand.length,before+1);assert.equal(fresh.view(fresh.rooms.get(r.code)!,saved).basicSupplyUsed,true);
 // Legacy records that already received a supply are counted as spent too.
 b.basicSupplyAt=123;b.basicSupplyUsed=undefined;game.claimBasic(b,{...msg,requestId:'legacy'});assert.equal(b.hand.length,before);
 game.resetPlayer(a);assert.equal(a.basicSupplyUsed,false);assert.equal(a.basicSupplyAt,0);
});

test('AI receives at most one rescue card after exhaustion',t=>{
 let now=100000;t.mock.method(Date,'now',()=>now);const{game,b,r}=fixture();r.deck=[];b.ai='normal';b.hand=[];b.nextAI=now;for(let i=0;i<60;i++){now+=1000;game.tick();}assert.equal(b.basicSupplyUsed,true);assert.equal(b.hand.length,1);
});

test('losses increase 50 percent, score 10 activates a half-loss shield, and settlement is idempotent',()=>{
 for(const score of [0,9,10,11]){const{game,a,b,r}=fixture();game.community.record(a).rankGames=3;game.community.record(b).rankGames=3;a.score=score;b.score=50;game.finish(r,'fixture');assert.equal(a.ratingDelta,score>=10?-9:-18);assert.equal(a.ratingShield,score>=10);assert.equal(b.ratingDelta,12);const saved=a.rating;game.finish(r,'duplicate');assert.equal(a.rating,saved);const fresh=new Game();restore(fresh,snapshot(game));assert.equal(fresh.sessions.get(a.token)!.ratingShield,score>=10);}
 const{game,a,b,r}=fixture();a.score=10;b.score=20;game.finish(r,'placement');assert.equal(a.ratingDelta,0);assert.equal(a.ratingShield,false);
});

test('human and AI third Go waits for another score without manufactured points; second Go continues',()=>{
 for(const ai of [false,true]){const{game,a,b,r}=fixture();if(ai)a.ai='normal';a.score=55;b.score=40;r.highScore=55;r.leaderId=a.id;r.goCount=1;r.decision={id:'two',playerId:a.id,startedAt:Date.now(),expiresAt:0};
  game.choice(a,{matchId:r.matchId,decisionId:'two',choice:'go'});assert.equal(r.phase,'battle');assert.equal(r.goCount,1);assert.equal(r.goTarget,2);
  a.score=81;r.highScore=81;r.goCount=2;a.goHits=2;r.decision={id:'three',playerId:a.id,startedAt:Date.now(),expiresAt:0};game.choice(a,{matchId:r.matchId,decisionId:'three',choice:'go'});assert.equal(r.phase,'battle');assert.equal(a.score,81);game.tick();assert.equal(r.phase,'battle');game.finish(r,'stop');assert.equal(r.winner,a.id);assert.equal(a.reward,750);assert.equal(b.reward,0);const points=a.points;game.tick();assert.equal(a.points,points);
 }
});
test('restored battle at three Go remains playable and result state is resent on heartbeat',()=>{
 const{game,a,b,r}=fixture();a.score=30;b.score=60;r.goCount=3;r.leaderId=b.id;r.decision=undefined;const fresh=new Game({minimumPlayers:2});restore(fresh,snapshot(game));const room=fresh.rooms.get(r.code)!;fresh.tick();assert.equal(room.phase,'battle');
 fresh.finish(room,'manual');const peer=socket(),p=fresh.hello(peer,a.token,'ignored'),points=p.points;peer.messages=[];fresh.handle(p,{type:'ping'});assert.equal(peer.messages.find(m=>m.type==='state')?.room.phase,'result');assert.equal(p.points,points);
});
test('AI stop probability uses integer percent and reacts to lead, hand and exhausted deck',()=>{
 const state={score:40,rivals:[25],handCount:5,deckAvailable:true,goCount:0,difficulty:'normal' as const};assert.equal(aiStopChance(state),30);assert.equal(Array.from({length:100},(_,roll)=>aiGoChoice(state,roll)).filter(x=>x==='stop').length,30);assert.equal(aiStopChance({...state,goCount:1}),30);assert.equal(aiStopChance({...state,goCount:2}),48);assert.equal(aiGoChoice({...state,goCount:3},99),'stop');assert.ok(aiStopChance({...state,handCount:0,deckAvailable:false})>30);assert.equal(aiGoChoice({...state,goCount:2},0),'go');
});
test('score sounds follow every score beat and never catch up by replaying old beats',()=>{
 assert.deepEqual(scoreChimeDelays(1000,900,3,1000),[.3,.6,.9]);assert.deepEqual(scoreChimeDelays(1000,900,3,1500),[.1,.4]);assert.deepEqual(scoreChimeDelays(1000,900,3,3000),[]);
});
