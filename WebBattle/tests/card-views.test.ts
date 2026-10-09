import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playerCards} from '../shared/cardViews.js';
import type {PublicPlayer,Card} from '../shared/rules.js';
test('status card list combines hand, draft and every field without duplicating last sentence',()=>{const cards:Card[]=['h','draft','old','latest'].map(id=>({id,kind:'verb'}));const p={handPreview:[cards[0]],draftPreview:[cards[1]],playedSentences:[[cards[2]],[cards[3]]],lastPlayed:[cards[3]]} as PublicPlayer;assert.deepEqual(playerCards(p).map(c=>c.id),['h','draft','old','latest']);});
