import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {WebSocket} from 'ws';
import {Game} from '../server/game.js';

const socket=()=>({readyState:1,bufferedAmount:0,send(){}} as unknown as WebSocket);

test('super account GO button grants an immediate first hit choice once per match',()=>{
 const game=new Game({minimumPlayers:2}),owner=game.hello(socket(),null,'Super'),other=game.hello(socket(),null,'Other');
 game.community.record(owner).superUser=true;
 game.quick(owner);game.quick(other);const room=game.rooms.get(owner.room!)!;game.reveal(room);game.begin(room);
 const decision=()=>room.decision as {id:string;playerId:string}|undefined;
 game.superGo(other,{matchId:room.matchId});assert.equal(room.decision,undefined);
 game.superGo(owner,{matchId:room.matchId});assert.equal(owner.score,0);assert.equal(owner.goHits,1);assert.equal(owner.debugGoUsed,true);assert.equal(room.goCount,1);assert.equal(room.goTarget,undefined);assert.equal(decision()?.playerId,owner.id);
 game.superGo(owner,{matchId:room.matchId});assert.equal(decision()?.playerId,owner.id);
 game.choice(owner,{matchId:room.matchId,decisionId:decision()!.id,choice:'go'});assert.equal(room.goTarget,2);assert.equal(owner.calledGo,true);
 other.score=40;game.finish(room,'debug winner');assert.equal(room.winner,owner.id);assert.ok(owner.reward>0);assert.equal(other.reward,0);
 game.resetPlayer(owner);assert.equal(owner.debugGoUsed,false);
});
