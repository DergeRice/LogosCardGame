import { mkdirSync, readFileSync, writeFileSync, createReadStream } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { Check, CheckPlayableSegment, LearningPosType as P } from '../shared/LearningLocalGrammarChecker.js';
type Case = { mode: 'check' | 'segment'; bare: boolean; seq: P[] | null };
const cases: Case[] = [];
function add(seq: P[] | null) { for (const bare of [false, true]) cases.push({ mode: 'segment', bare, seq }); cases.push({ mode: 'check', bare: false, seq }); }
add(null); add([]);
// Exhaust ALL 19 POS identifiers through length 4, for both option values and Check.
function exhaustive(prefix: P[], remaining: number) { if (!remaining) { add(prefix); return; } for(let p=0;p<19;p++)exhaustive([...prefix,p],remaining-1); }
for(let n=1;n<=4;n++)exhaustive([],n);
const curated: P[][] = [
 [P.JJ,P.VB,P.JJ], [P.JJ,P.PRP,P.VB,P.CC,P.PRP,P.VB],
 [P.PRP,P.VB,P.JJ,P.PRP], [P.PRP,P.VB,P.JJ,P.PRP,P.JJ],
 [P.PRP,P.VB,P.PRP,P.VB,P.PRP], [P.PRP,P.VB,P.WH,P.BE,P.JJ],
 [P.PRP,P.VB,P.WH,P.VB,P.PRP], [P.PRP,P.VB,P.WH,P.DO,P.PRP,P.VB],
 [P.PRP,P.VB,P.WH,P.MODAL,P.PRP,P.BE,P.JJ],
 [P.PRP,P.VB,P.PRP,P.WH,P.VB,P.PRP], [P.PRP,P.VB,P.PRP,P.WH,P.BE,P.JJ],
 [P.PRP,P.VB,P.PRP,P.WH,P.DO,P.PRP,P.VB], [P.PRP,P.VB,P.PRP,P.WH,P.PRP,P.VB],
 [P.PRP,P.IN,P.PRP,P.IN,P.PRP,P.VB,P.RB],
 [P.DT_AN,P.RB,P.JJ,P.RB_FREQ,P.JJ,P.NNC,P.BE,P.RB_NOT,P.RB,P.JJ],
 [P.JJ,P.JJ,P.NNU,P.VB,P.TO_VB,P.VB],
 [P.RB,P.WH,P.DO,P.PRP,P.RB_NOT,P.RB_FREQ,P.VB,P.NNU,P.RB],
 [P.PRP,P.VB,P.CC,P.PRP,P.VB], [P.PRP,P.VB,P.CC,P.PRP,P.VB,P.CC,P.PRP,P.VB],
 [...Array<P>(15).fill(P.JJ),P.VB], [...Array<P>(14).fill(P.JJ),P.VB,P.PRP],
 [P.PRP,P.MODAL,P.BE,P.JJ], [P.MODAL,P.PRP,P.BE,P.JJ]
];
for(const seq of curated){add(seq);add([P.RB,...seq,P.RB_FREQ]);add([P.CC,...seq,P.CC]);}
// Seeded mixed and grammatical mutations cover longer helper paths and 15-card boundary.
let seed=0x20260927;function rand(n:number){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;}
for(let i=0;i<15000;i++){
 const seq=i%2?Array.from({length:5+rand(14)},()=>rand(19) as P):[...curated[rand(curated.length)]];
 if(i%2===0){seq.splice(rand(seq.length+1),0,rand(19));if(i%4===0)seq[rand(seq.length)]=rand(19);}
 add(seq);
}
mkdirSync('test-results',{recursive:true});mkdirSync('docs',{recursive:true});
const input=resolve('test-results/unity-cases.txt'),output=resolve('test-results/unity-results.txt');
writeFileSync(input,cases.map((c,i)=>`${i}|${c.mode}|${c.bare}|${c.seq===null?'NULL':c.seq.join(',')}`).join('\n'));
console.log(`Compiling supplied C# and comparing ${cases.length} calls...`);
const run=spawnSync('pwsh',['-NoProfile','-File','scripts/unity-oracle.ps1','-InputPath',input,'-OutputPath',output],{encoding:'utf8',windowsHide:true,timeout:120000});
if(run.status!==0)throw Error(run.stderr||run.stdout||'C# oracle failed');
const mismatches:unknown[]=[];let compared=0;
const decode=(s:string)=>s==='NULL'?null:Buffer.from(s,'base64').toString('utf8');
for await(const line of createInterface({input:createReadStream(output),crlfDelay:Infinity})){
 const [id,valid,pattern,start,length,message,debug]=line.split('|'), c=cases[Number(id)];
 const expected={valid:valid==='true',patternType:Number(pattern),usedStartIndex:Number(start),usedLength:Number(length),message:decode(message),debugLog:decode(debug)};
 const actual=c.mode==='check'?Check(c.seq):CheckPlayableSegment(c.seq,c.bare);
 if((Object.keys(expected) as (keyof typeof expected)[]).some(k=>expected[k]!==actual[k])){if(mismatches.length<50)mismatches.push({case:c,expected,actual});}
 compared++;
}
const hash=createHash('sha256').update(readFileSync('reference/unity/LearningLocalGrammarChecker.cs')).digest('hex');
const report={compared,cases:cases.length,mismatches:mismatches.length,sourceSha256:hash,fields:['valid','patternType','usedStartIndex','usedLength','message','debugLog'],enumeration:'19 POS, lengths 0..4 exhaustive; 15000 seeded longer cases plus curated branches; segment(false), segment(true), Check',examples:mismatches};
writeFileSync('docs/grammar-parity.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(mismatches.length||compared!==cases.length)process.exitCode=1;
