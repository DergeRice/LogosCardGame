import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Game,type GameSocket} from '../server/game.js';
import type {Card,Kind} from '../shared/rules.js';
const socket=():GameSocket=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}});
const card=(kind:Kind):Card=>({id:randomUUID(),kind});
function setup(){const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);r.deck=[];return {game,a,b,r};}
const use=(game:Game,p:ReturnType<Game['newPlayer']>,r:ReturnType<typeof setup>['r'],c:Card,extra:Record<string,unknown>={})=>game.special(p,{matchId:r.matchId,handVersion:p.handVersion,requestId:randomUUID(),cardId:c.id,...extra});
test('GET 2/3 draws exactly available unique cards from shared deck and cannot replay',()=>{
 const {game,a,r}=setup();const two=card('get2'),three=card('get3');a.hand=[two,three];r.deck=[card('verb'),card('be'),card('count'),card('pronoun')];
 const request={matchId:r.matchId,handVersion:a.handVersion,requestId:randomUUID(),cardId:two.id};game.special(a,request);game.special(a,request);
 assert.equal(a.hand.length,3);assert.equal(r.deck.length,2);assert.equal(r.discard.length,1);
 a.actionAt=0;use(game,a,r,three);assert.equal(a.hand.length,4);assert.equal(r.deck.length,0);assert.equal(r.discard.length,2);
 assert.equal(new Set([...a.hand,...r.discard].map(c=>c.id)).size,6);
});
test('ROB takes only the server-owned selected card, PROTECT blocks, stale selection is rejected',()=>{
 const {game,a,b,r}=setup();const rob=card('rob'),rob2=card('rob'),shield=card('protect'),gift=card('verb');a.hand=[rob,rob2];b.hand=[shield,gift];
 assert.equal(game.view(r,a).players.find(p=>p.id===b.id)?.handPreview?.some(c=>c.id===gift.id),true);
 use(game,a,r,rob,{targetId:b.id,stealId:gift.id,stealSource:'hand',targetHandVersion:b.handVersion});assert.equal(a.hand.length,2);assert.equal(b.hand.length,2);assert.equal(r.discard.length,0);assert.equal(b.robNotices?.length??0,0);
 b.hand=b.hand.filter(c=>c.id!==shield.id);b.handVersion++;a.actionAt=0;use(game,a,r,rob2,{targetId:b.id,stealId:gift.id,stealSource:'hand',targetHandVersion:b.handVersion-1});assert.equal(a.hand.length,2);
 use(game,a,r,rob2,{targetId:b.id,stealId:gift.id,stealSource:'hand',targetHandVersion:b.handVersion});
 assert.equal(a.hand.at(-1)?.id,gift.id);assert.equal(b.hand.length,0);assert.equal(r.discard.length,1);
});
test('ROB inspection shows every opponent hand and field card in one private response',()=>{
 const {game,a,b,r}=setup(),third=game.newPlayer('C'),sentA:any[]=[],sentB:any[]=[];
 third.room=r.code;third.socket=socket();r.players.push(third);
 a.socket={...socket(),send(data:string){sentA.push(JSON.parse(data));}};b.socket={...socket(),send(data:string){sentB.push(JSON.parse(data));}};
 const rob=card('rob'),handB=card('verb'),fieldB=card('mass'),handC=card('adjective');a.hand=[rob];b.hand=[handB];b.lastPlayed=[fieldB];third.hand=[handC];
 game.inspectRob(a,{matchId:r.matchId,cardId:rob.id});const peek=sentA.at(-1);
 assert.equal(peek.type,'robView');assert.deepEqual(peek.players.map((p:any)=>p.id),[b.id,third.id]);
 assert.deepEqual(peek.players[0].cards.map((c:any)=>[c.id,c.source]),[[handB.id,'hand'],[fieldB.id,'field']]);
 assert.deepEqual(peek.players[1].cards.map((c:any)=>[c.id,c.source]),[[handC.id,'hand']]);
 assert.equal(sentB.some(m=>m.type==='robView'),false);
 game.inspectRob(b,{matchId:r.matchId,cardId:rob.id});assert.match(sentB.at(-1).message,/ROB/);
});
test('ROB moves a field card to attacker hand, removes it from board/history/discard, keeps earned score',()=>{
 const {game,a,b,r}=setup();const rob=card('rob'),field=card('verb');a.hand=[rob];b.hand=[];b.lastPlayed=[field];b.playedSentences=[[field]];b.score=26;b.fieldVersion=1;r.discard=[field];
 use(game,a,r,rob,{targetId:b.id,stealId:field.id,stealSource:'field',targetFieldVersion:0});assert.equal(a.hand[0].id,rob.id);
 use(game,a,r,rob,{targetId:b.id,stealId:field.id,stealSource:'field',targetFieldVersion:1});
 assert.equal(game.view(r,b).robNotices?.[0].source,"field");assert.equal(game.view(r,b).robNotices?.[0].card.id,field.id);assert.equal(a.hand.at(-1)?.id,field.id);assert.deepEqual(b.lastPlayed,[]);assert.deepEqual(b.playedSentences,[]);assert.equal(r.discard.some(c=>c.id===field.id),false);assert.equal(b.score,26);assert.equal(new Set([...a.hand,...r.discard].map(c=>c.id)).size,a.hand.length+r.discard.length);
 assert.equal(game.view(r,b).players.find(p=>p.id===b.id)?.lastPlayed?.length,0);
});
test('EXCHANGE checks chosen opponent card, accepts exact pair and reports quick rejection reason',()=>{
 const {game,a,b,r}=setup();const exchange=card('exchange'),offer=card('pronoun'),give=card('verb');a.hand=[exchange,offer];b.hand=[give];
 use(game,a,r,exchange,{targetId:b.id,offerId:offer.id,wantedId:give.id,targetHandVersion:b.handVersion});const ex=r.exchange!;
 assert.equal(r.discard.length,1);assert.equal(game.view(r,a).exchange?.offer,undefined);
 assert.equal(game.view(r,b).exchange?.offer?.id,offer.id);
 assert.equal(game.view(r,b).exchange?.wanted?.id,give.id);
 assert.equal(JSON.stringify(game.view(r,b)).includes(offer.id),true);
 game.exchangeReply(b,{matchId:r.matchId,exchangeId:ex.id,accept:true});
 assert.equal(a.hand[0].id,give.id);assert.equal(b.hand[0].id,offer.id);
 game.exchangeReply(b,{matchId:r.matchId,exchangeId:ex.id,accept:true});assert.equal(a.hand.length,1);
 const again=card('exchange');a.hand.push(again);a.actionAt=0;use(game,a,r,again,{targetId:b.id,offerId:give.id,wantedId:offer.id,targetHandVersion:b.handVersion});game.exchangeReply(b,{matchId:r.matchId,exchangeId:r.exchange!.id,accept:false,reason:'동사 필요'});assert.equal(a.hand[0].id,give.id);assert.match(a.lastAction!.text,/동사 필요/);
 const third=card('exchange');a.hand.push(third);a.actionAt=0;use(game,a,r,third,{targetId:b.id,offerId:give.id,wantedId:offer.id,targetHandVersion:b.handVersion});r.exchange!.expiresAt=Date.now()-1;game.tick();assert.equal(r.exchange,undefined);assert.equal(a.hand[0].id,give.id);
});
test('EXCHANGE inspection is private to its holder; stale target and unlisted reply are rejected',()=>{
 const game=new Game({minimumPlayers:2}),sentA:any[]=[],sentB:any[]=[],sa={...socket(),send(data:string){sentA.push(JSON.parse(data));}},sb={...socket(),send(data:string){sentB.push(JSON.parse(data));}};
 const a=game.hello(sa,null,'A'),b=game.hello(sb,null,'B');game.quick(a);game.quick(b);const r=game.rooms.get(a.room!)!;game.reveal(r);game.begin(r);
 const ex=card('exchange'),offer=card('pronoun'),wanted=card('verb');a.hand=[ex,offer];b.hand=[wanted];a.handVersion++;b.handVersion++;
 game.inspectExchange(a,{matchId:r.matchId,cardId:ex.id});assert.equal(sentA.at(-1).type,'exchangeView');assert.equal(sentA.at(-1).players[0].cards[0].id,wanted.id);assert.equal(sentB.some(m=>m.type==='exchangeView'),false);
 game.inspectExchange(b,{matchId:r.matchId,cardId:ex.id});assert.match(sentB.at(-1).message,/EXCHANGE/);
 use(game,a,r,ex,{targetId:b.id,offerId:offer.id,wantedId:wanted.id,targetHandVersion:b.handVersion-1});assert.equal(r.exchange,undefined);assert.equal(a.hand.length,2);
 use(game,a,r,ex,{targetId:b.id,offerId:offer.id,wantedId:wanted.id,targetHandVersion:b.handVersion});const requestId=r.exchange!.id;
 game.exchangeReply(b,{matchId:r.matchId,exchangeId:requestId,accept:false,reason:'임의 문구'});assert.equal((r as unknown as {exchange?:{id:string}}).exchange?.id,requestId);
 game.exchangeReply(b,{matchId:r.matchId,exchangeId:requestId,accept:false,reason:'명사 필요'});assert.equal(r.exchange,undefined);assert.equal(sentA.find(m=>m.type==='exchangeResponse')?.reason,'명사 필요');assert.equal(sentB.some(m=>m.type==='exchangeResponse'),false);
});
test('function cards are rejected in grammar submit and AI uses its own GET card',()=>{
 const {game,a,r}=setup();const get=card('get2');a.hand=[get];game.action(a,{matchId:r.matchId,handVersion:a.handVersion,requestId:randomUUID(),cards:[get.id]});assert.equal(a.score,0);assert.equal(a.hand.length,1);
 const bot=game.newPlayer('AI');bot.ai='normal';bot.room=r.code;r.players.push(bot);bot.hand=[card('get3')];bot.nextAI=0;r.deck=[card('verb'),card('be')];game.tick();assert.equal(bot.hand.length,2);assert.equal(r.deck.length,0);
});
test('temporary special-card cheat is AI-only, moves existing cards, is idempotent and disables rewards',()=>{
 const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'Tester');game.quick(a);const r=game.rooms.get(a.room!)!;
 game.reveal(r);game.begin(r);const bot=r.players.find(p=>p.ai)!;
 a.hand=[card('get2')];bot.hand=[card('rob')];r.deck=[card('get3'),card('exchange')];r.discard=[card('protect')];
 const request={matchId:r.matchId,requestId:randomUUID()};game.debugSpecials(a,request);
 assert.deepEqual(new Set(a.hand.map(c=>c.kind)),new Set(['get2','get3','rob','exchange','protect']));
 assert.equal(new Set(a.hand.map(c=>c.id)).size,5);assert.equal(bot.hand.length,0);assert.equal(r.deck.length,0);assert.equal(r.discard.length,0);
 assert.equal(r.testMode,true);assert.equal(game.view(r,a).testMode,true);
 game.debugSpecials(a,request);assert.equal(a.hand.length,5);
 const rating=a.rating,points=a.points;a.score=30;game.finish(r,'test');assert.equal(a.rating,rating);assert.equal(a.points,points);assert.equal(a.reward,0);
 game.reveal(r);assert.equal(r.testMode,false);
 const other=new Game({minimumPlayers:2}),p=other.hello(socket(),null,'P'),q=other.hello(socket(),null,'Q');other.quick(p);other.quick(q);const human=other.rooms.get(p.room!)!;other.reveal(human);other.begin(human);
 const before=p.hand.length;other.debugSpecials(p,{matchId:human.matchId,requestId:randomUUID()});assert.equal(p.hand.length,before);assert.equal(human.testMode,false);
});

