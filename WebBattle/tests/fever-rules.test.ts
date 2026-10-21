import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Game} from '../server/game.js';
import {matchGold} from '../shared/matchRewards.js';
import {type Card} from '../shared/rules.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}});
const scoringHand=():Card[]=>[
 {id:randomUUID(),kind:'pronoun',variant:'pronoun-x2'},{id:randomUUID(),kind:'verb'},
 {id:randomUUID(),kind:'article',variant:'article-x2'},{id:randomUUID(),kind:'count',variant:'count-plus3'},
 {id:randomUUID(),kind:'adjective',variant:'adjective-plus3'}
];
test('Go benefits belong only to the caller and a new caller halves the prior caller',t=>{
 let now=100000;t.mock.method(Date,'now',()=>now);const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);
 const score=(p:typeof a)=>{p.hand=scoringHand();p.handVersion++;now+=1600;game.action(p,{requestId:randomUUID(),matchId:r.matchId,handVersion:p.handVersion,cards:p.hand.map(c=>c.id)});};
 score(a);assert.equal(a.score,26);game.choice(a,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});assert.equal(r.goCount,1);assert.equal(r.leaderId,a.id);
 score(a);assert.equal(a.judgment?.goBonus,6);assert.equal(a.score,58);game.choice(a,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});assert.equal(r.goCount,2);
 a.score=27;r.highScore=27;b.score=2;score(b);assert.equal(b.score,28);assert.equal(r.decision?.playerId,b.id);game.choice(b,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});
 assert.equal(r.leaderId,b.id);assert.equal(r.goCount,1);assert.equal(a.score,13);assert.equal(a.calledGo,false);assert.equal(b.calledGo,true);
});
test('Go rank points and gold use the winner Go level and final sentence card count',()=>{
 const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);
 a.score=40;b.score=10;r.leaderId=a.id;r.goCount=3;a.lastPlayed=Array.from({length:5},(_,i)=>({id:String(i),kind:'verb'}));game.finish(r,'stop');
 assert.equal(a.reward,750);assert.equal(a.coinBase,220);assert.equal(a.coinReward,3300);assert.equal(b.reward,0);assert.equal(b.coinReward,0);
 assert.deepEqual(matchGold({go:1,finalCards:15,rating:1000,opponents:[1000],score:100,scores:[100],elapsedMs:0}).total,320);
 assert.deepEqual(matchGold({go:2,finalCards:15,rating:1000,opponents:[1000],score:100,scores:[100],elapsedMs:0}).total,1600);
 assert.deepEqual(matchGold({go:3,finalCards:15,rating:1000,opponents:[1000],score:100,scores:[100],elapsedMs:0}).total,4800);
});
