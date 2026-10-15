import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Game} from '../server/game.js';
import {judge,judgeCards,DECK_FACES,cardEffect} from '../shared/rules.js';
import {CheckPlayableSegment,LearningPosType as P} from '../shared/LearningLocalGrammarChecker.js';
import {safeDetails,adminAuthorized} from '../server/audit.js';

test('battle To is a bundled verb only after an object, while original Unity entry stays compatible',()=>{
 for(const s of [['pronoun','verb','pronoun','to-infinitive'],['pronoun','verb','article','count','to-infinitive'],['pronoun','modal','verb','mass','to-infinitive']] as const){const r=judge([...s]);assert.equal(r.valid,true);assert.equal(r.patternType,5);assert.equal(r.usedLength,s.length)}
 assert.equal(judge(['pronoun','verb','to-infinitive']).usedLength,2);
 assert.equal(judge(['pronoun','verb','to-infinitive','verb']).usedLength,2);
 const trailing=judge(['pronoun','verb','pronoun','to-infinitive','verb']);assert.equal(trailing.usedLength,4);assert.equal(trailing.patternType,5);
 assert.equal(judge(['to-infinitive']).valid,false);assert.equal(judge(['to-infinitive','pronoun','verb']).usedStartIndex,1);
 assert.equal(CheckPlayableSegment([P.PRP,P.VB,P.TO_VB,P.VB],false).usedLength,4);
 assert.equal(DECK_FACES.length,71);assert.ok(DECK_FACES.every(c=>cardEffect({...c,id:''}).add!==-2));
 const cards=[{id:'s',kind:'pronoun' as const},{id:'v',kind:'verb' as const},{id:'o',kind:'pronoun' as const},{id:'c',kind:'to-infinitive' as const,variant:'to-infinitive-x2'}];assert.equal(judgeCards(cards).points,8);
});
test('rejected submit resynchronizes and may retry same ID; successful submission remains idempotent',()=>{
 const messages:any[]=[],socket={readyState:1,bufferedAmount:0,send(data:string){messages.push(JSON.parse(data))},close(){},terminate(){}};
 const game=new Game({minimumPlayers:2}),p=game.hello(socket,null,'제출검사');game.quick(p);const r=game.rooms.get(p.room!)!;game.reveal(r);game.begin(r);
 p.hand=[{id:'v',kind:'verb'}];p.handVersion++;
 const request={type:'submit',matchId:r.matchId,requestId:randomUUID(),handVersion:p.handVersion-1,cards:['v']};game.handle(p,request);
 assert.ok(messages.some(m=>m.type==='error'&&m.requestId===request.requestId));assert.equal(messages.at(-1).type,'state');assert.equal(p.seen.has(request.requestId),false);
 request.handVersion=p.handVersion;game.handle(p,request);assert.equal(p.judgment?.usedLength,1);assert.ok(p.seen.has(request.requestId));game.handle(p,request);assert.equal(messages.at(-1).duplicate,true);
 assert.ok(game.audits.some(e=>e.event==='rejected'&&e.requestId===request.requestId));assert.ok(game.audits.some(e=>e.event==='submit_result'&&e.details.valid===true));
});
test('audit payload excludes secrets and full request objects; administrator requires an exact secret',()=>{
 const d=safeDetails({type:'register',password:'never-log-this',authToken:'secret-auth',token:'guest-secret',username:'private',cards:['v'],requestId:'correlation'});assert.equal(JSON.stringify(d).includes('secret'),false);assert.equal('password'in d,false);assert.equal('username'in d,false);
 const secret='secure-test-admin-credential-32characters';assert.equal(adminAuthorized(null,secret),false);assert.equal(adminAuthorized('Bearer wrong',secret),false);assert.equal(adminAuthorized('Bearer '+secret,secret),true);assert.equal(adminAuthorized('Bearer short','short'),false);
});

test('AI can use a bundled To in a scoring fifth-pattern candidate',async t=>{
 t.mock.method(performance,'now',()=>0);
 const {chooseMove}=await import('../server/ai.js');const hand=[{id:'s',kind:'pronoun' as const,variant:'pronoun-x2'},{id:'v',kind:'verb' as const},{id:'o',kind:'mass' as const},{id:'to',kind:'to-infinitive' as const,variant:'to-infinitive-x2'}];const ids=chooseMove(hand,'hard');assert.ok(ids);const result=judgeCards(ids.map(id=>hand.find(c=>c.id===id)!));assert.equal(result.patternType,5);assert.equal(result.usedLength,4);
});

test('removed minus2 faces are removed from restored hands and remaining deck without changing earned score',async()=>{
 const {snapshot,restore}=await import('../server/persistence.js');const socket={readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}};const game=new Game({minimumPlayers:2}),p=game.hello(socket,null,'이전 경기');game.quick(p);const room=game.rooms.get(p.room!)!;game.reveal(room);game.begin(room);p.hand=[{id:'old',kind:'possessive',variant:'possessive-minus2'},{id:'keep',kind:'verb'}];p.score=26;p.draftIds=['old','keep'];room.deck=[{id:'old-deck',kind:'indefinite',variant:'indefinite-minus2'},{id:'new',kind:'verb'}];const next=new Game();const players=restore(next,snapshot(game));assert.deepEqual(players.get(p.id)!.hand.map(c=>c.id),['keep']);assert.equal(players.get(p.id)!.score,26);assert.deepEqual(next.rooms.get(room.code)!.deck.map(c=>c.id),['new']);
});

test('audit redacts opaque credentials before truncation to avoid partial secret leakage',()=>{
 const secret='b'.repeat(64);const safe=safeDetails({reason:'x'.repeat(190)+secret});assert.equal(JSON.stringify(safe).includes('b'.repeat(10)),false);
});
