import {readFileSync,writeFileSync} from 'node:fs';
import {judgeCards,type Kind} from '../shared/rules.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';
// Deliberately choose useful complete sentences instead of the shortest parse.
// The former shortlist included things such as “Read Naro” and “Give us them”.
const {reviewFamilies}=JSON.parse(readFileSync('docs/example-coverage.json','utf8'));
const reviewed=[];
for(const family of Object.keys(reviewFamilies)){
 const [form,mood,aux,main,polarity]=family.split('/'),f=Number(form),negative=polarity==='negative';
 const verb:Kind=main==='BE'?'be':'verb';
 const tail:Kind[]=f===1?[]:f===2?['adjective']:f===3?['article','count']:f===4?['pronoun','article','count']:['pronoun','adjective'];
 for(let variation=0;variation<3;variation++){
  const prefix:Kind[]=aux==='none'?[]:[aux==='DO'?'do':'modal'];
  const neg:Kind[]=negative?['not']:[];
  let kinds:Kind[]=mood==='imperative'?[...prefix,...(verb==='be'&&!prefix.length?[]:neg),verb,...(verb==='be'&&!prefix.length?neg:[]),...tail]:mood==='question'?(main==='BE'&&aux==='none'?['be','pronoun',...neg,...tail]:[...prefix,'pronoun',...neg,verb,...tail]):['pronoun',...prefix,...(prefix.length?neg:[]),verb,...(prefix.length?[]:neg),...tail];
  if(mood==='imperative'){if(variation===1)kinds=[negative?'adverb':'frequency',...kinds];if(variation===2)kinds=[...kinds,'adverb'];}
  const cards=kinds.map((kind,i)=>({id:String(i),kind})),judgment=judgeCards(cards);
  if(!judgment.valid||judgment.usedLength!==cards.length)throw Error('Reviewed structure failed: '+family+' '+kinds.join(' '));
  const example=cardSentenceExample(cards,judgment,mood==='imperative'?0:variation).example!;
  reviewed.push({family,...example,reviewed:true,...(mood==='imperative'&&main==='BE'&&aux==='none'&&negative?{usage:'formal imperative; ordinary speech generally uses Do not be'}:{})});
 }
}
if(reviewed.length!==216||new Set(reviewed.map(e=>e.english)).size!==216)throw Error('Expected 216 distinct reviewed representatives');
writeFileSync('shared/reviewed-examples.json',JSON.stringify(reviewed,null,2)+'\n');
writeFileSync('docs/REVIEWED-EXAMPLES.md','# 검수한 대표 예문 — v0.9.54\n\n72개 유형 × 3개 = 216개입니다. 품사·역할 순서를 유지하며 사람이 목적어일 때 help, 사물에는 read/need, 음악에는 enjoy를 사용합니다. BE 명령문 중 Be not…은 격식체로 분류하고 기존 판정을 유지합니다. 이 목록 검수는 모든 동적 생성 문장의 의미 적합성을 보증하는 것이 아닙니다.\n\n| 유형 | 영어 | 한국어 |\n|---|---|---|\n'+reviewed.map(e=>`| ${e.family} | ${e.english} | ${e.korean} |`).join('\n')+'\n');
console.log('Built',reviewed.length,'reviewed examples');
