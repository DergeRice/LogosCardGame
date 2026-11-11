import type {Card, Kind} from './rules.js';
import type {ExampleRole, SentenceExample} from './sentence-examples.js';

type Noun = {start:number; end:number; head:number};
type ToPhrase = {start:number; end:number; object?:Noun};
type Use = 'noun-subject'|'noun-object'|'noun-complement'|'object-complement'|'adjective'|'adverb';
type Parsed = {use:Use; pattern:number; subject?:Noun; object?:Noun; to:ToPhrase; verb:number; adjective?:number; prep?:number; prepObject?:Noun; manner?:number};

/** The To card contains its base verb. An optional noun phrase after it belongs to that verb. */
export function parseToInfinitive(kinds:readonly Kind[]):Parsed|null {
 const k=kinds, end=k.length;
 const noun=(at:number):Noun|null=>{
  if(at>=end)return null;
  if(['pronoun','proper','mass'].includes(k[at]))return {start:at,end:at+1,head:at};
  if(['article','indefinite','possessive'].includes(k[at])){let i=at+1;while(k[i]==='adjective')i++;if(k[i]==='count'||k[i]==='mass')return {start:at,end:i+1,head:i};}
  return null;
 };
 const phrase=(at:number):ToPhrase|null=>{
  if(k[at]!=='to-infinitive')return null;
  const object=noun(at+1);return {start:at,end:object?.end??at+1,object:object??undefined};
 };
 const subjectTo=phrase(0);
 if(subjectTo&&subjectTo.end<end){
  const v=subjectTo.end;
  if(k[v]==='be'&&v+2===end&&k[v+1]==='adjective')return {use:'noun-subject',pattern:2,to:subjectTo,verb:v,adjective:v+1};
 }
 const subject=noun(0);if(!subject)return null;
 const v=subject.end;if(k[v]!=='verb'&&k[v]!=='be')return null;
 const direct=phrase(v+1);
 if(direct?.end===end)return {use:k[v]==='be'?'noun-complement':'noun-object',pattern:k[v]==='be'?2:3,subject,to:direct,verb:v};
 if(k[v]!=='verb')return null;
 const object=noun(v+1);
 if(object){
  const after=phrase(object.end);
  if(after?.end===end){const complement=['pronoun','proper','mass'].includes(k[object.head]);return {use:complement?'object-complement':'adjective',pattern:complement?5:3,subject,object,to:after,verb:v};}
 }
 // A manner or place phrase makes the infinitive a purpose adjunct.
  if(k[v+1]==='adverb'){
  const purpose=phrase(v+2);if(purpose?.end===end)return {use:'adverb',pattern:1,subject,to:purpose,verb:v,manner:v+1};
 }
 if(k[v+1]==='preposition'){
  const place=noun(v+2),purpose=place&&phrase(place.end);
  if(place&&purpose?.end===end)return {use:'adverb',pattern:1,subject,to:purpose,verb:v,prep:v+1,prepObject:place};
 }
 return null;
}

export function toInfinitiveExample(cards:Card[], parsed:Parsed):SentenceExample {
 const parts=cards.map(c=>({text:'',role:'object' as ExampleRole,kind:c.kind,cardId:c.id}));
 const put=(i:number,role:ExampleRole,text:string)=>{parts[i].role=role;parts[i].text=text};
 const noun=(n:Noun,role:ExampleRole,word:string)=>{
  for(let i=n.start;i<n.head;i++)put(i,role,cards[i].kind==='possessive'?'my':cards[i].kind==='article'?'the':cards[i].kind==='adjective'?'interesting':'a');
  put(n.head,role,word);
 };
 const k=cards.map(c=>c.kind), t=parsed.to;
 const toObject=t.object;
 const infinitive=toObject?(parsed.use==='adjective'?'to help':k[toObject.head]==='mass'?'to enjoy':k[toObject.head]==='pronoun'?'to help':'to read'):parsed.use==='adjective'?'to read':parsed.use==='adverb'?'to help':'to work';
 put(t.start,parsed.use==='adjective'?'objectComplement':parsed.use==='adverb'?'manner':parsed.use==='noun-subject'?'subject':parsed.use==='object-complement'?'objectComplement':parsed.use==='noun-complement'?'subjectComplement':'object',infinitive);
 if(toObject)noun(toObject,'object',k[toObject.head]==='mass'?'music':k[toObject.head]==='pronoun'?'them':parsed.use==='adjective'?'student':'book');
 if(parsed.subject)noun(parsed.subject,'subject',k[parsed.subject.head]==='mass'?'management':k[parsed.subject.head]==='count'?parsed.use==='noun-complement'?'plan':'teacher':k[parsed.subject.head]==='proper'?'Naro':'I');
 if(parsed.object)noun(parsed.object,'object',k[parsed.object.head]==='mass'?'management':k[parsed.object.head]==='count'?toObject?'teacher':'book':k[parsed.object.head]==='proper'?'Naro':'them');
 const finite=parsed.subject&&k[parsed.subject.head]!=='pronoun';
 const verbs:Record<Use,string>={'noun-subject':'is','noun-object':finite?'wants':'want','noun-complement':parsed.subject&&k[parsed.subject.head]==='pronoun'?'am':'is','object-complement':finite?'wants':'want',adjective:finite?'needs':'need',adverb:finite?'works':'work'};
 put(parsed.verb,'verb',verbs[parsed.use]);
 if(parsed.adjective!==undefined)put(parsed.adjective,'subjectComplement','useful');
 if(parsed.manner!==undefined)put(parsed.manner,'manner','quietly');
 if(parsed.prep!==undefined&&parsed.prepObject){put(parsed.prep,'place','with');noun(parsed.prepObject,'place',k[parsed.prepObject.head]==='pronoun'?'friends':'friends');}
 const english=parts.map((p,i)=>p.text==='a'&&/^[aeiou]/i.test(parts[i+1]?.text??'')?'an':p.text).join(' ').replace(/^./,c=>c.toUpperCase())+'.';
 const action=infinitive==='to read'?'읽다':infinitive==='to enjoy'?'즐기다':infinitive==='to help'?'돕다':'일하다';
 const objectKo=toObject?(k[toObject.head]==='mass'?'음악을 ':k[toObject.head]==='pronoun'?'그들을 ':parsed.use==='adjective'?'학생을 ':'책을 '):'';
 const actionKo=action==='읽다'?'읽':action==='즐기다'?'즐기':action==='돕다'?'돕':'일하';
 const phraseKo=objectKo+actionKo+'는 것';
 const korean:Record<Use,string>={
  'noun-subject':`${phraseKo}은 유익하다.`,
  'noun-object':`나는 ${objectKo}${actionKo}기를 원한다.`,
  'noun-complement':`나의 계획은 ${phraseKo}이다.`,
  'object-complement':`나는 그들이 ${objectKo}${actionKo}기를 원한다.`,
  adjective:toObject?`나는 ${objectKo}${actionKo} 선생님이 필요하다.`:'나는 읽을 책이 필요하다.',
  adverb:`나는 ${objectKo}${actionKo}기 위해 조용히 일한다.`
 };
 return {id:`to-${cards.map(c=>c.id).join('-')}`,patternType:parsed.pattern,parts,english,korean:korean[parsed.use],cardAligned:true};
}
