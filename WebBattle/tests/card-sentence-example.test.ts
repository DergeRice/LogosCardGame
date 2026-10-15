import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cardSentenceExample} from '../shared/card-sentence-example.js';
import {judge,judgeCards,type Kind,type Card} from '../shared/rules.js';
import {CheckPlayableSegment,LearningPosType as P} from '../shared/LearningLocalGrammarChecker.js';
import observed from './fixtures/observed-pos-combinations.json' with {type:'json'};
const make=(kinds:Kind[]):Card[]=>kinds.map((kind,i)=>({id:'c'+i,kind}));
test('all 64 previously observed anonymous POS sequences receive card-aligned examples',()=>{
 for(const sequence of observed as Kind[][]){const cards=make(sequence),result=judgeCards(cards);assert.equal(result.valid,true,sequence.join(' '));const example=cardSentenceExample(cards,result).example!;assert.ok(example,sequence.join(' '));assert.deepEqual(example.parts.map(p=>p.kind),sequence);}
});
test('realized words preserve every accepted card kind, identity and order across all five forms',()=>{
 const arrays:Kind[][]=[['pronoun','verb'],['mass','verb'],['article','count','verb'],['possessive','adjective','count','verb'],['pronoun','be','adjective'],['pronoun','verb','adjective'],['mass','be','article','count'],['pronoun','verb','mass'],['pronoun','verb','pronoun','mass'],['pronoun','verb','mass','adjective'],['pronoun','verb','pronoun','to-infinitive'],['do','pronoun','verb'],['pronoun','modal','frequency','verb','preposition','pronoun'],['pronoun','do','not','verb','article','count'],['mass','be','not','adjective','adverb'],['pronoun','verb','pronoun','verb','indefinite','count']];
 for(const kinds of arrays)for(let variation=0;variation<3;variation++){
  const cards=make(kinds),r=judgeCards(cards);assert.equal(r.valid,true,kinds.join(' '));const e=cardSentenceExample(cards,r,variation).example!;assert.ok(e,kinds.join(' '));assert.deepEqual(e.parts.map(p=>p.kind),kinds.slice(r.usedStartIndex,r.usedStartIndex+r.usedLength));assert.deepEqual(e.parts.map(p=>p.cardId),cards.slice(r.usedStartIndex,r.usedStartIndex+r.usedLength).map(c=>c.id));assert.match(e.korean,/[가-힣]/);assert.ok(!e.english.includes('undefined'));assert.ok(!e.korean.includes('undefined'));
 }
});
test('pronoun and noun agreement, auxiliaries and one-card To complements are realized correctly',()=>{
 const realize=(kinds:Kind[],variation=0)=>{const c=make(kinds);return cardSentenceExample(c,judgeCards(c),variation).example!.english};
 assert.equal(realize(['pronoun','be','adjective']), 'I am happy.');assert.equal(realize(['pronoun','be','adjective'],1),'We are happy.');assert.equal(realize(['pronoun','be','adjective'],2),'She is happy.');
 assert.equal(realize(['article','count','verb']),'The teacher works.');assert.equal(realize(['mass','verb']),'Traffic flows.');assert.equal(realize(['pronoun','do','not','verb']),'I do not work.');
 assert.equal(realize(['pronoun','verb','pronoun','to-infinitive']),'I want them to work.');assert.equal(realize(['pronoun','verb','mass','adjective']),'I make work easy.');
 const partial=make(['adjective','verb','adjective']);const r=judgeCards(partial),e=cardSentenceExample(partial,r).example!;assert.equal(e.english,'Look happy!');assert.deepEqual(e.parts.map(p=>p.cardId),['c1','c2']);
});
test('new battle rejects nonstandard legacy structures while the Unity reference entry remains intact',()=>{
 for(const seq of [['pronoun','verb','modal'],['pronoun','verb','verb'],['indefinite','mass','verb'],['article','adverb','count','verb']] as Kind[][]){assert.equal(judge(seq).valid,false,seq.join(' '));assert.match(judge(seq).reason,/비표준/);}
 assert.equal(judge(['pronoun','verb','adjective','mass']).patternType,3);
 assert.equal(CheckPlayableSegment([P.PRP,P.VB,P.JJ,P.NNU],false,true).patternType,4);
 assert.equal(CheckPlayableSegment([P.PRP,P.VB,P.MODAL],false,true).valid,true);
 assert.equal(CheckPlayableSegment([P.DT_AN,P.NNU,P.VB],false,true).valid,true);
});

test('battle accepts up to three chained adjectives as modifiers and complements',()=>{
 for(let count=1;count<=3;count++)for(const kinds of [
  ['pronoun','be',...Array(count).fill('adjective')],
  ['pronoun','verb',...Array(count).fill('adjective')],
  ['pronoun','verb','pronoun',...Array(count).fill('adjective')],
  ['article',...Array(count).fill('adjective'),'count','verb'],
 ] as Kind[][]){const cards=make(kinds),r=judgeCards(cards);assert.equal(r.valid,true,kinds.join(' '));assert.equal(r.usedLength,kinds.length);assert.equal(r.points,kinds.length);const e=cardSentenceExample(cards,r).example!;assert.deepEqual(e.parts.map(p=>p.kind),kinds);assert.ok(!e.english.includes('undefined'));}
 const kinds:Kind[]=['pronoun','be','adjective','adjective','adjective'];const c=make(kinds);assert.equal(cardSentenceExample(c,judgeCards(c)).example!.english,'I am happy, calm, and confident.');
 for(const kinds of [['pronoun','be','adjective','adjective','adjective','adjective'],['article','adjective','adjective','adjective','adjective','count','verb']] as Kind[][]){assert.equal(judge(kinds).valid,false);assert.match(judge(kinds).reason,/3장/);}
 assert.equal(CheckPlayableSegment([P.PRP,P.BE,P.JJ,P.JJ,P.JJ],false).usedLength,3);
});
test('two consecutive adverbs count fully, preserve order and receive aligned examples; three are rejected',()=>{
 for(const kinds of [['pronoun','verb','adverb','adverb'],['pronoun','be','adverb','adverb','adjective'],['adverb','adverb','pronoun','verb'],['pronoun','modal','frequency','frequency','verb']] as Kind[][]){const c=make(kinds),r=judgeCards(c);assert.equal(r.valid,true,kinds.join(' '));assert.equal(r.usedLength,kinds.length);assert.equal(r.points,kinds.length);assert.deepEqual(cardSentenceExample(c,r).example!.parts.map(p=>p.kind),kinds);}
 const kinds:Kind[]=['pronoun','be','adverb','adverb','adjective'];const c=make(kinds);assert.equal(cardSentenceExample(c,judgeCards(c)).example!.english,'I am really very happy.');
 assert.equal(judge(['pronoun','verb','adverb','adverb','adverb']).valid,false);assert.match(judge(['pronoun','verb','frequency','adverb','frequency']).reason,/2장/);
 assert.equal(CheckPlayableSegment([P.PRP,P.VB,P.RB,P.RB,P.RB]).valid,true);
});