test('ROB victim notice is private, survives reconnect snapshot, and acknowledges only the victim notice',async()=>{
 const {game,a,b,r}=setup(),rob=card('rob'),gift=card('verb');a.hand=[rob];b.hand=[gift];
 const request={matchId:r.matchId,handVersion:a.handVersion,requestId:randomUUID(),cardId:rob.id,targetId:b.id,stealId:gift.id,stealSource:'hand',targetHandVersion:b.handVersion};
 game.special(a,request);game.special(a,request);
 const notices=game.view(r,b).robNotices!;assert.equal(notices.length,1);assert.equal(notices[0].fromName,a.name);assert.deepEqual(notices[0].card,gift);assert.equal(notices[0].source,'hand');assert.equal(game.view(r,a).robNotices?.length??0,0);
 const {snapshot,restore}=await import('../server/persistence.js');const restored=new Game({minimumPlayers:2});restore(restored,snapshot(game));const rb=restored.sessions.get(b.token)!,rr=restored.rooms.get(r.code)!;assert.equal(restored.view(rr,rb).robNotices?.[0].id,notices[0].id);
 game.handle(a,{type:'robNoticeRead',matchId:r.matchId,noticeId:notices[0].id});assert.equal(b.robNotices!.length,1);
 game.handle(b,{type:'robNoticeRead',matchId:'old-match',noticeId:notices[0].id});assert.equal(b.robNotices!.length,1);
 game.handle(b,{type:'robNoticeRead',matchId:r.matchId,noticeId:notices[0].id});assert.equal(b.robNotices!.length,0);
});

