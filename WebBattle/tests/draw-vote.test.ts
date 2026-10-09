import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Game,type GameSocket} from '../server/game.js';
import type {Card} from '../shared/rules.js';

const socket=()=>({readyState:1,bufferedAmount:0,messages:[] as any[],send(data:string){this.messages.push(JSON.parse(data));},close(){},terminate(){}});
function roomForTwo(){const game=new Game({minimumPlayers:2}),sa=socket(),sb=socket(),a=game.hello(sa,null,'A'),b=game.hello(sb,null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.deal(r,5);game.begin(r);return{game,sa,sb,a,b,r};}
const fixture=():Card[]=>[
 {id:randomUUID(),kind:'pronoun',variant:'pronoun-x2'},
 {id:randomUUID(),kind:'verb'},
 {id:randomUUID(),kind:'article',variant:'article-x2'},
 {id:randomUUID(),kind:'count',variant:'count-plus3'},
 {id:randomUUID(),kind:'adjective',variant:'adjective-plus3'}
];
test('30-second automatic deal is accelerated only by unanimous consent; no rejection or duplicate deal',t=>{
 let now=100_000;t.mock.method(Date,'now',()=>now);const{game,sa,a,b,r}=roomForTwo();const initial=r.deck.length,voteId=r.drawVote!.id;
 assert.equal(r.nextDealAt,now+30000);assert.deepEqual(r.drawVote!.approved,[]);game.tick();assert.equal(r.deck.length,initial);
 game.drawVote(a,{matchId:r.matchId,voteId,approve:true});assert.deepEqual(r.drawVote!.approved,[a.id]);assert.equal(r.deck.length,initial);
 game.drawVote(a,{matchId:r.matchId,voteId,approve:true});assert.equal(sa.messages.at(-1)?.duplicate,true);assert.equal(r.deck.length,initial);
 game.drawVote(b,{matchId:r.matchId,voteId,approve:false});assert.match((b.socket as ReturnType<typeof socket>).messages.at(-1)?.message,/동의만/);assert.equal(r.deck.length,initial);
 game.disconnected(b,b.socket!);assert.deepEqual(r.drawVote!.approved,[a.id]);b.socket=socket() as GameSocket;b.disconnectedAt=undefined;
 game.drawVote(b,{matchId:r.matchId,voteId,approve:true});assert.equal(r.deck.length,initial-2);assert.equal(a.hand.length,6);assert.equal(b.hand.length,6);assert.notEqual(r.drawVote?.id,voteId);assert.deepEqual(r.drawVote?.approved,[]);
 game.drawVote(b,{matchId:r.matchId,voteId,approve:true});assert.equal(r.deck.length,initial-2);
 now+=30000;game.tick();assert.equal(r.deck.length,initial-4);assert.equal(a.hand.length,7);assert.equal(b.hand.length,7);
});
test('after Go only current leader can deal; new high score transfers deal and decision authority',t=>{
 let now=100_000;t.mock.method(Date,'now',()=>now);const{game,sa,sb,a,b,r}=roomForTwo();
 const score=(p:typeof a)=>{p.hand=fixture();p.handVersion++;now+=1600;game.action(p,{matchId:r.matchId,requestId:randomUUID(),handVersion:p.handVersion,cards:p.hand.map(c=>c.id)});};
 score(a);assert.equal(a.score,26);assert.equal(r.leaderId,a.id);assert.equal(r.decision?.playerId,a.id);
 game.choice(a,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});assert.equal(r.goCount,1);
 const start=r.deck.length;game.drawRequest(b,{matchId:r.matchId,requestId:randomUUID()});assert.equal(r.deck.length,start);assert.match(sb.messages.at(-1)?.message,/최고점/);
 game.drawRequest(a,{matchId:r.matchId,requestId:randomUUID()});assert.equal(r.deck.length,start-2);assert.ok(r.drawVote);
 score(b);assert.ok(b.score>a.score);assert.equal(r.leaderId,b.id);assert.equal(r.decision?.playerId,b.id);
 game.choice(b,{matchId:r.matchId,decisionId:r.decision!.id,choice:'go'});now+=3100;const before=r.deck.length;
 game.drawRequest(a,{matchId:r.matchId,requestId:randomUUID()});assert.equal(r.deck.length,before);
 game.drawRequest(b,{matchId:r.matchId,requestId:randomUUID()});assert.equal(r.deck.length,before-2);assert.equal(r.goCount,2);assert.ok(sa.messages.some(m=>m.type==='state'&&m.room.leaderId===b.id));
});
test('only four emoji reactions are broadcast and rapid repeats are rejected',()=>{
 const{game,sa,sb,a,b,r}=roomForTwo();game.react(a,{matchId:r.matchId,emoji:'🔥'});assert.equal(sb.messages.at(-1)?.room.players.find((p:any)=>p.id===a.id).reaction.emoji,'🔥');game.react(a,{matchId:r.matchId,emoji:'💯'});assert.match(sa.messages.at(-1)?.message,/사용할 수 없는/);game.react(a,{matchId:r.matchId,emoji:'👏'});assert.match(sa.messages.at(-1)?.message,/잠시 후/);assert.equal(b.reaction,undefined);
});
test('opponent field preview follows validated draft order and excludes those cards from hand preview',()=>{
 const {game,a,b,r}=roomForTwo();
 a.hand=fixture();a.handVersion++;
 const cards=a.hand.filter(c=>!['get2','get3','rob','exchange','protect'].includes(c.kind));
 assert.ok(cards.length>=2);
 const ids=[cards[1].id,cards[0].id];
 game.syncDraft(a,{matchId:r.matchId,handVersion:a.handVersion,cards:ids});
 let publicA=game.view(r,b).players.find(p=>p.id===a.id)!;
 assert.deepEqual(publicA.draftPreview?.map(c=>c.id),ids);
 assert.equal(publicA.handPreview?.length,a.hand.length-2);
 game.syncDraft(a,{matchId:r.matchId,handVersion:a.handVersion,cards:[b.hand[0].id]});
 assert.deepEqual(a.draftIds,ids);
 game.syncDraft(a,{matchId:r.matchId,handVersion:a.handVersion-1,cards:[]});
 assert.deepEqual(a.draftIds,ids);
 game.syncDraft(a,{matchId:r.matchId,handVersion:a.handVersion,cards:[]});
 publicA=game.view(r,b).players.find(p=>p.id===a.id)!;
 assert.equal(publicA.draftPreview?.length,0);
 assert.equal(publicA.handPreview?.length,a.hand.length);
 game.syncDraft(a,{matchId:r.matchId,handVersion:a.handVersion,cards:a.hand.map(c=>c.id)});
 game.action(a,{matchId:r.matchId,requestId:randomUUID(),handVersion:a.handVersion,cards:a.hand.map(c=>c.id)});
 publicA=game.view(r,b).players.find(p=>p.id===a.id)!;
 assert.equal(publicA.draftPreview?.length,0);
 assert.equal(publicA.playedSentences?.length,1);
});
