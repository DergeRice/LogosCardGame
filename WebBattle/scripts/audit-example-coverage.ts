import {createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {writeFileSync,readFileSync} from 'node:fs';
import {DECK_FACES,CARD_POS,judge,type Kind,type Judgment} from '../shared/rules.js';
import {CheckPlayableSegment,LearningPosType} from '../shared/LearningLocalGrammarChecker.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';
import {SENTENCE_EXAMPLES} from '../shared/sentence-examples.js';
import type {SentenceExample} from '../shared/sentence-examples.js';
import {exampleAudioTokens} from '../shared/example-audio.js';
const kinds=[...new Set(DECK_FACES.map(c=>c.kind).filter(k=>CARD_POS[k]!==null))];
const max=Number(process.env.AUDIT_MAX_LENGTH??5);
if(!Number.isInteger(max)||max<1||max>5)throw Error('Exhaustive bound must be 1–5; longer sequences use structural generation.');
let inputs=0,playable=0,rawValid=0;const rejections:Record<string,number>={},rejectionSamples:Record<string,Kind[][]>={},segments=new Map<string,Kind[]>();
function check(seq:Kind[]){inputs++;const raw=CheckPlayableSegment(seq.map(k=>CARD_POS[k]!),false,true,true);if(raw.valid)rawValid++;const result=judge(seq);if(result.valid){playable++;const segment=seq.slice(result.usedStartIndex,result.usedStartIndex+result.usedLength);segments.set(segment.join(' '),segment);}else if(raw.valid){rejections[result.reason]=(rejections[result.reason]??0)+1;rejectionSamples[result.reason]??=[];if(rejectionSamples[result.reason].length<5)rejectionSamples[result.reason].push(seq);}}
function exhaustive(seq:Kind[],left:number){if(!left){check(seq);return;}for(const k of kinds)exhaustive([...seq,k],left-1);}
for(let n=1;n<=max;n++)exhaustive([],n);
const baseNps:Kind[][]=[['pronoun'],['mass'],['article','count'],['indefinite','count'],['possessive','count'],['article','adjective','count'],['adjective','mass'],['pronoun','preposition','pronoun']];
const extendedNps:Kind[][]=[...baseNps,['proper'],['adjective','proper'],['proper','preposition','pronoun'],['article','adjective','adjective','adjective','count'],['article','adverb','adjective','count'],['mass','preposition','pronoun','preposition','mass']];
function structural(np:Kind[][]){
 const tails:Kind[][]=[[],['adjective'],['adjective','adjective'],['adjective','adjective','adjective'],['adverb','adjective'],['adverb','adverb','adjective'],['preposition','pronoun'],...np,...np.flatMap(a=>np.map(b=>[...a,...b])),...np.flatMap(a=>[['adjective'],['adjective','adjective'],['adjective','adjective','adjective'],['verb']].map(b=>[...a,...b] as Kind[]))];
 const cases=new Map<string,Kind[]>();const add=(seq:Kind[])=>{if(seq.length<=15)cases.set(seq.join(' '),seq);};
 for(const tail of tails){add(['verb',...tail]);add(['do','verb',...tail]);add(['do','not','verb',...tail]);}
 for(const tail of [['adjective'],['preposition','pronoun'],...np] as Kind[][]){add(['be',...tail]);add(['be','not',...tail]);add(['be','adverb',...tail]);add(['do','be',...tail]);add(['do','not','be',...tail]);}
 for(const s of np)for(const tail of tails){for(const aux of [[],['do'],['modal']] as Kind[][])for(const neg of [[],['not']] as Kind[][]){if(!aux.length&&neg.length)continue;add([...s,...aux,...neg,'verb',...tail]);if(aux.length)add([...aux,...s,...neg,'verb',...tail]);}add([...s,'adverb','verb',...tail]);}
 for(const s of np)for(const tail of [['adjective'],['article','count'],['proper'],['preposition','pronoun']] as Kind[][])for(const neg of [[],['not']] as Kind[][]){add([...s,'be',...neg,...tail]);add([...s,'modal',...neg,'be',...tail]);add(['modal',...s,...neg,'be',...tail]);add(['be',...s,...neg,...tail]);}
 const failures:{seq:Kind[];reason:string;length:number}[]=[];
 for(const seq of cases.values()){const r=judge(seq);if(!r.valid||r.usedLength!==seq.length)failures.push({seq,reason:r.reason,length:r.usedLength});else segments.set(seq.join(' '),seq);}
 return {checked:cases.size,full:cases.size-failures.length,failed:failures.length,samples:failures.slice(0,20),cases};
}
const base=structural(baseNps),extended=structural(extendedNps),english=new Set<string>(),families=new Map<string,{examples:SentenceExample[]}>(),byForm:Record<string,number>={};let realizations=0,missing=0;
const onePerPos:{key:string;pos:string[];patternType:number;english:string;korean:string;availableInCurrentDeck:boolean;reviewed:boolean;audioKey:string}[]=[];
const audio=JSON.parse(readFileSync('public/audio/examples/manifest-v1.json','utf8')),missingAudio=new Set<string>();
for(const seq of segments.values()){
 const cards=seq.map((kind,i)=>({id:String(i),kind})),r=judge(seq);byForm[r.patternType]=(byForm[r.patternType]??0)+1;
 for(let variation=0;variation<3;variation++){const e=cardSentenceExample(cards,r,variation).example;if(!e){missing++;continue;}realizations++;if(variation===0&&process.env.AUDIT_EXPORT_ONE){const stock=new Map<Kind,number>();for(const c of DECK_FACES)stock.set(c.kind,(stock.get(c.kind)??0)+1);let available=true;for(const k of seq){const n=stock.get(k)??0;if(n<1)available=false;stock.set(k,n-1);}onePerPos.push({key:seq.map(k=>LearningPosType[CARD_POS[k]!]).join(' '),pos:seq.map(k=>LearningPosType[CARD_POS[k]!]),patternType:r.patternType,english:e.english,korean:e.korean,availableInCurrentDeck:available,reviewed:false,audioKey:createHash('sha256').update(e.english).digest('hex').slice(0,20)});}english.add(e.english);for(const word of exampleAudioTokens(e.english))if(!audio.segments[word])missingAudio.add(word);const key=[r.patternType,e.imperative?'imperative':e.english.endsWith('?')?'question':'statement',seq.includes('do')?'DO':seq.includes('modal')?'MODAL':'none',seq.includes('be')?'BE':'VB',seq.includes('not')?'negative':'positive'].join('/');const group=families.get(key)??{examples:[]};if(!group.examples.some(x=>x.english===e.english)){group.examples.push(e);group.examples.sort((a,b)=>a.parts.length-b.parts.length||a.english.length-b.english.length);group.examples=group.examples.slice(0,3);}families.set(key,group);}
}
const report={fixed:{total:SENTENCE_EXAMPLES.length,base:15,perForm:30},bounds:{activeKinds:kinds,maxExhaustiveLength:max,maxStructuralLength:15,effectsIgnored:true,handDistributionNotEnumerated:true,properIsEngineOnly:true},exhaustive:{inputs,rawValid,playable,rejections,rejectionSamples},baselineV51:{checked:7749,full:6900,missed:849,missingFamilies:{emphaticImperative:93,beImperative:2,emphaticBeImperative:10,preverbAdverb:744}},baseStructural:{...base,cases:undefined},extendedStructural:{...extended,cases:undefined},generated:{uniquePosOrders:segments.size,realizations,distinctEnglish:english.size,missing,byForm,families:families.size,reviewExamplesAtThreePerFamily:families.size*3},reviewFamilies:Object.fromEntries(families)};
if(process.env.AUDIT_EXPORT_ONE){
 const output='docs/one-example-per-pos';mkdirSync(output,{recursive:true});
 const unique=new Map(onePerPos.map(e=>[e.english,e]));
 const current=onePerPos.filter(e=>e.availableInCurrentDeck),currentTexts=new Set(current.map(e=>e.english));
 if(onePerPos.length!==segments.size||missing)throw Error('Missing canonical example');
 if(new Set(onePerPos.map(e=>e.key)).size!==onePerPos.length)throw Error('Duplicate POS key');
 for(const seq of segments.values()){const r=judge(seq);if(!r.valid||r.usedLength!==seq.length)throw Error('Partial segment in canonical list');}
 writeFileSync(output+'/examples.jsonl',onePerPos.map(e=>JSON.stringify(e)).join('\n')+'\n');
 const q=(s:unknown)=>'"'+String(s).replaceAll('"','""')+'"';
 writeFileSync(output+'/examples.csv','\uFEFF'+['품사 조합,형식,영어 예문,한국어,현재 공용덱 구성 가능',...onePerPos.map(e=>[e.key,e.patternType,e.english,e.korean,e.availableInCurrentDeck?'가능':'엔진 확장/보유수 초과'].map(q).join(','))].join('\r\n'));
 const m=JSON.parse(readFileSync('public/audio/sentences/manifest.json','utf8')) as {entries:{text:string;bytes:number;duration:number}[]};
 const existing=new Set(m.entries.map(e=>e.text)),chars=[...unique.keys()].reduce((n,t)=>n+t.length,0),words=[...unique.keys()].reduce((n,t)=>n+t.split(/\s+/).length,0);
 const observedChars=m.entries.reduce((n,e)=>n+e.text.length,0),observedBytes=m.entries.reduce((n,e)=>n+e.bytes,0),observedDuration=m.entries.reduce((n,e)=>n+e.duration,0);
 const currentChars=[...currentTexts].reduce((n,t)=>n+t.length,0);
 const summary={scope:'Length 1–5 exhaustive plus structural sequences up to 15; not all possible 15-card arrays. POS/effect duplicates merged; English variation 0 only. Automatically generated, not human-reviewed.',posCombinations:onePerPos.length,distinctEnglish:unique.size,currentDeckCombinations:current.length,currentDeckDistinctEnglish:currentTexts.size,existingKokoroSentencesMatched:[...unique.keys()].filter(t=>existing.has(t)).length,totalCharacters:chars,totalWords:words,forms:byForm,estimate:{basis:'Linear extrapolation from existing 547 Kokoro MP3 recordings by text length; longer sentences can differ.',observedRecordings:m.entries.length,observedBytes,observedSeconds:observedDuration,bytes:Math.round(chars*observedBytes/observedChars),hours:Math.round(chars*observedDuration/observedChars/3600*100)/100,currentDeckBytes:Math.round(currentChars*observedBytes/observedChars)},inputsChecked:inputs,structuralChecked:extended.checked};
 writeFileSync(output+'/summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
}else{
writeFileSync('docs/example-coverage.json',JSON.stringify({...report,missingAudioWords:[...missingAudio]},null,2));
const review=[...families].flatMap(([family,group])=>group.examples.map(e=>({family,...e})));writeFileSync('docs/example-review-candidates.json',JSON.stringify(review,null,2));
console.log(JSON.stringify({...report,reviewFamilies:undefined,reviewCandidates:review.length,missingAudioWords:[...missingAudio]},null,2));
if(base.failed||extended.failed||missing||missingAudio.size)process.exitCode=1;


}
