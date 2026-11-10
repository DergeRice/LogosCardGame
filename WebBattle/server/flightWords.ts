/** The order and Korean meanings come from the supplied irregular-verb list. */
const rows=`bear|낳다|bore|born
ride|자전거 타다|rode|ridden
rise|오르다|rose|risen
wake|깨우다, 일어나다|woke|woken
wear|옷을 입다|wore|worn
break|깨다|broke|broken
drive|운전하다|drove|driven
speak|말하다|spoke|spoken
steal|훔치다|stole|stolen
write|글을 쓰다|wrote|written
fly|날다|flew|flown
blow|바람 불다|blew|blown
draw|당기다, 그리다|drew|drawn
grow|자라다|grew|grown
know|알다|knew|known
throw|던지다|threw|thrown
withdraw|인출하다, 철회하다|withdrew|withdrawn
overthrow|전복시키다|overthrew|overthrown
ring|소리 울리다|rang|rung
sing|노래하다|sang|sung
sink|가라앉다|sank|sunk
spin|회전시키다|span|spun
swim|수영하다|swam|swum
begin|시작하다|began|begun
drink|마시다|drank|drunk
shrink|줄어들다|shrank|shrunk
spring|뛰어오르다|sprang|sprung
lay|놓다, 눕히다|laid|laid
pay|지불하다|paid|paid
say|말하다|said|said
find|찾다|found|found
hear|소리 듣다|heard|heard
hold|잡다, 들고 있다|held|held
lead|이끌다|led|led
make|만들다|made|made
sell|물건 팔다|sold|sold
tell|말하다, 알리다|told|told
feel|느끼다|felt|felt
keep|유지하다|kept|kept
lend|빌려주다|lent|lent
lose|잃다|lost|lost
meet|만나다|met|met
send|보내다|sent|sent
build|건설하다|built|built
leave|남기다, 떠나다|left|left
sleep|잠자다|slept|slept
spend|돈 쓰다, 시간 보내다|spent|spent
buy|물건 사다|bought|bought
bring|가져오다|brought|brought
catch|잡다, 받다|caught|caught
fight|싸우다|fought|fought
seek|찾다, 추구하다|sought|sought
teach|가르치다|taught|taught
think|생각하다|thought|thought`;

type RawVerb={base:string;meaning:string;past:string;participle:string};
const parsed:RawVerb[]=rows.split('\n').map(row=>{const [base,meaning,past,participle]=row.split('|');return {base,meaning,past,participle};});
function editDistance(a:string,b:string){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));previous=old;}}return row[b.length];}
function regularized(base:string){return base.endsWith('e')?base+'d':base.endsWith('y')?base.slice(0,-1)+'ied':base+'ed';}
function wrongForms(verb:RawVerb,form:'past'|'participle'){
 const correct=verb[form],other=form==='past'?verb.participle:verb.past;
 const choices=[regularized(verb.base),other,verb.base,...parsed.filter(item=>item.base!==verb.base).flatMap(item=>[item.past,item.participle])];
 return [...new Set(choices.filter(value=>value!==correct))].sort((a,b)=>{
  const aPriority=a===regularized(verb.base)?-2:a===other?-1:a===verb.base?0:1;
  const bPriority=b===regularized(verb.base)?-2:b===other?-1:b===verb.base?0:1;
  return aPriority-bPriority||editDistance(a,correct)-editDistance(b,correct)||a.localeCompare(b);
 }).slice(0,4);
}
export type FlightVerb=RawVerb&{wrongPast:readonly string[];wrongParticiple:readonly string[]};
export const FLIGHT_VERBS:readonly FlightVerb[]=parsed.map(verb=>({...verb,wrongPast:wrongForms(verb,'past'),wrongParticiple:wrongForms(verb,'participle')}));
