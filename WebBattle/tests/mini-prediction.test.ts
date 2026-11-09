import test from 'node:test';
import assert from 'node:assert/strict';
import {VERB_CATEGORIES,interleaveVerbCards,type MiniGameView} from '../shared/miniGame.js';
import {predictMiniRun,type MiniPendingPick} from '../src/miniPrediction.js';

const [a,b]=VERB_CATEGORIES;
function run():NonNullable<MiniGameView['run']>{
 const cards=interleaveVerbCards(a,b,1);
 return {id:'test-run',startsAt:0,endsAt:60000,lockedUntil:0,correct:0,wrong:0,combo:0,lastClientSeq:0,left:a,right:b,card:cards[0],cards,upcoming:cards.slice(1,3),audioWords:cards.map(card=>card.word)};
}

test('three rapid taps advance immediately and show Combo x3 before any server reply',()=>{
 const base=run(),pending:MiniPendingPick[]=[
  {runId:base.id,seq:1,cardId:1,side:'left',at:1000},
  {runId:base.id,seq:2,cardId:2,side:'left',at:1050},
  {runId:base.id,seq:3,cardId:3,side:'right',at:1100},
 ];
 const shown=predictMiniRun(base,pending);
 assert.equal(shown.card?.word,'become');assert.equal(shown.correct,3);assert.equal(shown.combo,3);
 const acknowledged={...base,lastClientSeq:1,cards:base.cards.slice(1),card:base.cards[1],correct:1,combo:1};
 const reconciled=predictMiniRun(acknowledged,pending);
 assert.equal(reconciled.card?.word,'become');assert.equal(reconciled.correct,3);assert.equal(reconciled.combo,3);
});

test('a wrong rapid tap resets combo and immediately holds the missed card',()=>{
 const base=run(),pending:MiniPendingPick[]=[
  {runId:base.id,seq:1,cardId:1,side:'left',at:1000},
  {runId:base.id,seq:2,cardId:2,side:'left',at:1050},
  {runId:base.id,seq:3,cardId:3,side:'right',at:1100},
  {runId:base.id,seq:4,cardId:4,side:'left',at:1150},
 ];
 const shown=predictMiniRun(base,pending);
 assert.equal(shown.card?.word,'arrive');assert.equal(shown.correct,3);assert.equal(shown.wrong,1);assert.equal(shown.combo,0);
 assert.equal(shown.missedWord,'become');assert.equal(shown.lockedUntil,2150);
});
