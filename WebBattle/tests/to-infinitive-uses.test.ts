import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ADVANCED_DECK_FACES, judgeCards, type Kind} from '../shared/rules.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';

test('To infinitive noun, adjective and adverb uses include an optional object',()=>{
 const cases:[Kind[],number,string][]=[
  [['to-infinitive','indefinite','count','be','adjective'],2,'To read a book is useful.'],
  [['pronoun','verb','to-infinitive','indefinite','count'],3,'I want to read a book.'],
  [['pronoun','verb','indefinite','count','to-infinitive'],3,'I need a book to read.'],
  [['pronoun','verb','adverb','to-infinitive','mass'],1,'I work quietly to enjoy music.'],
  [['pronoun','verb','pronoun','to-infinitive','indefinite','count'],5,'I want them to read a book.']
 ];
 for(const [kinds,form,english] of cases){
  const cards=kinds.map((kind,i)=>({kind,id:`c${i}`})),judgment=judgeCards(cards);
  assert.equal(judgment.valid,true,kinds.join(' '));assert.equal(judgment.usedLength,kinds.length);assert.equal(judgment.patternType,form);
  const example=cardSentenceExample(cards,judgment).example!;assert.equal(example.english,english);assert.deepEqual(example.parts.map(p=>p.cardId),cards.map(c=>c.id));
 }
 assert.deepEqual(ADVANCED_DECK_FACES.map(c=>c.variant??'base'),['base','to-infinitive-plus2','to-infinitive-x2']);
});
