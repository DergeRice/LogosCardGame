import type {Kind} from './rules.js';
export type ExampleRole='subject'|'verb'|'object'|'indirect'|'direct'|'subjectComplement'|'objectComplement'|'manner'|'place'|'time'|'target'|'accompaniment';
export type ExamplePart={text:string;role:ExampleRole;kind?:Kind;cardId?:string};
export type SentenceExample={id:string;patternType:number;parts:ExamplePart[];english:string;korean:string;imperative?:boolean;cardAligned?:boolean};
export const EXAMPLE_ROLE_LABELS:Record<ExampleRole,string>={subject:'주어',verb:'동사',object:'목적어',indirect:'간접 목적어',direct:'직접 목적어',subjectComplement:'주격 보어',objectComplement:'목적격 보어',manner:'방법',place:'장소',time:'시간',target:'대상 부사어',accompaniment:'곁들임 부사어'};
type Modifier=ExamplePart&{ko:string};
type Seed={patternType:number;core:ExamplePart[];ko:string;modifiers:[Modifier,Modifier,Modifier];alternatives:[Modifier,Modifier]};
const p=(role:ExampleRole,text:string):ExamplePart=>({role,text});
const m=(role:ExampleRole,text:string,ko:string):Modifier=>({role,text,ko});
// 15 reviewed base sentences × 10 distinct versions = 150 examples.
// Seven nonempty subsets of three fitting adjuncts, plus two alternative adjuncts.
// They teach the detected form; they are not a translation of the submitted cards.
const seeds:Seed[]=[
 {patternType:1,core:[p('subject','I'),p('verb','run')],ko:'나는 달린다',modifiers:[m('manner','quickly','빠르게'),m('place','in the park','공원에서'),m('time','every morning','매일 아침')],alternatives:[m('time','after school','방과 후에'),m('place','along the river','강을 따라')]},
 {patternType:1,core:[p('subject','Birds'),p('verb','fly')],ko:'새들이 난다',modifiers:[m('manner','gracefully','우아하게'),m('place','over the forest','숲 위에서'),m('time','at dawn','새벽에')],alternatives:[m('time','in the morning','아침에'),m('place','above the lake','호수 위에서')]},
 {patternType:1,core:[p('subject','The baby'),p('verb','sleeps')],ko:'아기가 잔다',modifiers:[m('manner','peacefully','평온하게'),m('place','in the bedroom','침실에서'),m('time','at night','밤에')],alternatives:[m('time','after lunch','점심 식사 후에'),m('place','in the crib','아기 침대에서')]},
 {patternType:2,core:[p('subject','She'),p('verb','is'),p('subjectComplement','kind')],ko:'그녀는 친절하다',modifiers:[m('target','to everyone','모두에게'),m('place','at school','학교에서'),m('time','every day','매일')],alternatives:[m('time','even on busy days','바쁜 날에도'),m('place','at work','직장에서')]},
 {patternType:2,core:[p('subject','He'),p('verb','becomes'),p('subjectComplement','a teacher')],ko:'그는 선생님이 된다',modifiers:[m('manner','through hard work','노력을 통해'),m('place','in Seoul','서울에서'),m('time','after graduation','졸업 후에')],alternatives:[m('time','after years of study','오랜 공부 끝에'),m('place','at a local school','지역 학교에서')]},
 {patternType:2,core:[p('subject','The soup'),p('verb','tastes'),p('subjectComplement','good')],ko:'수프는 맛이 좋다',modifiers:[m('accompaniment','with fresh bread','갓 구운 빵과 함께 먹으면'),m('place','at this restaurant','이 식당에서'),m('time','on cold days','추운 날에')],alternatives:[m('time','in winter','겨울에'),m('place','at home','집에서')]},
 {patternType:3,core:[p('subject','I'),p('verb','like'),p('object','music')],ko:'나는 음악을 좋아한다',modifiers:[m('manner','without reservation','아낌없이'),m('place','in any setting','어떤 환경에서든'),m('time','at any time','언제든')],alternatives:[m('time','even on busy days','바쁜 날에도'),m('place','at home','집에서')]},
 {patternType:3,core:[p('subject','She'),p('verb','reads'),p('object','a book')],ko:'그녀는 책을 읽는다',modifiers:[m('manner','quietly','조용히'),m('place','in the library','도서관에서'),m('time','every afternoon','매일 오후에')],alternatives:[m('time','before bed','잠자리에 들기 전에'),m('place','on the train','기차에서')]},
 {patternType:3,core:[p('subject','We'),p('verb','drink'),p('object','water')],ko:'우리는 물을 마신다',modifiers:[m('manner','slowly','천천히'),m('place','at home','집에서'),m('time','after exercise','운동 후에')],alternatives:[m('time','every morning','매일 아침'),m('place','in the kitchen','부엌에서')]},
 {patternType:4,core:[p('subject','He'),p('verb','gives'),p('indirect','me'),p('direct','a book')],ko:'그는 나에게 책을 준다',modifiers:[m('manner','with a smile','미소를 지으며'),m('place','at school','학교에서'),m('time','every Friday','매주 금요일에')],alternatives:[m('time','on my birthday','내 생일에'),m('place','in the library','도서관에서')]},
 {patternType:4,core:[p('subject','She'),p('verb','teaches'),p('indirect','us'),p('direct','English')],ko:'그녀는 우리에게 영어를 가르친다',modifiers:[m('manner','patiently','인내심 있게'),m('place','in the classroom','교실에서'),m('time','every morning','매일 아침')],alternatives:[m('time','after lunch','점심 식사 후에'),m('place','at the community center','지역 문화센터에서')]},
 {patternType:4,core:[p('subject','I'),p('verb','send'),p('indirect','him'),p('direct','a letter')],ko:'나는 그에게 편지를 보낸다',modifiers:[m('manner','by mail','우편으로'),m('place','from Seoul','서울에서'),m('time','every month','매달')],alternatives:[m('time','on his birthday','그의 생일에'),m('place','from home','집에서')]},
 {patternType:5,core:[p('subject','The news'),p('verb','makes'),p('object','me'),p('objectComplement','happy')],ko:'그 소식은 나를 행복하게 한다',modifiers:[m('manner','without fail','어김없이'),m('place','at work','직장에서'),m('time','every day','매일')],alternatives:[m('time','in the morning','아침에'),m('place','at home','집에서')]},
 {patternType:5,core:[p('subject','We'),p('verb','call'),p('object','him'),p('objectComplement','a genius')],ko:'우리는 그를 천재라고 부른다',modifiers:[m('manner','with admiration','감탄하며'),m('place','at school','학교에서'),m('time','after every game','매 경기 후에')],alternatives:[m('time','after class','수업 후에'),m('place','in our club','우리 동아리에서')]},
 {patternType:5,core:[p('subject','I'),p('verb','want'),p('object','you'),p('objectComplement','to study')],ko:'나는 네가 공부하기를 원한다',modifiers:[m('manner','carefully','꼼꼼하게'),m('place','in the library','도서관에서'),m('time','every afternoon','매일 오후에')],alternatives:[m('time','after school','방과 후에'),m('place','at home','집에서')]},
];
function build(seed:Seed,index:number):SentenceExample[]{
 const variants:Modifier[][]=[[]];for(let mask=1;mask<8;mask++)variants.push(seed.modifiers.filter((_,i)=>Boolean(mask&(1<<i))));variants.push([seed.alternatives[0]],[seed.alternatives[1]]);
 return variants.map((mods,v)=>{
  const parts=[...seed.core,...mods.map(({role,text})=>({role,text}))];
  // Korean modifiers precede the predicate they describe, including infinitive complements.
  const ordered=[...mods].sort((a,b)=>(a.role==='time'?0:a.role==='place'?1:2)-(b.role==='time'?0:b.role==='place'?1:2));
  let korean=seed.ko;
  if(seed.patternType===5&&index===14)korean=`나는 네가 ${ordered.map(x=>x.ko).join(' ')}${mods.length?' ':''}공부하기를 원한다`;
  else korean=`${ordered.map(x=>x.ko).join(' ')}${mods.length?' ':''}${seed.ko}`;
  return {id:`form-${seed.patternType}-${index%3+1}-${v+1}`,patternType:seed.patternType,parts,english:parts.map(x=>x.text).join(' ')+'.',korean:korean+'.'};
 });
}
export const SENTENCE_EXAMPLES:SentenceExample[]=seeds.flatMap(build);
export const FORM_STRUCTURES:Record<number,string>={1:'주어 + 동사',2:'주어 + 동사 + 주격 보어',3:'주어 + 동사 + 목적어',4:'주어 + 동사 + 간접 목적어 + 직접 목적어',5:'주어 + 동사 + 목적어 + 목적격 보어'};
export function chooseSentenceExample(pattern:number,index:number,imperative=false,toComplement=false):SentenceExample{
 if(imperative)return {id:'command-run',patternType:1,imperative:true,parts:[p('verb','Run')],english:'Run!',korean:'달려!'};
 const pool=SENTENCE_EXAMPLES.filter(e=>e.patternType===pattern&&(!toComplement||e.parts.some(p=>p.role==='objectComplement'&&p.text==='to study')));
 const cursor=((Math.floor(index)%pool.length)+pool.length)%pool.length;
 return pool[pool.length===30?(cursor%3)*10+Math.floor(cursor/3):cursor]??SENTENCE_EXAMPLES[0];
}
