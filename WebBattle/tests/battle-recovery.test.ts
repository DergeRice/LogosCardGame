import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore,nextDeadline} from '../server/persistence.js';
import {aiGoChoice,aiStopChance} from '../server/aiStrategy.js';
import {scoreChimeDelays} from '../src/gameSfx.js';
const socket=()=>({readyState:1,bufferedAmount:0,messages:[] as any[],send(raw:string){this.messages.push(JSON.parse(raw))},close(){},terminate(){}});
function fixture(){const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.deal(r,5);game.begin(r);return{game,a,b,r}}
test('exhaustion supplies are server validated, shared across five choices, idempotent and persisted',t=>{
 let now=100000;t.mock.method(Date,'now',()=>now);const{game,a,b,r}=fixture(),before=a.hand.length;
 game.claimBasic(a,{matchId:r.matchId,requestId:'early',kind:'pronoun'});assert.equal(a.hand.length,before);r.deck=[];
 game.claimBasic(a,{matchId:r.matchId,requestId:'bad',kind:'rob'});assert.equal(a.hand.length,before);
 const msg={matchId:r.matchId,requestId:'basic',kind:'pronoun'};game.claimBasic(a,msg);const id=a.hand.at(-1)!.id;assert.equal(a.hand.length,before+1);assert.equal(a.basicSupplyAt,now+30000);assert.equal(a.score,0);game.claimBasic(a,msg);assert.equal(a.hand.length,before+1);
 for(const kind of ['count','verb','indefinite','article'])game.claimBasic(a,{matchId:r.matchId,requestId:'blocked-'+kind,kind});assert.equal(a.hand.length,before+1);
 game.claimBasic(b,{matchId:r.matchId,requestId:'other-player',kind:'verb'});assert.equal(b.hand.length,before+1);assert.notEqual(b.hand.at(-1)!.id,id);
 const fresh=new Game({minimumPlayers:2});restore(fresh,snapshot(game));const saved=fresh.sessions.get(a.token)!;assert.equal(saved.basicSupplyAt,now+30000);
 now+=30000;fresh.claimBasic(saved,{matchId:r.matchId,requestId:'next',kind:'article'});assert.equal(saved.hand.length,before+2);
 const savedRoom=fresh.rooms.get(r.code)!;savedRoom.phase='result';fresh.claimBasic(saved,{matchId:r.matchId,requestId:'after',kind:'article'});assert.equal(saved.hand.length,before+2);
});
test('human and AI third Go waits for another score without manufactured points; second Go continues',()=>{
 for(const ai of [false,true]){const{game,a,b,r}=fixture();if(ai)a.ai='normal';a.score=55;b.score=40;r.highScore=55;r.leaderId=a.id;r.goCount=1;r.decision={id:'two',playerId:a.id,startedAt:Date.now(),expiresAt:0};
  game.choice(a,{matchId:r.matchId,decisionId:'two',choice:'go'});assert.equal(r.phase,'battle');assert.equal(r.goCount,2);
  a.score=81;r.highScore=81;r.decision={id:'three',playerId:a.id,startedAt:Date.now(),expiresAt:0};game.choice(a,{matchId:r.matchId,decisionId:'three',choice:'go'});assert.equal(r.phase,'battle');assert.equal(a.score,81);game.tick();assert.equal(r.phase,'battle');game.finish(r,'stop');assert.equal(r.winner,a.id);assert.equal(a.reward,300);assert.equal(b.reward,0);const points=a.points;game.tick();assert.equal(a.points,points);
 }
});
test('restored battle at three Go reconciles and result state is resent on heartbeat',()=>{
 const{game,a,b,r}=fixture();a.score=30;b.score=60;r.goCount=3;r.rulesVersion=undefined;r.decision=undefined;const fresh=new Game({minimumPlayers:2});restore(fresh,snapshot(game));assert.ok(nextDeadline(fresh)!<=Date.now()+60);fresh.tick();const room=fresh.rooms.get(r.code)!;assert.equal(room.phase,'result');assert.equal(room.winner,b.id);assert.equal(room.players.find(p=>p.id===b.id)!.score,60);
 const peer=socket(),p=fresh.hello(peer,a.token,'ignored'),points=p.points;peer.messages=[];fresh.handle(p,{type:'ping'});assert.equal(peer.messages.find(m=>m.type==='state')?.room.phase,'result');assert.equal(p.points,points);
});
test('AI stop probability uses integer percent and reacts to lead, hand and exhausted deck',()=>{
 const state={score:40,rivals:[25],handCount:5,deckAvailable:true,goCount:0,difficulty:'normal' as const};assert.equal(aiStopChance(state),30);assert.equal(Array.from({length:100},(_,roll)=>aiGoChoice(state,roll)).filter(x=>x==='stop').length,30);assert.equal(aiStopChance({...state,goCount:1}),48);assert.ok(aiStopChance({...state,handCount:0,deckAvailable:false})>30);assert.equal(aiGoChoice({...state,goCount:2},0),'go');
});
test('score sounds follow every score beat and never catch up by replaying old beats',()=>{
 assert.deepEqual(scoreChimeDelays(1000,900,3,1000),[.3,.6,.9]);assert.deepEqual(scoreChimeDelays(1000,900,3,1500),[.1,.4]);assert.deepEqual(scoreChimeDelays(1000,900,3,3000),[]);
});