test('all card views include drafts and earlier fields once; ROB can take an older field card',()=>{
 const {game,a,b,r}=setup(),rob=card('rob'),hand=card('pronoun'),old=card('mass'),latest=card('verb');a.hand=[rob];b.hand=[hand];b.draftIds=[hand.id];b.lastPlayed=[latest];b.playedSentences=[[old],[latest]];r.discard=[old,latest];b.fieldVersion=2;
 const out:any[]=[];a.socket={...socket(),send(data:string){out.push(JSON.parse(data))}};game.inspectRob(a,{matchId:r.matchId,cardId:rob.id});assert.deepEqual(out.at(-1).players.find((x:any)=>x.id===b.id).cards.map((c:Card)=>c.id),[hand.id,old.id,latest.id]);
 use(game,a,r,rob,{targetId:b.id,stealId:old.id,stealSource:'field',targetFieldVersion:2});assert.ok(a.hand.some(c=>c.id===old.id));assert.deepEqual(b.lastPlayed,[latest]);assert.deepEqual(b.playedSentences,[[latest]]);assert.ok(!r.discard.some(c=>c.id===old.id));
});

test('EXCHANGE includes and swaps older field cards; scores stay and stale field versions fail',()=>{
 const {game,a,b,r}=setup(),exchange=card('exchange'),offer=card('mass'),give=card('verb'),latest=card('be');a.hand=[exchange];a.lastPlayed=[offer];a.playedSentences=[[offer]];b.hand=[];b.lastPlayed=[latest];b.playedSentences=[[give],[latest]];r.discard=[offer,give,latest];a.score=25;b.score=30;b.fieldVersion=4;
 const out:any[]=[];a.socket={...socket(),send(data:string){out.push(JSON.parse(data))}};game.inspectExchange(a,{matchId:r.matchId,cardId:exchange.id});const view=out.at(-1).players.find((x:any)=>x.id===b.id);assert.deepEqual(view.cards.map((c:Card)=>c.id),[give.id,latest.id]);assert.equal(view.fieldVersion,4);
 use(game,a,r,exchange,{targetId:b.id,offerId:offer.id,wantedId:give.id,targetHandVersion:b.handVersion,targetFieldVersion:3});assert.equal(r.exchange,undefined);
 use(game,a,r,exchange,{targetId:b.id,offerId:offer.id,wantedId:give.id,targetHandVersion:b.handVersion,targetFieldVersion:4});assert.equal(game.view(r,b).exchange?.offer?.id,offer.id);assert.equal(game.view(r,b).exchange?.wanted?.id,give.id);
 game.exchangeReply(b,{matchId:r.matchId,exchangeId:r.exchange!.id,accept:true});assert.deepEqual(a.hand,[give]);assert.deepEqual(b.hand,[offer]);assert.equal(a.score,25);assert.equal(b.score,30);assert.deepEqual(a.playedSentences,[]);assert.deepEqual(b.playedSentences,[[latest]]);assert.deepEqual(r.discard.map(c=>c.id),[latest.id,exchange.id]);
});


