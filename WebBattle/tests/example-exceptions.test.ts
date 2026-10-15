import {test} from 'node:test';import assert from 'node:assert/strict';import {judgeCards,CARD_POS,DECK_FACES,type Kind} from '../shared/rules.js';import {LearningPosType as P} from '../shared/LearningLocalGrammarChecker.js';import {cardSentenceExample} from '../shared/card-sentence-example.js';import {readFileSync} from 'node:fs';import {exampleAudioTokens} from '../shared/example-audio.js';
const audio=JSON.parse(readFileSync('public/audio/examples/manifest-v1.json','utf8'));
function example(kinds:Kind[],variation=0){const cards=kinds.map((kind,i)=>({kind,id:String(i)})),j=judgeCards(cards);assert.equal(j.valid,true,kinds.join(' '));assert.equal(j.usedLength,kinds.length,kinds.join(' '));const e=cardSentenceExample(cards,j,variation).example!;assert.ok(e);assert.deepEqual(e.parts.map(p=>p.kind),kinds);for(const word of exampleAudioTokens(e.english))assert.ok(audio.segments[word],word);return e;}
test('valid emphasis, Be commands, preverb adverbs and complex question subjects have full examples',()=>{
 const cases:[Kind[],string][]=[ [['do','verb'],'Do work!'],[['do','verb','adjective'],'Do look happy!'],[['be','adjective'],'Be happy!'],[['do','be','adjective'],'Do be happy!'],[['pronoun','adverb','verb'],'I really work.'],[['be','article','count','preposition','proper','adjective'],'Is the teacher near Naro happy?'],[['be','not','article','count'],'Be not the guide!'] ];
 for(const [kinds,text] of cases)assert.equal(example(kinds).english,text);
});
test('PROPN maps exactly and consistently realizes Naro with third-person agreement and matching audio',()=>{
 assert.equal(CARD_POS.proper,P.PROPN);assert.equal(DECK_FACES.some(c=>c.kind==='proper'),false);
 for(let v=0;v<3;v++){assert.equal(example(['proper','verb'],v).english,'Naro works.');assert.equal(example(['proper','be','adjective'],v).english,'Naro is happy.');assert.equal(example(['proper','do','not','verb'],v).english,'Naro does not work.');assert.equal(example(['pronoun','be','proper'],v).parts.at(-1)!.text,'Naro');assert.equal(example(['pronoun','verb','proper','mass'],v).parts.find(p=>p.kind==='proper')!.text,'Naro');}
});
