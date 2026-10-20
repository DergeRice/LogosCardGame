import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {Game,type GameSocket} from '../server/game.js';
import {DECK_FACES,judgeCards,cardEffect,CARD_POS,type Card} from '../shared/rules.js';
import {canTransferCard} from '../shared/cardViews.js';
const socket=():GameSocket=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}});
test('Nothing has three distinct neutral faces, matching card dimensions and transparent corners',async()=>{
 const faces=DECK_FACES.filter(c=>c.kind==='nothing');assert.equal(faces.length,3);assert.equal(new Set(faces.map(c=>c.variant??c.kind)).size,3);assert.equal(CARD_POS.nothing,null);
 for(const [i,face] of faces.entries()){
  const card={...face,id:String(i)};assert.deepEqual({multiply:cardEffect(card).multiply,add:cardEffect(card).add},{multiply:1,add:0});assert.equal(canTransferCard(card),false);
  assert.equal(judgeCards([card,{id:'v',kind:'verb'}]).valid,false);assert.equal(judgeCards([card]).points,0);
  const {data,info}=await sharp(`public/cards/${face.variant??face.kind}.webp`).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,488);assert.equal(info.height,693);assert.equal(data[3],0);assert.ok(data[(Math.floor(info.height/2)*info.width+Math.floor(info.width/2))*4+3]>240);
 }
});
test('Nothing cannot enter a draft, forge a sentence or special action; discard is authoritative and deduplicated',()=>{
 const game=new Game({minimumPlayers:2}),a=game.hello(socket(),null,'A'),b=game.hello(socket(),null,'B');game.quick(a);game.quick(b);const room=game.rooms.get(a.room!)!;game.reveal(room);game.begin(room);
 const card:Card={id:'nothing-fixture',kind:'nothing'};a.hand=[card,{id:'verb',kind:'verb'}];const base={matchId:room.matchId,handVersion:a.handVersion};
 game.syncDraft(a,{...base,cards:[card.id]});assert.deepEqual(a.draftIds,[]);
 game.action(a,{...base,cards:[card.id,'verb'],requestId:randomUUID()});assert.equal(a.score,0);assert.equal(a.hand.length,2);
 game.special(a,{...base,cardId:card.id,requestId:randomUUID()});assert.equal(a.hand.length,2);
 const discard={...base,cardId:card.id,requestId:randomUUID()};game.discardCard(a,discard);game.discardCard(a,discard);assert.equal(a.hand.length,1);assert.equal(a.score,0);assert.equal(a.storage?.filter(c=>c.id===card.id).length,1);assert.equal(room.discard.filter(c=>c.id===card.id).length,0);
 a.hand=[{...card,id:'ai-nothing'}];a.ai='normal';a.actionAt=0;assert.equal(game.autoSpecial(room,a),true);assert.equal(a.hand.length,0);assert.equal(a.score,0);
});
