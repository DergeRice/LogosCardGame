import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';import {snapshot,restore} from '../server/persistence.js';import {thinkMs} from '../server/ai.js';import {fieldCards} from '../shared/cardViews.js';
const socket:GameSocket={readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}};
function setup(){const g=new Game(),p=g.hello(socket,null,'Human');g.createRoom(p);g.addRoomAI(p);const r=g.rooms.get(p.room!)!;g.reveal(r);g.begin(r);return{g,p,r};}
test('four points credit human score and highest score, consume accepted cards, persist and cannot replay',()=>{
 const {g,p,r}=setup();p.hand=[{id:'p',kind:'pronoun',variant:'pronoun-x2'},{id:'v',kind:'verb'}];p.actionAt=0;
 const request={matchId:r.matchId,requestId:'four',handVersion:p.handVersion,cards:['p','v']};g.action(p,request);g.action(p,request);
 assert.equal(p.judgment?.points,4);assert.equal(p.judgment?.accepted,true);assert.equal(p.score,4);assert.equal(r.highScore,4);assert.equal(p.hand.length,0);assert.equal(fieldCards(p).length,2);assert.equal(r.decision,undefined);assert.doesNotMatch(p.lastAction?.text??'',/미달|미인정/);
 const next=new Game();restore(next,snapshot(g));assert.equal(next.rooms.get(r.code)?.players.find(x=>x.id===p.id)?.score,4);
 p.actionAt=0;g.action(p,{...request,requestId:'replay',handVersion:p.handVersion,fieldVersion:p.fieldVersion});assert.equal(p.score,4);
});
test('AI waits after receiving cards and credits low scores after its thought interval',t=>{
 let now=1800001;t.mock.method(Date,'now',()=>now);const{g,r}=setup(),ai=r.players.find(x=>x.ai)!;ai.hand=[{id:'ai-p',kind:'pronoun',variant:'pronoun-x2'},{id:'ai-v',kind:'verb'}];g.receivedCards(ai);const ready=ai.aiReadyAt!;ai.nextAI=now;if(r.drawVote?.aiApproveAt)r.drawVote.aiApproveAt[ai.id]=now+60000;
 now=ready-1;g.tick();assert.equal(ai.score,0);assert.equal(ai.hand.length,2);now=ready;g.tick();assert.equal(ai.score,4);assert.equal(ai.hand.length,0);assert.equal(ai.judgment?.accepted,true);assert.equal(r.highScore,4);
 assert.ok(thinkMs('hard')>=7000);assert.ok(thinkMs('normal')>=9500);assert.ok(thinkMs('easy')>=12000);
 ai.hand=[{id:'new-p',kind:'pronoun'},{id:'new-v',kind:'verb'}];ai.nextAI=now;now+=1000;g.deal(r,1);assert.ok(ai.aiReadyAt!>=now+thinkMs(ai.ai!));g.tick();assert.equal(ai.score,4);
});