test('ROB hides protected targets, preserves blocked ROB and ignores duplicate blocked requests',()=>{
 const {game,a,b,r}=setup(),rob=card('rob'),shield=card('protect'),gift=card('verb'),out:any[]=[];
 a.socket={...socket(),send(data:string){out.push(JSON.parse(data))}};a.hand=[rob];b.hand=[shield,gift];
 game.inspectRob(a,{matchId:r.matchId,cardId:rob.id});assert.deepEqual(out.at(-1).players[0].cards,[]);
 const msg={matchId:r.matchId,handVersion:a.handVersion,requestId:randomUUID(),cardId:rob.id,targetId:b.id,stealId:gift.id,stealSource:'hand',targetHandVersion:b.handVersion};
 game.special(a,msg);game.special(a,msg);assert.deepEqual(a.hand,[rob]);assert.deepEqual(b.hand,[shield,gift]);assert.equal(r.discard.length,0);assert.equal(out.at(-1).duplicate,true);
});

test('ROB and EXCHANGE cannot transfer rob/exchange/protect; GET cards remain transferable',()=>{
 for(const kind of ['rob','exchange','protect'] as const){
  const {game,a,b,r}=setup(),rob=card('rob'),ex=card('exchange'),off=card('verb'),restricted=card(kind),get=card('get2'),out:any[]=[];
  a.socket={...socket(),send(data:string){out.push(JSON.parse(data))}};a.hand=[rob,ex,off];b.hand=[restricted,get];
  game.inspectExchange(a,{matchId:r.matchId,cardId:ex.id});assert.deepEqual(out.at(-1).players[0].cards.map((c:Card)=>c.id),[get.id]);
  use(game,a,r,rob,{targetId:b.id,stealId:restricted.id,stealSource:'hand',targetHandVersion:b.handVersion});assert.equal(a.hand.length,3);assert.equal(r.discard.length,0);
  use(game,a,r,ex,{targetId:b.id,offerId:off.id,wantedId:restricted.id,targetHandVersion:b.handVersion});assert.equal(r.exchange,undefined);
  a.hand.push(card(kind));const own=a.hand.at(-1)!;use(game,a,r,ex,{targetId:b.id,offerId:own.id,wantedId:get.id,targetHandVersion:b.handVersion});assert.equal(r.exchange,undefined);
  use(game,a,r,ex,{targetId:b.id,offerId:off.id,wantedId:get.id,targetHandVersion:b.handVersion});const pending=game.rooms.get(r.code)!.exchange;assert.ok(pending);game.exchangeReply(b,{matchId:r.matchId,exchangeId:pending.id,accept:true});assert.ok(a.hand.some(c=>c.id===get.id));assert.ok(b.hand.some(c=>c.id===off.id));
 }
});

