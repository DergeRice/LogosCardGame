import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';import {snapshot} from '../server/persistence.js';import {judgeCards,type Card,RULES} from '../shared/rules.js';
const socket=(messages:any[]=[]):GameSocket=>({readyState:1,bufferedAmount:0,send(raw){messages.push(JSON.parse(raw))},close(){},terminate(){}});
test('human low score is public without awarding or consuming cards; exactly20 still scores',()=>{
 const g=new Game(),p=g.hello(socket(),null,'Human');g.createRoom(p);g.addRoomAI(p);const r=g.rooms.get(p.room!)!;g.reveal(r);g.begin(r);
 p.hand=[{id:'p',kind:'pronoun'},{id:'v',kind:'verb'}];p.actionAt=0;
 g.action(p,{matchId:r.matchId,requestId:'low-human',handVersion:p.handVersion,cards:['p','v']});
 assert.equal(p.judgment?.points,2);assert.equal(p.judgment?.accepted,false);assert.equal(p.score,0);assert.equal(p.hand.length,2);
 assert.equal(g.view(r,p).players.find(x=>x.id===p.id)?.lastAction?.text,'문장 2점 · 기준 미달');
 p.hand=[{id:'p20',kind:'pronoun',variant:'pronoun-x2'},{id:'v20',kind:'verb'},{id:'a20',kind:'article',variant:'article-x2'},{id:'n20',kind:'count'},{id:'adj20',kind:'adjective'}] as Card[];p.actionAt=0;
 assert.equal(judgeCards(p.hand).points,20);assert.equal(RULES.goThreshold,20);
 g.action(p,{matchId:r.matchId,requestId:'exactly20',handVersion:p.handVersion,cards:p.hand.map(c=>c.id)});
 assert.equal(p.judgment?.accepted,true);assert.equal(p.score,20);assert.match(p.lastAction!.text,/\+20점/);
});
test('AI low candidate is visible once without durable writes, point credit or hand mutation',t=>{
 let now=1800001;t.mock.method(Date,'now',()=>now);const messages:any[]=[],g=new Game(),p=g.hello(socket(messages),null,'Observer');g.createRoom(p);g.addRoomAI(p);const r=g.rooms.get(p.room!)!;g.reveal(r);g.begin(r);
 const ai=r.players.find(x=>x.ai)!;ai.hand=[{id:'ai-p',kind:'pronoun'},{id:'ai-v',kind:'verb'}];ai.nextAI=now;if(r.drawVote?.aiApproveAt)r.drawVote.aiApproveAt[ai.id]=now+60000;
 const durable=snapshot(g),hand=structuredClone(ai.hand),before=messages.length;
 g.tick();assert.equal(ai.lastAction?.text,'문장 2점 · 기준 미달');assert.equal(ai.score,0);assert.deepEqual(ai.hand,hand);assert.deepEqual(snapshot(g),durable);assert.ok(messages.length>before);
 const action=ai.lastAction!.id,count=messages.length;now+=7000;g.tick();assert.equal(ai.lastAction!.id,action);assert.equal(messages.length,count);assert.deepEqual(snapshot(g),durable);
 const valid=judgeCards(hand);assert.equal(g.showLowScore(ai,{...valid,points:0}),true);assert.equal(ai.lastAction?.text,'문장 0점 · 기준 미달');assert.equal(g.showLowScore(ai,{...valid,points:20}),false);assert.equal(g.showLowScore(ai,{...valid,valid:false}),false);
});
