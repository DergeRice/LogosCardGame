import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore,nextDeadline} from '../server/persistence.js';
import {judgeCards,type Kind} from '../shared/rules.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}} as GameSocket);
test('frequency in ordinary verb, Be and auxiliary positions counts fully and produces aligned words',()=>{
 for(const kinds of [['pronoun','frequency','verb'],['pronoun','frequency','verb','mass'],['pronoun','be','frequency','adjective'],['pronoun','frequency','be','adjective'],['pronoun','modal','frequency','verb'],['pronoun','do','not','frequency','verb'],['pronoun','verb','frequency']] as Kind[][]){const cards=kinds.map((kind,i)=>({kind,id:String(i)})),j=judgeCards(cards);assert.equal(j.valid,true,kinds.join(' '));assert.equal(j.usedLength,cards.length,kinds.join(' '));assert.deepEqual(cardSentenceExample(cards,j).example?.parts.map(p=>p.kind),kinds);}
});
test('only a Go caller earns double reward; others keep base score and rating changes are not globally multiplied',()=>{
 const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);a.score=40;b.score=30;r.goCount=2;a.calledGo=true;
 game.finish(r,'Stop');assert.equal(a.reward,600);assert.equal(b.reward,0);assert.equal(a.score,40);assert.equal(b.score,30);assert.equal(a.ratingDelta,12);assert.equal(b.ratingDelta,-12);assert.equal(game.view(r,a).multiplier,1);const points=a.points;game.finish(r,'duplicate');assert.equal(a.points,points);
});
test('AI approvals happen at separate persisted deadlines and unanimous consent distributes once',t=>{
 let now=100000;t.mock.method(Date,'now',()=>now);const game=new Game(),a=game.hello(socket(),null,'A');game.quick(a);const r=game.rooms.get(a.room!)!;game.reveal(r);game.deal(r,5);game.begin(r);r.players.filter(p=>p.ai).forEach((p,i)=>{p.nextAI=now+60000;r.drawVote!.aiApproveAt![p.id]=now+(i+1)*2000});const voteId=r.drawVote!.id,deck=r.deck.length;
 assert.equal(r.drawVote!.approved.length,0);game.drawVote(a,{matchId:r.matchId,voteId,approve:true});assert.equal(nextDeadline(game),now+2000);now+=2000;game.tick();assert.equal(r.drawVote!.approved.length,2);assert.equal(r.deck.length,deck);
 const fresh=new Game();restore(fresh,snapshot(game));assert.deepEqual(fresh.rooms.get(r.code)!.drawVote,r.drawVote);
 now+=2000;game.tick();assert.equal(r.drawVote!.approved.length,3);now+=2000;game.tick();assert.equal(r.deck.length,deck-4);assert.notEqual(r.drawVote!.id,voteId);game.tick();assert.equal(r.deck.length,deck-4);
});
