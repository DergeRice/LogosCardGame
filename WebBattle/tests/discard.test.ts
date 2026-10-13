import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {Game,type GameSocket} from '../server/game.js';import {fieldCards} from '../shared/cardViews.js';
import {snapshot,restore} from '../server/persistence.js';
function setup(){const events:any[]=[];const socket={readyState:1,bufferedAmount:0,send(raw:string){events.push(JSON.parse(raw))},close(){},terminate(){}} as GameSocket;const game=new Game({minimumPlayers:2});const a=game.hello(socket,null,'A'),b=game.hello({...socket},null,'B');game.quick(a);game.quick(b);const room=game.rooms.get(a.room!)!;game.reveal(room);game.deal(room,5);game.begin(room);return{game,a,b,room,events};}
test('owned draft/hand discard is authoritative, deduplicated, non-scoring and persists without recycling',()=>{
 const{game,a,b,room}=setup(),card=a.hand[0],before=a.hand.length,deck=room.deck.length;a.draftIds=[card.id];
 const msg={matchId:room.matchId,cardId:card.id,requestId:randomUUID(),handVersion:a.handVersion};game.handle(a,{type:'discard',...msg});game.handle(a,{type:'discard',...msg});assert.equal(a.hand.length,before-1);assert.deepEqual(a.draftIds,[]);assert.equal(a.score,0);assert.equal(room.deck.length,deck);assert.equal(room.discard.filter(c=>c.id===card.id).length,1);
 const restored=new Game();restore(restored,snapshot(game));const r=restored.rooms.get(room.code)!;assert.ok(r.discard.some(c=>c.id===card.id));assert.ok(!r.players.some(p=>p.hand.some(c=>c.id===card.id)));
 a.actionAt=0;const count=a.hand.length;game.discardCard(a,{...msg,requestId:randomUUID(),cardId:b.hand[0].id,handVersion:a.handVersion});assert.equal(a.hand.length,count);game.discardCard(a,{...msg,requestId:randomUUID(),cardId:a.hand[0].id});assert.equal(a.hand.length,count);
});
test('committed field discard removes ownership once, keeps earned score and cancels a matching exchange',()=>{
 const{game,a,b,room}=setup(),card=a.hand.shift()!;a.lastPlayed=[card];a.playedSentences=[[card]];room.discard.push(card);a.score=26;room.exchange={id:'ex',fromId:a.id,toId:b.id,offerId:card.id,wantedId:b.hand[0].id,expiresAt:Date.now()+10000};
 const msg={matchId:room.matchId,cardId:card.id,requestId:randomUUID(),handVersion:a.handVersion,fieldVersion:a.fieldVersion};game.discardCard(a,msg);game.discardCard(a,msg);assert.equal(fieldCards(a).length,0);assert.equal(a.score,26);assert.equal(room.discard.filter(c=>c.id===card.id).length,1);assert.equal(room.exchange,undefined);
});
test('discard is rejected during a decision, in stale matches and during cooldown; special cards can be discarded',()=>{
 const{game,a,room}=setup();a.hand=[{id:'protect-card',kind:'protect'}];const msg={matchId:room.matchId,cardId:'protect-card',requestId:randomUUID(),handVersion:a.handVersion};
 room.decision={id:'d',playerId:a.id,startedAt:Date.now(),expiresAt:0};game.discardCard(a,msg);assert.equal(a.hand.length,1);room.decision=undefined;a.actionAt=Date.now()+1000;game.discardCard(a,msg);assert.equal(a.hand.length,1);a.actionAt=0;game.discardCard(a,{...msg,matchId:'old'});assert.equal(a.hand.length,1);game.discardCard(a,msg);assert.equal(a.hand.length,0);
});
