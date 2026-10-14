import {type Card,type Judgment,type Kind,CATALOG} from './rules.js';
import {type SentenceExample,type ExampleRole} from './sentence-examples.js';
type NP={start:number;end:number;head:number;baseEnd:number;pps:PP[]};
type PP={start:number;end:number;np:NP};
type Complement={start:number;end:number;kind:'adjective'|'to'|'verb'|'modal'};
type Tail={pattern:number;object?:NP;second?:NP;complement?:Complement;vp?:{start:number;tail:Tail};pp?:PP;legacy?:string};
export type CardExampleResult={example:SentenceExample|null;reason?:string;positions:Kind[]};

/** Presentation parser for the active deck. The battle judgment stays authoritative.
 * Greedy NP/PP parsing and branch order mirror the Unity port; no scoring rules change.
 */
export function cardSentenceExample(cards:Card[],judgment:Judgment,index=0):CardExampleResult{
 const used=cards.slice(judgment.usedStartIndex,judgment.usedStartIndex+judgment.usedLength),seq=used.map(c=>c.kind),end=seq.length;
 const fail=(reason:string):CardExampleResult=>({example:null,reason,positions:seq});
 if(!judgment.valid||!end)return fail('인정된 문장 구간이 없습니다.');
 const adv=(k:Kind)=>k==='adverb'||k==='frequency';
 const skip=(s:number,e:number)=>{while(s<e&&adv(seq[s]))s++;return s};
 const auxSkip=(s:number,e:number)=>{while(s<e&&(adv(seq[s])||seq[s]==='not'))s++;return s};
 function np(s:number,e:number):NP|null{
  const start=s;if(s>=e)return null;let head=-1;
  if(seq[s]==='pronoun'||seq[s]==='mass')head=s;
  else if(['article','indefinite','possessive'].includes(seq[s])){s++;while(s<e&&(seq[s]==='adjective'||adv(seq[s])))s++;if(s<e&&(seq[s]==='count'||seq[s]==='mass'))head=s;}
  else if(seq[s]==='adjective'){s++;while(s<e&&seq[s]==='adjective')s++;if(s<e&&seq[s]==='mass')head=s;}
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
  if(seq[i]==='frequency')return seq[i+1]==='frequency'?['almost','거의']:seq[i-1]==='frequency'?['always','항상']:['often','자주'];
  if(seq[i+1]==='adverb')return i<start?['today,','오늘']:seq[i+2]==='adjective'?['really','정말']:['very','아주'];
  if(seq[i-1]==='adverb')return seq[i+1]==='adjective'?['very','매우']:i<start?['quietly','조용히']:['well','잘'];
  return seq[i+1]==='adjective'?['very','매우']:seq[i+1]==='not'?['really','정말']:i>main&&i<stop&&result?.object?['only','오직']:['today','오늘'];
 }
 function noun(n:NP,role:ExampleRole,place=false){
  nounRanges.push(n);const k=seq[n.head];let text='',ko='';
  if(k==='pronoun'){text=role==='subject'?cycle(['I','we','she']):role==='indirect'?'us':role==='subjectComplement'?'me':'them';ko=role==='subject'?cycle(['나','우리','그녀']):role==='indirect'?'우리':role==='subjectComplement'?'나': '그들';}
  else if(k==='count'){
   const sets=place?['friend','guide','teacher']:role==='subject'?['teacher','student','guide']:role==='indirect'?['student','child','visitor']:role==='subjectComplement'?['guide','helper','friend']:pattern===5?['student','child','visitor']:['book','letter','gift'];
   text=cycle(sets);const translations:Record<string,string>={friend:'친구',helper:'도우미',guide:'안내자',teacher:'선생님',student:'학생',child:'아이',visitor:'방문객',book:'책',letter:'편지',gift:'선물'};ko=translations[text];
  }else{
   text=place?'water':role==='subject'?(pattern===1?'traffic':pattern===2?'education':'management'):role==='indirect'?'staff':role==='subjectComplement'?'support':pattern===5?(result?.complement?.kind==='to'||result?.vp?'staff':'work'):pattern===4?'advice':'music';
   ko=({water:'물',traffic:'교통',education:'교육',management:'경영진',staff:'직원들',support:'지원',work:'일',advice:'조언',music:'음악'} as Record<string,string>)[text];
  }
  put(n.head,role,text,ko);
  for(let i=n.start;i<n.head;i++){
   if(seq[i]==='article')put(i,role,'the','그');else if(seq[i]==='indefinite')put(i,role,'a','한');else if(seq[i]==='possessive')put(i,role,role==='subject'?'my':role==='subjectComplement'&&!imperative?'your':'our',role==='subject'?'나의':role==='subjectComplement'&&!imperative?'너의':'우리의');
   else if(seq[i]==='adjective'){const human=seq[n.head]==='count'&&(role!=='direct'&&pattern!==3);const options=text==='water'?[['clean','깨끗한'],['fresh','신선한'],['cool','시원한']]:human?[['kind','친절한'],['young','젊은'],['helpful','도움이 되는']]:[['helpful','도움이 되는'],['useful','유용한'],['good','좋은']];const option=options[(Math.floor(index)+i-n.start)%options.length];put(i,role,option[0],option[1]);}
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
    const option=options[adjectiveIndex];put(i,role,option[0]+(adjectiveIndex<adjectiveCount-1?',':''),option[1]);adjectiveIndex++;
   }
   else if(adv(seq[i])){const w=adverbWord(i);put(i,role,w[0],w[1]);}
   else if(seq[i]==='to-infinitive')put(i,role,'to work','일하기');
  }
 }
 function tail(t:Tail,verb:number,finite:boolean,embedded=false):string|null{
  if(t.legacy)return t.legacy;
  if(t.complement?.kind==='modal'||t.complement?.kind==='verb')return '원본이 허용하는 일반동사·조동사 주격 보어 조합';
  let stem=t.pattern===1?(!embedded&&seq[subject?.head??-1]==='mass'?'flow':'work'):t.pattern===2?'look':t.pattern===3?(embedded?'read':'need'):t.pattern===4?'give':t.complement?.kind==='to'?'want':t.vp?'make':'make';
  if(seq[verb]==='be')stem='be';
  const verbWord=stem==='be'?(imperative||!finite?'be':person1?'am':singular?'is':'are'):finite&&singular?stem+'s':stem;
  put(verb,'verb',verbWord,({flow:'흐르다',work:'일하다',look:'보이다',need:'필요로 하다',give:'주다',want:'원하다',make:'만들다',be:'이다',read:'읽다'} as Record<string,string>)[stem]);
  if(t.object)noun(t.object,t.pattern===4?'indirect':'object');if(t.second)noun(t.second,'direct');if(t.complement)complement(t.complement,t.pattern===5?'objectComplement':'subjectComplement');if(t.pp)placePhrase(t.pp);
  if(t.vp){const reason=tail(t.vp.tail,t.vp.start,false,true);if(reason)return reason;roles[t.vp.start]='objectComplement';}
  return null;
 }
 let start=skip(0,end),stop=end;while(stop>start&&adv(seq[stop-1]))stop--;
 let subject:NP|null=null,result:Tail|null=null,aux=-1;
 if(end===1&&seq[0]==='verb'){imperative=true;main=0;put(0,'verb','run','달려');}
 else if(seq[start]==='be'){
  const c=np(start+1,stop);if(!c||c.end!==stop)return fail('BE 시작 구간을 분석할 수 없습니다.');imperative=true;main=start;put(main,'verb','be','되어라');noun(c,'subjectComplement');
 }else{
  if(seq[start]==='do'&&seq[start+1]==='not'){imperative=true;aux=start;main=auxSkip(start+1,stop);}
  else if(seq[start]==='do'||seq[start]==='modal'){question=true;aux=start;subject=np(start+1,stop);if(subject)main=auxSkip(subject.end,stop);}
  else {subject=np(start,stop);if(subject){main=subject.end;while(seq[main]==='frequency')main++;if(seq[main]==='do'||seq[main]==='modal'){aux=main;main=auxSkip(main+1,stop);}}}
  if((!imperative&&!subject)||main<0||main>=stop)return fail('주어와 동사를 분석할 수 없습니다.');
  if(subject){noun(subject,'subject');person1=words[subject.head]==='I';singular=seq[subject.head]!=='pronoun'||words[subject.head]==='she';}
  if(seq[main]==='be'){
   let s=skip(main+1,stop);if(seq[s]==='not')s=skip(s+1,stop);
   const n=np(s,stop),c=comp(s,stop),p=pp(s,stop);
   if(n&&skip(n.end,stop)===stop){result={pattern:2};noun(n,'subjectComplement');}
   else if(c?.kind==='adjective'&&skip(c.end,stop)===stop)result={pattern:2,complement:c};
   else if(p&&skip(p.end,stop)===stop)result={pattern:2,pp:p};
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
  if(seq[i]==='not')put(i,'manner','not','않다');
  else if(seq[i]==='frequency'){const w=seq[i-1]==='frequency'||seq[i+1]==='frequency'?adverbWord(i):[i<start&&imperative?'always':i<start?'sometimes':'often',i<start&&imperative?'항상':i<start?'때때로':'자주'];put(i,'time',w[0],w[1]);}
  else if(seq[i]==='adverb'){const w=adverbWord(i);put(i,'manner',w[0],w[1]);}
  else return fail(`${CATALOG[seq[i]].name}의 역할을 분석할 수 없습니다.`);
 }
 if(result?.object&&seq.slice(main+1,result.object.start).includes('frequency'))return fail('목적어 앞 빈도부사 허용 조합');
 const particle=(text:string,yes:string,no:string)=>{const code=text.charCodeAt(text.length-1)-0xac00;return text+(code>=0&&code<11172&&code%28!==0?yes:no)};
 function koNP(n:NP):string{const base=gloss.slice(n.start,n.baseEnd).join(' ');return n.pps.map(p=>koNP(p.np)+' 근처에 있는 ').join('')+base;}
 function koAdjectives(c:Complement):string{return seq.slice(c.start,c.end).flatMap((kind,i)=>kind==='adjective'?[gloss[c.start+i]]:[]).join(', ');}
 function koTail(t:Tail):string{
  const obj=t.object?koNP(t.object):'',second=t.second?koNP(t.second):'';
  if(t.pattern===1)return (t.pp?koNP(t.pp.np)+' 근처에서 ':'')+(words[main].startsWith('flow')?'흐른다':'일한다');
  if(t.pattern===2){if(t.complement){if(seq.slice(t.complement.start,t.complement.end).filter(k=>k==='adjective').length>1)return koAdjectives(t.complement)+' 상태로 보인다';const adjective=gloss[t.complement.end-1];return adjective==='행복한'?'행복해 보인다':'중요해 보인다';}return '이다';}
  if(t.pattern===3)return particle(obj,'을','를')+' 필요로 한다';
  if(t.pattern===4)return obj+'에게 '+particle(second,'을','를')+' 준다';
  if(t.complement?.kind==='to'){const inner=seq.flatMap((k,i)=>i>t.complement!.start&&(k==='frequency'||k==='adverb')?[gloss[i]]:[]).join(' ');return particle(obj,'이','가')+' '+(inner?inner+' ':'')+'일하기를 원한다';}
  if(t.vp)return particle(obj,'을','를')+' '+(t.vp.tail.pattern===1?'일하게':t.vp.tail.object?particle(koNP(t.vp.tail.object),'을','를')+' 읽게':'일하게')+' 만든다';
  return particle(obj,'을','를')+' '+(t.complement&&seq.slice(t.complement.start,t.complement.end).filter(k=>k==='adjective').length>1?koAdjectives(t.complement)+' 상태로':t.complement&&gloss[t.complement.end-1]==='쉬운'?'쉽게':'준비된 상태로')+' 만든다';
 }
 function koreanSentence():string{
  const modifiers=seq.flatMap((k,i)=>result?.complement?.kind==='to'&&i>result.complement.start?[]:k==='frequency'?[gloss[i]]:k==='adverb'&&!nounRanges.some(n=>i>=n.start&&i<n.baseEnd)?[gloss[i]]:[]).join(' ');
  let predicate='';
  if(imperative)predicate=seq[0]==='do'&&seq[1]==='not'?'하지 마!':main===0&&end===1?'달려!':(nounRanges[0]?particle(koNP(nounRanges[0]),'이','가')+' 되어라!':'되어라!');
  else if(seq[main]==='be'){
   const c=nounRanges.find(n=>roles[n.head]==='subjectComplement');
   if(c)predicate=koNP(c)+'이다';else if(result?.pp)predicate=koNP(result.pp.np)+' 근처에 있다';else if(result?.complement&&seq.slice(result.complement.start,result.complement.end).filter(k=>k==='adjective').length>1)predicate=koAdjectives(result.complement)+' 상태이다';else predicate=result?.complement&&gloss[result.complement.end-1]==='중요한'?'중요하다':'행복하다';
  }else predicate=result?koTail(result):'';
  if(!imperative&&seq.includes('not'))predicate=predicate.endsWith('흐른다')?predicate.slice(0,-3)+'흐르지 않는다':predicate.endsWith('이다')?predicate.slice(0,-2)+'이 아니다':predicate.endsWith('한다')?predicate.slice(0,-2)+'하지 않는다':predicate.endsWith('준다')?predicate.slice(0,-2)+'주지 않는다':predicate.endsWith('원한다')?predicate.slice(0,-3)+'원하지 않는다':predicate.endsWith('만든다')?predicate.slice(0,-3)+'만들지 않는다':predicate.endsWith('있다')?predicate.slice(0,-2)+'있지 않다':predicate.endsWith('보인다')?predicate.slice(0,-3)+'보이지 않는다':predicate.endsWith('하다')?predicate.slice(0,-2)+'하지 않다':predicate;
  if(aux>=0&&seq[aux]==='modal'){
   const positive=seq[main]==='be'?(predicate.includes('근처')?'있을 수':predicate.includes('행복')?'행복할 수':predicate.includes('중요')?'중요할 수':predicate.replace(/이 아니다$|이다$/,'')+'일 수'):result?.pattern===1?(words[main].startsWith('flow')?'흐를 수':'일할 수'):result?.pattern===2?'보일 수':result?.pattern===3?'필요로 할 수':result?.pattern===4?'줄 수':result?.complement?.kind==='to'?'원할 수':'만들 수';
   const base=result?.pattern===1&&result.pp?koNP(result.pp.np)+' 근처에서 ':seq[main]==='be'?predicate.includes('근처')?predicate.slice(0,predicate.lastIndexOf('근처')+2)+'에 ':'':result?.object?(result.pattern===4?koNP(result.object)+'에게 '+particle(koNP(result.second!),'을','를')+' ':result.pattern===5&&result.complement?.kind==='to'?particle(koNP(result.object),'이','가')+' 일하기를 ':particle(koNP(result.object),'을','를')+' '+(result.pattern===5&&result.complement?(gloss[result.complement.end-1]==='쉬운'?'쉽게 ':'준비된 상태로 '):'')):result?.pattern===2&&result.complement?(gloss[result.complement.end-1]==='행복한'?'행복해 ':'중요해 '):'';
   predicate=base+positive+(seq.includes('not')?' 없다':' 있다');
  }
  let text=(subject?particle(koNP(subject),'은','는')+' ':'')+(modifiers?modifiers+' ':'')+predicate;
  if(question)text=text.endsWith('흐른다')?text.slice(0,-3)+'흐르나요?':text.endsWith('한다')?text.slice(0,-2)+'하나요?':text.endsWith('준다')?text.slice(0,-2)+'주나요?':text.endsWith('이다')?text.slice(0,-2)+'인가요?':text.endsWith('있다')?text.slice(0,-2)+'있나요?':text+'?';
  else if(!imperative)text+='.';
  return text;
 }
 for(let i=0;i<end;i++)if(words[i]==='a'&&/^[aeiou]/i.test(words[i+1]??''))words[i]='an';
 const parts=used.map((c,i)=>({text:i===0?words[i][0].toUpperCase()+words[i].slice(1):words[i],role:roles[i],kind:c.kind,cardId:c.id,gloss:gloss[i]}));
 const english=parts.map(p=>p.text).join(' ')+(question?'?':imperative?'!':'.');
 return {positions:seq,example:{id:`cards-${used.map(c=>c.id).join('-')}-${index}`,patternType:pattern,parts,english,korean:koreanSentence(),imperative,cardAligned:true}};
}
