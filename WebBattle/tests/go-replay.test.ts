import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../server/game.js';
import {judgeCards,type Card} from '../shared/rules.js';
import {fieldCards} from '../shared/cardViews.js';
import {scoreSteps} from '../src/scoreAnimation.js';
import {snapshot,restore} from '../server/persistence.js';
test('controlled Go regression: unchanged replay is rejected, raw improvement required, 3Go preserves full calculation',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);const messages:any[]=[];const socket={readyState:1,bufferedAmount:0,send(raw:string){messages.push(JSON.parse(raw))},close(){},terminate(){}};
 const g=new Game({minimumPlayers:2}),a=g.hello(socket,null,'A'),b=g.hello({...socket,send(){}},null,'B');g.quick(a);g.quick(b);const r=g.rooms.get(a.room!)!;g.reveal(r);g.begin(r);
 const cards:Card[]=[{id:'s',kind:'pronoun',variant:'pronoun-x2'},{id:'v',kind:'verb'},{id:'dt',kind:'article',variant:'article-x2'},{id:'o',kind:'count',variant:'count-plus3'},{id:'c',kind:'adjective',variant:'adjective-plus3'}];a.hand=cards.slice();a.handVersion++;
 const submit=(cs:Card[])=>{now+=1600;g.action(a,{requestId:`r${now}`,matchId:r.matchId,handVersion:a.handVersion,fieldVersion:a.fieldVersion,cards:cs.map(c=>c.id)})};
 const go=()=>g.choice(a,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});
 submit(cards);assert.equal(a.score,26);go();submit(cards);assert.equal(a.score,26);assert.equal(r.decision,undefined);assert.match(messages.filter(m=>m.type==='error').at(-1).message,/이미 제출/);
 // Change only order: base value cannot improve; bonus alone must not score or open another Go.
 const sameBase=[...cards.slice(0,3),cards[4],cards[3]];assert.equal(judgeCards(sameBase).points,26);submit(sameBase);assert.equal(a.score,26);assert.equal(a.judgment!.accepted,false);assert.equal(a.judgment!.points,32);assert.equal(a.judgment!.awardedPoints,0);assert.equal(r.decision,undefined);
 const add=(c:Card,index=cards.length)=>{a.hand.push(c);a.handVersion++;cards.splice(index,0,c);submit(cards)};
 add({id:'rb1',kind:'adverb'});assert.equal(a.baseScore,30);assert.equal(a.score,36);assert.equal(a.judgment!.awardedPoints,10);assert.equal(r.decision,undefined);assert.equal(a.goHits,1);
 add({id:'rb2',kind:'adverb'});assert.equal(a.baseScore,34);assert.equal(a.score,40);assert.equal(r.decision,undefined);assert.equal(a.goHits,1);
 // Isolate the existing full 3GO calculation from the new effective-hit progression.
 r.goTarget=3;
 add({id:'jj2',kind:'adjective'},4);assert.equal(judgeCards(cards).points,38);assert.equal(a.judgment!.points,76);assert.equal(a.judgment!.awardedPoints,36);assert.equal(a.score,76);const steps=scoreSteps(cards,a.judgment!);assert.ok(steps.length>cards.length);assert.equal(steps.at(-1)!.value,76);assert.equal(steps.at(-1)!.kind,'go');assert.equal(fieldCards(a).length,cards.length);assert.equal(r.goCount,2);go();
 const fresh=new Game();restore(fresh,snapshot(g));const restored=fresh.sessions.get(a.token)!;assert.deepEqual(restored.submittedSequences,a.submittedSequences);assert.equal(restored.baseScore,38);const before=a.score;submit(cards);assert.equal(a.score,before);assert.match(messages.filter(m=>m.type==='error').at(-1).message,/이미 제출/);
});

