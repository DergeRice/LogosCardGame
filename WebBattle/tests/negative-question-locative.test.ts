import {test} from 'node:test';
import assert from 'node:assert/strict';
import {judgeCards,type Kind} from '../shared/rules.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';

function sentence(kinds:Kind[],index=0){
 const cards=kinds.map((kind,id)=>({kind,id:String(id)}));
 const result=judgeCards(cards);
 assert.equal(result.valid,true,kinds.join(' '));
 assert.equal(result.usedStartIndex,0,kinds.join(' '));
 assert.equal(result.usedLength,cards.length,kinds.join(' '));
 const example=cardSentenceExample(cards,result,index).example;
 assert.ok(example,kinds.join(' '));
 assert.deepEqual(example.parts.map(part=>part.kind),kinds);
 return example;
}

test('DO + NOT + subject is a complete negative question, including a bare plural object',()=>{
 assert.equal(sentence(['do','not','pronoun','verb','count']).english,"Don't you like apples?");
 assert.equal(sentence(['do','not','pronoun','verb','count']).korean,'너는 사과들을 좋아하지 않나요?');
 assert.equal(sentence(['do','not','pronoun','verb','article','count']).english,"Don't you need the book?");
 assert.equal(sentence(['do','pronoun','not','verb']).english,'Do I not work?');
 assert.equal(sentence(['do','not','verb']).english,'Do not work!');
});

test('BE + locative adverb is a complete statement or question',()=>{
 assert.equal(sentence(['pronoun','be','adverb'],3).english,'They are there.');
 assert.equal(sentence(['pronoun','be','adverb'],3).korean,'그들은 거기에 있다.');
});
