import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {DECK_FACES,cardFace,cardEffect,effectLabel,judgeCards,judge} from '../shared/rules.js';

test('all sixty source cells are represented exactly once, with no Nothing card',()=>{
 const counts:Record<string,number>={};
 const cells=new Set<string>();
 for(const face of DECK_FACES){
  counts[face.kind]=(counts[face.kind]??0)+1;
  const art=cardFace({...face,id:''});cells.add(`${art.sheet}/${art.col}/${art.row}`);
  assert.ok(existsSync(`public/cards/${face.variant??face.kind}.webp`));
 }
 assert.deepEqual(counts,{indefinite:3,do:2,modal:2,not:2,frequency:2,adverb:2,preposition:3,very:2,pronoun:5,count:6,mass:6,article:3,possessive:3,verb:6,be:6,adjective:2,get2:1,get3:1,rob:1,exchange:1,protect:1});
 assert.equal(cells.size,60);
 for(let sheet=1;sheet<=5;sheet++)for(let row=0;row<3;row++)for(let col=0;col<4;col++)assert.ok(cells.has(`${sheet}/${col}/${row}`));
});

test('new noun determiners and auxiliary cards reach the grammar checker',()=>{
 assert.equal(judge(['indefinite','count','verb']).valid,true);
 assert.equal(judge(['pronoun','modal','verb']).valid,true);
 assert.equal(judge(['pronoun','do','not','verb']).valid,true);
});

test('printed division and subtraction affect accepted cards and labels',()=>{
 const divided={id:'v',kind:'verb' as const,variant:'verb-div2'};
 assert.equal(effectLabel(divided),'÷2');
 assert.equal(judgeCards([divided]).points,0.5);
 assert.equal(judgeCards([divided]).formula,'1 ÷ 2 = 0.5점');
 const minus={id:'p',kind:'possessive' as const,variant:'possessive-minus2'};
 assert.equal(cardEffect(minus).add,-2);assert.equal(effectLabel(minus),'−2');
 const result=judgeCards([minus,{id:'n',kind:'count'},{id:'v',kind:'verb'}]);
 assert.equal(result.valid,true);assert.equal(result.points,1);assert.equal(result.formula,'3 − 2 = 1점');
});
