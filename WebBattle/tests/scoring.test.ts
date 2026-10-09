import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeCards, cardFace, VARIANTS, type Card, type Kind } from '../shared/rules.js';
const cards=(items:[Kind,string?][]):Card[]=>items.map(([kind,variant],i)=>({id:String(i),kind,variant}));
test('one point per accepted card, no form bonus',()=>{assert.equal(judgeCards(cards([['verb']])).points,1);assert.equal(judgeCards(cards([['pronoun'],['verb']])).points,2);assert.equal(judgeCards(cards([['pronoun'],['be'],['adjective']])).points,3);});
test('multiplication BEFORE additions irrespective of card order: five cards x2 +3 = 13',()=>{
 const r=judgeCards(cards([['pronoun','pronoun-x2'],['verb'],['article'],['count','count-plus3'],['adjective']]));assert.equal(r.usedLength,5);assert.equal(r.points,13);assert.equal(r.formula,'5 × 2 + 3 = 13점');
});
test('multiple multipliers multiply together; multiple additions sum, then Go multiplier',()=>{
 const hand=cards([['pronoun','pronoun-x2'],['verb'],['article','article-x2'],['count','count-plus3'],['adjective','adjective-plus3']]);assert.equal(judgeCards(hand).points,26);assert.equal(judgeCards(hand,3).points,78);
});
test('effects outside recognized segment never count',()=>{
 const r=judgeCards(cards([['adjective','adjective-plus3'],['verb'],['adjective','adjective-plus3']]));assert.equal(r.usedStartIndex,1);assert.equal(r.usedLength,1);assert.equal(r.points,1);
});
test('invalid grammar and forged/mismatched variant do not grant effects',()=>{
 assert.equal(judgeCards(cards([['adjective','adjective-plus3']])).points,0);assert.equal(judgeCards(cards([['verb','pronoun-x2']])).points,1);assert.equal(judgeCards(cards([['verb','made-up-x999']])).points,1);
});
test('every effect uses the matching printed face, without modifying original assets',()=>{
 for(const [variant,v]of Object.entries(VARIANTS)){const face=cardFace({id:'x',kind:v.kind,variant});assert.equal(face.sheet,v.sheet);assert.equal(face.col,v.col);assert.equal(face.row,v.row);}
});

test('screenshot PRP VB NNU JJ(+3) PRP(x2): first four recognized, last multiplier excluded',()=>{
 const r=judgeCards(cards([['pronoun'],['verb'],['mass','mass-nine'],['adjective','adjective-plus3'],['pronoun','pronoun-x2']]));assert.equal(r.valid,true);assert.equal(r.patternType,5);assert.equal(r.usedStartIndex,0);assert.equal(r.usedLength,4);assert.equal(r.points,7);
});
