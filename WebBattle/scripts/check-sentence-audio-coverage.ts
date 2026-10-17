import {readFileSync} from 'node:fs';
import {CARD_POS,judgeCards,type Kind} from '../shared/rules.js';
import {LearningPosType} from '../shared/LearningLocalGrammarChecker.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';
const rows=readFileSync('docs/one-example-per-pos/examples.jsonl','utf8').trim().split('\n').map(x=>JSON.parse(x)).filter(x=>x.availableInCurrentDeck),texts=new Set(rows.map(x=>x.english));
const kinds=Object.keys(CARD_POS) as Kind[],changes=[];
for(const row of rows){const cards=row.pos.map((pos:string,i:number)=>({id:String(i),kind:kinds.find(k=>LearningPosType[CARD_POS[k]!]===pos)!}));const judgment=judgeCards(cards),example=cardSentenceExample(cards,judgment).example;if(example&&!texts.has(example.english))changes.push({pos:row.pos,text:example.english});}
for(const seq of [['pronoun','modal','not','be','adjective'],['do','pronoun','not','verb'],['do','not','be','adjective'],['be','pronoun','preposition','pronoun'],['article','adjective','count','modal','be','adjective']] as Kind[][]){const cards=seq.map((kind,i)=>({id:String(i),kind})),r=judgeCards(cards),e=cardSentenceExample(cards,r).example;if(e&&!texts.has(e.english))changes.push({pos:seq,text:e.english});}
if(changes.length)throw Error('Unrecorded canonical sentences: '+JSON.stringify(changes.slice(0,10))); console.log(JSON.stringify({audited:rows.length,changedUnrecorded:changes.length,samples:changes.slice(0,8)}));
