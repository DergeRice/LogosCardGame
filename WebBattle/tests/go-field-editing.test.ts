import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Game} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';
import type {Card} from '../shared/rules.js';
import {fieldCards} from '../shared/cardViews.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(_raw:string){},close(){},terminate(){}});
const cards=():Card[]=>[{id:randomUUID(),kind:'pronoun',variant:'pronoun-x2'},{id:randomUUID(),kind:'verb'},{id:randomUUID(),kind:'article',variant:'article-x2'},{id:randomUUID(),kind:'count',variant:'count-plus3'},{id:randomUUID(),kind:'adjective',variant:'adjective-plus3'}];
function fixture(){const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);a.hand=cards();a.handVersion++;return{game,a,b,r};}
test('controlled Go fixture: scored field can be reordered, submitted and returned, without repeated credit',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);const{game,a,r}=fixture(),ids=a.hand.map(c=>c.id);
 const submit=(order=ids)=>{now+=1600;game.action(a,{requestId:randomUUID(),matchId:r.matchId,handVersion:a.handVersion,fieldVersion:a.fieldVersion,cards:order});};
 submit();assert.equal(a.score,26);game.choice(a,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});
 game.syncDraft(a,{matchId:r.matchId,handVersion:a.handVersion,cards:ids});assert.deepEqual(a.draftIds,ids);
 submit();assert.equal(a.score,26);assert.equal(r.decision,undefined); // Unchanged field cannot farm Go bonuses.
 r.leaderId=undefined; // Isolate anti-replay from a further Go benefit, not a normal-play score validation.
 const before=a.score;submit();assert.equal(a.judgment!.valid,true);assert.equal(a.score,before);
 const recall={requestId:'recall',matchId:r.matchId,handVersion:a.handVersion,fieldVersion:a.fieldVersion,cards:[ids[0]]};game.recallCards(a,recall);game.recallCards(a,recall);
 assert.equal(a.hand.filter(c=>c.id===ids[0]).length,1);assert.ok(!fieldCards(a).some(c=>c.id===ids[0]));assert.ok(!r.discard.some(c=>c.id===ids[0]));assert.equal(a.score,before);
 const stored=snapshot(game),restored=new Game();restore(restored,stored);assert.deepEqual(restored.sessions.get(a.token)!.scoreClaims,a.scoreClaims);
});
test('controlled fixture: returned scored cards are eligible exchange offers and repeated full sentence still earns no credit',t=>{
 let now=1e6;t.mock.method(Date,'now',()=>now);const{game,a,b,r}=fixture(),ids=a.hand.map(c=>c.id);
 game.action(a,{requestId:'score',matchId:r.matchId,handVersion:a.handVersion,cards:ids});game.choice(a,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});now+=1600;
 const exchange:Card={id:randomUUID(),kind:'exchange'};a.hand.push(exchange);b.hand=[{id:randomUUID(),kind:'mass'}];a.handVersion++;b.handVersion++;
 game.special(a,{requestId:'swap',matchId:r.matchId,handVersion:a.handVersion,cardId:exchange.id,targetId:b.id,targetHandVersion:b.handVersion,targetFieldVersion:b.fieldVersion,offerId:ids[0],wantedId:b.hand[0].id});
 assert.ok(r.exchange,'scored field is a valid exchange offer');game.tick();assert.ok(r.exchange,'timer must preserve a field-card offer');game.handle(b,{type:'exchangeReply',matchId:r.matchId,exchangeId:r.exchange!.id,accept:true});assert.ok(b.hand.some(c=>c.id===ids[0]));assert.ok(!fieldCards(a).some(c=>c.id===ids[0]));
});
test('recall rejects foreign IDs, stale field versions and Go decision waiting',()=>{
 const{game,a,b,r}=fixture();const msg={requestId:'foreign',matchId:r.matchId,handVersion:a.handVersion,fieldVersion:a.fieldVersion,cards:[b.hand[0]?.id??'no-card']};const hand=[...a.hand];game.recallCards(a,msg);assert.deepEqual(a.hand,hand);
 game.action(a,{requestId:'score',matchId:r.matchId,handVersion:a.handVersion,cards:a.hand.map(c=>c.id)});const id=fieldCards(a)[0].id;game.recallCards(a,{...msg,requestId:'waiting',handVersion:a.handVersion,fieldVersion:a.fieldVersion,cards:[id]});assert.ok(fieldCards(a).some(c=>c.id===id));
 game.choice(a,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});game.recallCards(a,{...msg,requestId:'stale',handVersion:a.handVersion,fieldVersion:-1,cards:[id]});assert.ok(fieldCards(a).some(c=>c.id===id));
});
