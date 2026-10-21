import {type Card,type Judgment,type Kind,CATALOG} from './rules.js';
import {type SentenceExample,type ExampleRole} from './sentence-examples.js';
type NP={start:number;end:number;head:number;baseEnd:number;pps:PP[]};
type PP={start:number;end:number;np:NP};
type Complement={start:number;end:number;kind:'adjective'|'to'|'verb'|'modal'};
type Tail={pattern:number;object?:NP;second?:NP;complement?:Complement;vp?:{start:number;tail:Tail};pp?:PP;location?:number;legacy?:string};
export type CardExampleResult={example:SentenceExample|null;reason?:string;positions:Kind[]};

/** Presentation parser for the active deck. The battle judgment stays authoritative.
 * Greedy NP/PP parsing and branch order mirror the Unity port; no scoring rules change.
 */
export function cardSentenceExample(cards:Card[],judgment:Judgment,index=0):CardExampleResult{
 const used=cards.slice(judgment.usedStartIndex,judgment.usedStartIndex+judgment.usedLength),seq=used.map(c=>c.kind),end=seq.length;
 const fail=(reason:string):CardExampleResult=>({example:null,reason,positions:seq});
 let contractedNegativeQuestion=false;
 if(!judgment.valid||!end)return fail('인정된 문장 구간이 없습니다.');
 const adv=(k:Kind)=>k==='adverb'||k==='frequency';
 const skip=(s:number,e:number)=>{while(s<e&&adv(seq[s]))s++;return s};
 const auxSkip=(s:number,e:number)=>{while(s<e&&(adv(seq[s])||seq[s]==='not'))s++;return s};
 function np(s:number,e:number):NP|null{
  const start=s;if(s>=e)return null;let head=-1;
  if(seq[s]==='pronoun'||seq[s]==='mass'||seq[s]==='proper'||(contractedNegativeQuestion&&seq[s]==='count'))head=s;
  else if(['article','indefinite','possessive'].includes(seq[s])){s++;while(s<e&&(seq[s]==='adjective'||adv(seq[s])))s++;if(s<e&&(seq[s]==='count'||seq[s]==='mass'))head=s;}
  else if(seq[s]==='adjective'){s++;while(s<e&&seq[s]==='adjective')s++;if(s<e&&(seq[s]==='mass'||seq[s]==='proper'))head=s;}
  if(head<0)return null;const baseEnd=head+1,pps:PP[]=[];let next=baseEnd,p:PP|null;
  while((p=pp(next,e))&&p.end>next){pps.push(p);next=p.end;}
  return {start,end:next,head,baseEnd,pps};
 }
 function pp(s:number,e:number):PP|null{if(seq[s]!=='preposition')return null;const noun=np(s+1,e);return noun?{start:s,end:noun.end,np:noun}:null;}
 function comp(s:number,e:number,object=false):Complement|null{
  const a=skip(s,e);if(seq[a]==='adjective'){let next=a+1;while(next<e&&seq[next]==='adjective'&&next-a<3)next++;return {start:s,end:next,kind:'adjective'};}
  if(seq[s]==='to-infinitive'&&object)return {start:s,end:s+1,kind:'to'};
  if(seq[s]==='verb'||seq[s]==='modal')return {start:s,end:s+1,kind:seq[s]};return null;
 }
 function afterVerb(s:number,e:number):Tail|null{
  s=skip(s,e);if(s===e)return {pattern:1};const place=pp(s,e);if(place&&skip(place.end,e)===e)return {pattern:1,pp:place};
  const state=comp(s,e);if(state&&skip(state.end,e)===e)return {pattern:2,complement:state};
  const object=np(s,e);if(!object)return null;const next=skip(object.end,e);if(next===e)return {pattern:3,object};
  const second=np(next,e);if(second&&skip(second.end,e)===e)return {pattern:4,object,second};
  if(seq[next]==='verb'){const tail=afterVerb(next+1,e);if(tail)return {pattern:5,object,vp:{start:next,tail}};}
  const complement=comp(next,e,true);if(complement&&skip(complement.end,e)===e)return {pattern:5,object,complement};
  const p=pp(next,e);if(p&&skip(p.end,e)===e)return {pattern:3,object,pp:p};return null;
 }
 const roles:ExampleRole[]=seq.map(()=> 'time'),words=seq.map(()=>''),gloss=seq.map(()=>''),nounRanges:NP[]=[];
 const cycle=(xs:string[])=>xs[((Math.floor(index)%xs.length)+xs.length)%xs.length];
 let singular=true,person1=false,question=false,imperative=false,main=-1,pattern=judgment.patternType;
 const put=(at:number,role:ExampleRole,text:string,ko:string)=>{roles[at]=role;words[at]=text;gloss[at]=ko};
 function adverbWord(i:number):[string,string]{
  if(i>start&&i<main&&seq[i]==='adverb')return seq[i-1]==='adverb'?['quietly','조용히']:['really','정말'];
  if(seq[i]==='frequency')return seq[i+1]==='frequency'?['regularly','정기적으로']:seq[i-1]==='frequency'?['and often','그리고 자주']:['often','자주'];
  if(seq[i+1]==='adverb')return i<start?['today,','오늘']:seq[i+2]==='adjective'?['really','정말']:['very','아주'];
  if(seq[i-1]==='adverb')return seq[i+1]==='adjective'?['very','매우']:i<start?['quietly','조용히']:['well','잘'];
  return i<start?['today,','오늘']:seq[i+1]==='adjective'?['very','매우']:seq[i+1]==='not'?['really','정말']:i>main&&i<stop&&result?.object?['only','오직']:['today','오늘'];
 }
 function noun(n:NP,role:ExampleRole,place=false){
  nounRanges.push(n);const k=seq[n.head];let text='',ko='';
  if(k==='proper'){text='Naro';ko='나로';}
  else if(k==='pronoun'){text=role==='subject'?(contractedNegativeQuestion?'you':cycle(['I','we','she','they'])):role==='indirect'?'them':role==='direct'?'something':role==='subjectComplement'?(imperative?'yourself':words[subject?.head??-1]==='we'?'ourselves':words[subject?.head??-1]==='she'?'herself':'myself'):'them';ko=role==='subject'?(contractedNegativeQuestion?'너':cycle(['나','우리','그녀','그들'])):role==='indirect'?'그들':role==='direct'?'무언가':role==='subjectComplement'?(imperative?'너 자신':words[subject?.head??-1]==='we'?'우리 자신':words[subject?.head??-1]==='she'?'그녀 자신':'나 자신'): '그들';}
  else if(k==='count'){
   const sets=place?['friend','guide','teacher']:role==='subject'?['teacher','student','guide']:role==='indirect'?['student','child','visitor']:role==='subjectComplement'?['guide','helper','friend']:pattern===5?['student','child','visitor']:pattern===3?['book','letter','story']:['book','letter','gift'];
   text=contractedNegativeQuestion&&n.start===n.head&&role==='object'?'apples':cycle(sets);const translations:Record<string,string>={friend:'친구',helper:'도우미',guide:'안내자',teacher:'선생님',student:'학생',child:'아이',visitor:'방문객',book:'책',letter:'편지',gift:'선물',story:'이야기',apples:'사과들'};ko=translations[text];
  }else{
   text=place?'water':role==='subject'?(pattern===1?'traffic':pattern===2?'education':'management'):role==='indirect'?'management':role==='subjectComplement'?'support':pattern===5?(result?.complement?.kind==='to'||result?.vp?'management':'work'):pattern===4?'advice':'music';
   ko=({water:'물',traffic:'교통',education:'교육',management:'경영진',staff:'직원들',support:'지원',work:'일',advice:'조언',music:'음악'} as Record<string,string>)[text];
  }
  put(n.head,role,text,ko);
  for(let i=n.start;i<n.head;i++){
   if(seq[i]==='article')put(i,role,'the','그');else if(seq[i]==='indefinite')put(i,role,'a','한');else if(seq[i]==='possessive')put(i,role,role==='subject'?'my':role==='subjectComplement'&&!imperative?'your':'our',role==='subject'?'나의':role==='subjectComplement'&&!imperative?'너의':'우리의');
   else if(seq[i]==='adjective'){const human=seq[n.head]==='proper'||seq[n.head]==='pronoun'||seq[n.head]==='count'&&(role!=='direct'&&pattern!==3);const options=text==='water'?[['clean','깨끗한'],['fresh','신선한'],['cool','시원한']]:human?[['kind','친절한'],['young','젊은'],['helpful','도움이 되는']]:[['helpful','도움이 되는'],['useful','유용한'],['good','좋은']];const option=options[(Math.floor(index)+i-n.start)%options.length];put(i,role,option[0],option[1]);}
   else if(adv(seq[i])){const w=seq[i-1]==='adverb'||seq[i+1]==='adverb'?adverbWord(i):seq[i]==='adverb'?['very','매우']:['often','자주'];put(i,role,w[0],w[1]);}
  }
  for(const p of n.pps)placePhrase(p);
 }
 function placePhrase(p:PP,preposition='near'){put(p.start,'place',preposition,preposition==='with'?'함께':'근처에서');noun(p.np,'place',true);}
 function complement(c:Complement,role:ExampleRole){
  let adjectiveIndex=0;const adjectiveCount=seq.slice(c.start,c.end).filter(k=>k==='adjective').length;
  for(let i=c.start;i<c.end;i++){
   if(seq[i]==='adjective'){
    const options=role==='objectComplement'?(seq[result?.object?.head??-1]==='mass'?[['easy','쉬운'],['useful','유용한'],['important','중요한']]:[['ready','준비된'],['confident','자신 있는'],['happy','행복한']]):seq[subject?.head??-1]==='mass'?[['important','중요한'],['useful','유용한'],['valuable','가치 있는']]:[['happy','행복한'],['calm','차분한'],['confident','자신 있는']];
    const option=seq[main]==='be'&&imperative&&seq.includes('not')&&adjectiveCount===1?['afraid','두려운']:options[adjectiveIndex];put(i,role,(adjectiveCount>1&&adjectiveIndex===adjectiveCount-1?'and ':'')+option[0]+(adjectiveCount>2&&adjectiveIndex<adjectiveCount-1?',':''),option[1]);adjectiveIndex++;
   }
   else if(adv(seq[i])){const w=adverbWord(i);put(i,role,w[0],w[1]);}
   else if(seq[i]==='to-infinitive')put(i,role,'to work','일하기');
  }
 }
 function tail(t:Tail,verb:number,finite:boolean,embedded=false):string|null{
  if(t.legacy)return t.legacy;
  if(t.complement?.kind==='modal'||t.complement?.kind==='verb')return '원본이 허용하는 일반동사·조동사 주격 보어 조합';
  let stem=t.pattern===1?(!embedded&&seq[subject?.head??-1]==='mass'?'flow':'work'):t.pattern===2?'look':t.pattern===3?(contractedNegativeQuestion&&t.object?.start===t.object?.head&&seq[t.object?.head??-1]==='count'?'like':seq[t.object?.head??-1]==='pronoun'||seq[t.object?.head??-1]==='proper'?'help':seq[t.object?.head??-1]==='mass'?'enjoy':embedded||imperative||aux>=0&&seq[aux]==='modal'?'read':'need'):t.pattern===4?(seq[t.second?.head??-1]==='proper'?'show':'give'):t.complement?.kind==='to'?'want':t.vp?'make':'make';
  if(seq[verb]==='be')stem='be';
  const verbWord=stem==='be'?(imperative||!finite?'be':person1?'am':singular?'is':'are'):finite&&singular?stem+'s':stem;
  put(verb,'verb',verbWord,({flow:'흐르다',work:'일하다',look:'보이다',need:'필요로 하다',give:'주다',want:'원하다',make:'만들다',be:'이다',read:'읽다',help:'돕다',enjoy:'즐기다',show:'보여주다',like:'좋아하다'} as Record<string,string>)[stem]);
  if(t.object)noun(t.object,t.pattern===4?'indirect':'object');if(t.second)noun(t.second,'direct');if(t.complement)complement(t.complement,t.pattern===5?'objectComplement':'subjectComplement');if(t.pp)placePhrase(t.pp);
  if(t.vp){const reason=tail(t.vp.tail,t.vp.start,false,true);if(reason)return reason;roles[t.vp.start]='objectComplement';}
  return null;
 }
 let start=skip(0,end),stop=end;while(stop>start&&adv(seq[stop-1])&&!(seq[start]==='pronoun'&&seq[start+1]==='be'&&stop===start+3&&seq[stop-1]==='adverb'))stop--;
 let subject:NP|null=null,result:Tail|null=null,aux=-1;
 if(seq[start]==='verb'){imperative=true;main=start;result=afterVerb(main+1,stop);if(!result)return fail('명령문 동사 뒤 구성을 분석할 수 없습니다.');pattern=result.pattern;const reason=tail(result,main,false);if(reason)return fail(reason);if(end===1){put(main,'verb','run','달려');}}
 else if(seq[start]==='be'){
  const parsed=np(start+1,stop),c=parsed?.pps.length&&parsed.end===stop?{...parsed,end:parsed.baseEnd,pps:[]}:parsed;main=start;
  if(!c){imperative=true;let s=skip(start+1,stop);if(seq[s]==='not')s=skip(s+1,stop);const n=np(s,stop),a=comp(s,stop),p=pp(s,stop);if(n&&skip(n.end,stop)===stop){result={pattern:2};noun(n,'subjectComplement');}else if(a?.kind==='adjective'&&skip(a.end,stop)===stop)result={pattern:2,complement:a};else if(p&&skip(p.end,stop)===stop)result={pattern:2,pp:p};if(!result)return fail('BE 명령문 보어를 분석할 수 없습니다.');const reason=tail(result,main,false);if(reason)return fail(reason);}
  else if(c.end===stop){imperative=true;put(main,'verb','be','되어라');noun(c,'subjectComplement');}
  else{question=true;subject=c;noun(subject,'subject');person1=words[subject.head]==='I';singular=seq[subject.head]!=='pronoun'||words[subject.head]==='she';let s=seq[c.end]==='adverb'&&c.end+1===stop?c.end:skip(c.end,stop);if(seq[s]==='not')s=skip(s+1,stop);const n=np(s,stop),a=comp(s,stop),p=pp(s,stop);if(n&&skip(n.end,stop)===stop){result={pattern:2};noun(n,'subjectComplement');}else if(a?.kind==='adjective'&&skip(a.end,stop)===stop)result={pattern:2,complement:a};else if(p&&skip(p.end,stop)===stop)result={pattern:2,pp:p};else if(seq[s]==='adverb'&&s+1===stop){result={pattern:2,location:s};put(s,'place','there','거기');}if(!result)return fail('BE 의문문 보어를 분석할 수 없습니다.');const reason=tail(result,main,true);if(reason)return fail(reason);}
 }else{
  if(seq[start]==='do'&&['verb','be'].includes(seq[auxSkip(start+1,stop)])){imperative=true;aux=start;main=auxSkip(start+1,stop);}
  else if(seq[start]==='do'&&seq[start+1]==='not'&&(subject=np(start+2,stop))){question=true;contractedNegativeQuestion=true;aux=start;main=auxSkip(subject.end,stop);}
  else if(seq[start]==='do'||seq[start]==='modal'){question=true;aux=start;subject=np(start+1,stop);if(subject)main=auxSkip(subject.end,stop);}
  else {subject=np(start,stop);if(subject){main=subject.end;while(adv(seq[main]))main++;if(seq[main]==='do'||seq[main]==='modal'){aux=main;main=auxSkip(main+1,stop);}}}
  if((!imperative&&!subject)||main<0||main>=stop)return fail('주어와 동사를 분석할 수 없습니다.');
  if(aux>=0&&seq[aux]==='do'&&seq[main]==='be'&&!imperative)return fail('DO 뒤 BE는 부정 명령문에서만 사용합니다.');
  if(subject){noun(subject,'subject');person1=words[subject.head]==='I';singular=seq[subject.head]!=='pronoun'||words[subject.head]==='she';}
  if(seq[main]==='be'){
   let s=seq[main+1]==='adverb'&&main+2===stop?main+1:skip(main+1,stop);if(seq[s]==='not')s=skip(s+1,stop);
   const n=np(s,stop),c=comp(s,stop),p=pp(s,stop);
   if(n&&skip(n.end,stop)===stop){result={pattern:2};noun(n,'subjectComplement');}
   else if(c?.kind==='adjective'&&skip(c.end,stop)===stop)result={pattern:2,complement:c};
   else if(p&&skip(p.end,stop)===stop)result={pattern:2,pp:p};
   else if(seq[s]==='adverb'&&s+1===stop){result={pattern:2,location:s};put(s,'place','there','거기');}
  }else if(seq[main]==='verb')result=afterVerb(main+1,stop);
  if(!result)return fail('문장 구조를 분석할 수 없습니다.');pattern=result.pattern;
  const reason=tail(result,main,imperative?false:aux<0);if(reason)return fail(reason);
  if(aux>=0)put(aux,'verb',seq[aux]==='modal'?'can':imperative?'do':singular?'does':'do',seq[aux]==='modal'?'할 수 있다':'한다');
 }
 for(const n of nounRanges){
  if(seq[n.start]==='indefinite'&&seq[n.head]==='mass')return fail('부정관사와 불가산명사를 함께 허용한 원본 조합');
  for(let i=n.start;i<n.head;i++)if(adv(seq[i])&&!seq.slice(i+1,n.head).includes('adjective'))return fail('명사 바로 앞 부사만 허용한 원본 조합');
 }
 if(seq.filter(k=>k==='not').length>1)return fail('부정어 중복 조합');
 for(let i=0;i<end;i++)if(!words[i]){
  if(seq[i]==='not')put(i,'manner',contractedNegativeQuestion&&i===aux+1?"n't":'not','않다');
  else if(seq[i]==='frequency'){const w=seq[i-1]==='frequency'||seq[i+1]==='frequency'?adverbWord(i):[i<start&&imperative?'always':i<start?'sometimes':'often',i<start&&imperative?'항상':i<start?'때때로':'자주'];put(i,'time',w[0],w[1]);}
  else if(seq[i]==='adverb'){const w=adverbWord(i);put(i,'manner',w[0],w[1]);}
  else return fail(`${CATALOG[seq[i]].name}의 역할을 분석할 수 없습니다.`);
 }
 if(result?.object&&seq.slice(main+1,result.object.start).includes('frequency'))return fail('목적어 앞 빈도부사 허용 조합');
 const particle=(text:string,yes:string,no:string)=>{const code=text.charCodeAt(text.length-1)-0xac00;return text+(code>=0&&code<11172&&code%28!==0?yes:no)};
 function koNP(n:NP):string{const base=gloss.slice(n.start,n.baseEnd).join(' ');return n.pps.map(p=>koNP(p.np)+' 근처에 있는 ').join('')+base;}
 function koAdjectives(c:Complement):string{return seq.slice(c.start,c.end).flatMap((kind,i)=>kind==='adjective'?[gloss[c.start+i]]:[]).join(', ');}
 // Inflect Korean from the parsed predicate, not English word endings.
 type KoAction={plain:string;negative:string;command:string;prohibition:string;ability:string;question:string;negativeQuestion:string};
 const actions:Record<string,KoAction>={
  work:{plain:'일한다',negative:'일하지 않는다',command:'일해라',prohibition:'일하지 마라',ability:'일할',question:'일하나요',negativeQuestion:'일하지 않나요'},
  like:{plain:'좋아한다',negative:'좋아하지 않는다',command:'좋아해라',prohibition:'좋아하지 마라',ability:'좋아할',question:'좋아하나요',negativeQuestion:'좋아하지 않나요'},
  run:{plain:'달린다',negative:'달리지 않는다',command:'달려라',prohibition:'달리지 마라',ability:'달릴',question:'달리나요',negativeQuestion:'달리지 않나요'},
  flow:{plain:'흐른다',negative:'흐르지 않는다',command:'흘러라',prohibition:'흐르지 마라',ability:'흐를',question:'흐르나요',negativeQuestion:'흐르지 않나요'},
  read:{plain:'읽는다',negative:'읽지 않는다',command:'읽어라',prohibition:'읽지 마라',ability:'읽을',question:'읽나요',negativeQuestion:'읽지 않나요'},
  need:{plain:'필요로 한다',negative:'필요로 하지 않는다',command:'필요로 해라',prohibition:'필요로 하지 마라',ability:'필요로 할',question:'필요로 하나요',negativeQuestion:'필요로 하지 않나요'},
  help:{plain:'돕는다',negative:'돕지 않는다',command:'도와라',prohibition:'돕지 마라',ability:'도울',question:'돕나요',negativeQuestion:'돕지 않나요'},
  enjoy:{plain:'즐긴다',negative:'즐기지 않는다',command:'즐겨라',prohibition:'즐기지 마라',ability:'즐길',question:'즐기나요',negativeQuestion:'즐기지 않나요'},
  give:{plain:'준다',negative:'주지 않는다',command:'줘라',prohibition:'주지 마라',ability:'줄',question:'주나요',negativeQuestion:'주지 않나요'},
  show:{plain:'보여준다',negative:'보여주지 않는다',command:'보여줘라',prohibition:'보여주지 마라',ability:'보여줄',question:'보여주나요',negativeQuestion:'보여주지 않나요'},
  make:{plain:'만든다',negative:'만들지 않는다',command:'만들어라',prohibition:'만들지 마라',ability:'만들',question:'만드나요',negativeQuestion:'만들지 않나요'},
  want:{plain:'원한다',negative:'원하지 않는다',command:'원해라',prohibition:'원하지 마라',ability:'원할',question:'원하나요',negativeQuestion:'원하지 않나요'},
  look:{plain:'보인다',negative:'보이지 않는다',command:'보여라',prohibition:'보이지 마라',ability:'보일',question:'보이나요',negativeQuestion:'보이지 않나요'},
  exist:{plain:'있다',negative:'있지 않다',command:'있어라',prohibition:'있지 마라',ability:'있을',question:'있나요',negativeQuestion:'있지 않나요'},
 };
 const copula=(text:string):KoAction=>({plain:text+'이다',negative:particle(text,'이','가')+' 아니다',command:particle(text,'이','가')+' 되어라',prohibition:particle(text,'이','가')+' 되지 마라',ability:text+'일',question:text+'인가요',negativeQuestion:particle(text,'이','가')+' 아닌가요'});
 const adjStates:Record<string,[string,string,string,string]>={afraid:['두려워한다','두려워하지','두려워해라','두려워할'],happy:['행복하다','행복하지','행복해라','행복할'],calm:['차분하다','차분하지','차분해라','차분할'],confident:['자신 있다','자신 있지','자신 있어라','자신 있을'],important:['중요하다','중요하지','중요해라','중요할'],useful:['유용하다','유용하지','유용해라','유용할'],valuable:['가치 있다','가치 있지','가치 있어라','가치 있을'],ready:['준비되다','준비되지','준비되어라','준비될'],easy:['쉽다','쉽지','쉬워져라','쉬울']};
 function adjectiveState(c:Complement):KoAction{
  const ids=seq.flatMap((kind,i)=>i>=c.start&&i<c.end&&kind==='adjective'?[i]:[]);
  if(ids.length>1){const label=koAdjectives(c)+' 상태';return copula(label);}
  const state=adjStates[words[ids[0]]?.replace(/,$/,'')]??adjStates.happy;
  return {plain:state[0],negative:state[1]+' 않다',command:state[2],prohibition:state[1]+' 마라',ability:state[3],question:state[0].endsWith('있다')?state[0].slice(0,-2)+'있나요':state[0].endsWith('하다')?state[0].slice(0,-2)+'한가요':state[0].endsWith('쉽다')?'쉬운가요':state[0].slice(0,-1)+'나요',negativeQuestion:state[1]+' 않나요'};
 }
 const adjectiveManner=(c:Complement)=>{const ids=seq.flatMap((k,i)=>i>=c.start&&i<c.end&&k==='adjective'?[i]:[]);if(ids.length>1)return koAdjectives(c)+' 상태로';const forms:Record<string,string>={happy:'행복해',calm:'차분해',confident:'자신 있어',important:'중요해',useful:'유용해',valuable:'가치 있어',ready:'준비된 상태로',easy:'쉽게'};return forms[words[ids[0]]?.replace(/,$/,'')]??'행복해'};
 function predicate(t:Tail|undefined,at:number):{prefix:string;action:KoAction}{
  const stem=words[at].replace(/s$/,'');
  if(seq[at]==='be'){
   if(t?.location!==undefined)return {prefix:'거기에 ',action:actions.exist};
   const n=nounRanges.find(n=>roles[n.head]==='subjectComplement');
   if(n)return {prefix:'',action:copula(koNP(n))};
   if(t?.pp)return {prefix:koNP(t.pp.np)+' 근처에 ',action:actions.exist};
   if(t?.complement)return {prefix:'',action:adjectiveState(t.complement)};
  }
  if(!t)return {prefix:'',action:actions.work};
  const obj=t.object?koNP(t.object):'';
  if(t.pattern===1)return {prefix:t.pp?koNP(t.pp.np)+' 근처에서 ':'',action:actions[stem]??actions.work};
  if(t.pattern===2)return {prefix:t.complement?adjectiveManner(t.complement)+' ':'',action:actions.look};
  if(t.pattern===3)return {prefix:particle(obj,'을','를')+' '+(t.pp?koNP(t.pp.np)+' 근처에서 ':''),action:actions[stem]??actions.need};
  if(t.pattern===4)return {prefix:obj+'에게 '+particle(koNP(t.second!),'을','를')+' ',action:actions[stem]??actions.give};
  if(t.complement?.kind==='to')return {prefix:particle(obj,'이','가')+' 일하기를 ',action:actions.want};
  if(t.vp){const embedded=predicate(t.vp.tail,t.vp.start);const infinitive:Record<string,string>={work:'일하게',flow:'흐르게',read:'읽게',help:'돕게',enjoy:'즐기게',need:'필요로 하게',look:'보이게',give:'주게',make:'만들게'};return {prefix:particle(obj,'이','가')+' '+embedded.prefix+(infinitive[words[t.vp.start]]??'일하게')+' ',action:actions.make};}
  return {prefix:particle(obj,'을','를')+' '+(t.complement?adjectiveManner(t.complement)+' ':''),action:actions.make};
 }
 function koreanSentence():string{
  if(imperative&&main===0&&end===1)return '달려!';
  const modifiers=seq.flatMap((k,i)=>(k==='frequency'||k==='adverb')&&i!==result?.location&&!nounRanges.some(n=>i>=n.start&&i<n.baseEnd)?[gloss[i]]:[]).join(' ');
  const {prefix,action}=predicate(result??undefined,main),negative=seq.includes('not'),modal=aux>=0&&seq[aux]==='modal';
  const endText=modal?action.ability+' 수 '+(negative?(question?'없나요':'없다'):(question?'있나요':'있다')):imperative?(negative?action.prohibition:action.command):question?(negative?action.negativeQuestion:action.question):(negative?action.negative:action.plain);
  return (subject?particle(koNP(subject),'은','는')+' ':'')+(modifiers?modifiers+' ':'')+prefix+endText+(question?'?':imperative?'!':'.');
 }
 for(let i=0;i<end;i++)if(words[i]==='a'&&/^[aeiou]/i.test(words[i+1]??''))words[i]='an';
 const parts=used.map((c,i)=>({text:i===0?words[i][0].toUpperCase()+words[i].slice(1):words[i],role:roles[i],kind:c.kind,cardId:c.id,gloss:gloss[i]}));
 const english=parts.map(p=>p.text).join(' ').replace(/ n't\b/g,"n't")+(question?'?':imperative?'!':'.');
 return {positions:seq,example:{id:`cards-${used.map(c=>c.id).join('-')}-${index}`,patternType:pattern,parts,english,korean:koreanSentence(),imperative,cardAligned:true}};
}
