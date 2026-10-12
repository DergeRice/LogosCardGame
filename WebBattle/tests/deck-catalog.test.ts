import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {DECK_FACES,cardFace,cardEffect,effectLabel,judgeCards,judge} from '../shared/rules.js';

test('active deck has four supplied To-infinitive faces and no Very cards',()=>{
 const counts:Record<string,number>={};
 const cells=new Set<string>();
 for(const face of DECK_FACES){
  counts[face.kind]=(counts[face.kind]??0)+1;
  const art=cardFace({...face,id:''});cells.add(`${art.sheet}/${art.col}/${art.row}`);
  assert.ok(existsSync(`public/cards/${face.variant??face.kind}.webp`));
 }
 assert.deepEqual(counts,{indefinite:2,do:2,modal:2,not:2,frequency:2,adverb:2,preposition:3,'to-infinitive':4,pronoun:5,count:6,mass:6,article:3,possessive:2,verb:6,be:6,adjective:2,get2:1,get3:1,rob:1,exchange:1,protect:1});
 assert.equal(cells.size,60);assert.equal(DECK_FACES.some(c=>cardEffect({...c,id:''}).add===-2),false);
 for(let sheet=1;sheet<=5;sheet++)for(let row=0;row<3;row++)for(let col=0;col<4;col++)if((sheet!==5||row!==2||col<2)&&!(sheet===1&&col===1&&row===0)&&!(sheet===2&&col===3&&row===1))assert.ok(cells.has(`${sheet}/${col}/${row}`));
 for(let col=0;col<4;col++)assert.ok(cells.has(`6/${col}/0`));
 assert.equal(DECK_FACES.some(face=>face.kind==='very'||face.variant==='to-infinitive-plus3'),false);
});

test('the three printed To-infinitive effects score only when recognized',()=>{
 const base=[{id:'p',kind:'pronoun' as const},{id:'v1',kind:'verb' as const},{id:'v2',kind:'pronoun' as const},{id:'to',kind:'to-infinitive' as const}];
 for(const [variant,points,label] of [['to-infinitive-plus2',6,'+2'],['to-infinitive-x2',8,'×2'],['to-infinitive-div2',2,'÷2']] as const){
  const cards=base.map(card=>card.id==='to'?{...card,variant}:card);
  assert.equal(effectLabel(cards[3]),label);
  assert.equal(judgeCards(cards).points,points);
 }
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



