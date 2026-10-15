import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {judgeCards,type Kind} from '../shared/rules.js';import {cardSentenceExample} from '../shared/card-sentence-example.js';import {exampleAudioTokens} from '../shared/example-audio.js';
import {CheckPlayableSegment,LearningPosType as P} from '../shared/LearningLocalGrammarChecker.js';
const audio=JSON.parse(readFileSync('public/audio/examples/manifest-v1.json','utf8'));
function check(kinds:Kind[],length=kinds.length,start=0){const cards=kinds.map((kind,i)=>({id:String(i),kind})),r=judgeCards(cards);assert.equal(r.valid,true,kinds.join(' '));assert.equal(r.usedStartIndex,start,kinds.join(' '));assert.equal(r.usedLength,length,kinds.join(' '));assert.equal(r.points,length);const e=cardSentenceExample(cards,r).example!;assert.ok(e);assert.deepEqual(e.parts.map(p=>p.kind),kinds.slice(start,start+length));for(const word of exampleAudioTokens(e.english))assert.ok(audio.segments[word],word);return e;}
test('reported subjectless modal hand recognizes only its longest imperative segment',()=>{
 const e=check(['modal','frequency','verb','adjective','adverb'],4,1);assert.equal(e.english,'Always look happy today!');assert.equal(e.imperative,true);
 // Reference Unity entry retains its original single-VB behavior.
 const unity=CheckPlayableSegment([P.MODAL,P.RB_FREQ,P.VB,P.JJ,P.RB]);assert.equal(unity.usedStartIndex,2);assert.equal(unity.usedLength,1);
});
test('DO and MODAL affirmative/negative statements and questions cover all five forms',()=>{
 const tails:Kind[][]=[[],['adjective'],['mass'],['pronoun','mass'],['pronoun','adjective']];
 for(const subject of [['pronoun'],['article','count'],['mass']] as Kind[][])for(const aux of ['do','modal'] as Kind[])for(const negative of [false,true])for(const question of [false,true])for(const tail of tails){const neg:Kind[]=negative?['not']:[];check(question?[aux,...subject,...neg,'frequency','verb',...tail]:[...subject,aux,...neg,'frequency','verb',...tail]);}
});
test('modal BE statements and questions and DO NOT BE imperatives accept complements',()=>{
 for(const tail of [['adjective'],['article','count'],['preposition','pronoun']] as Kind[][])for(const neg of [[],['not']] as Kind[][]){check(['pronoun','modal',...neg,'be',...tail]);check(['modal','pronoun',...neg,'be',...tail]);check(['be','pronoun',...neg,...tail]);check(['do','not','be',...tail]);}
 assert.equal(check(['pronoun','modal','not','be','adjective']).english,'I can not be happy.');assert.equal(check(['do','pronoun','not','verb']).english,'Do I not work?');assert.equal(check(['do','not','be','adjective']).english,'Do not be afraid!');
 assert.equal(check(['be','pronoun','preposition','pronoun']).english,'Am I near them?');
});
test('imperative objects, complements and adjuncts are fully counted; invalid auxiliary structures are not fully counted',()=>{
 for(const kinds of [['verb','adverb'],['frequency','verb','adverb'],['verb','adjective','adverb'],['verb','article','count'],['verb','pronoun','mass'],['verb','pronoun','adjective'],['do','not','verb','article','count'],['do','not','verb','pronoun','adjective']] as Kind[][])assert.equal(check(kinds).imperative,true);
 for(const kinds of [['modal','frequency','verb','adjective'],['pronoun','do','be','adjective'],['pronoun','not','verb'],['pronoun','modal','do','verb']] as Kind[][]){const r=judgeCards(kinds.map((kind,i)=>({id:String(i),kind})));assert.ok(!r.valid||r.usedLength<kinds.length,kinds.join(' '));}
});
