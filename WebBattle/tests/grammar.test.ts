import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judge, type Kind } from '../shared/rules.js';
import { chooseMove } from '../server/ai.js';
import { Check, CheckPlayableSegment, LearningPosType as P } from '../shared/LearningLocalGrammarChecker.js';
const cases: [Kind[], number, number][] = [
 [['pronoun','verb'],1,2], [['mass','be','adjective'],2,3], [['pronoun','verb','mass'],3,3],
 [['pronoun','verb','pronoun','mass'],4,4], [['pronoun','verb','mass','adjective'],5,4],
 [['article','count','be','adjective'],2,4], [['possessive','adjective','count','verb'],1,4],
 [['pronoun','be','article','count'],2,4], [['article','mass','verb'],1,3]
];
for (const [cards, form, score] of cases) test(`valid ${cards.join(' ')} => ${form}`, () => { const r = judge(cards); assert.equal(r.valid, true); assert.equal(r.form, form); assert.equal(r.points, score); assert.equal(r.spans[0].start, 0); assert.equal(r.spans.at(-1)?.end, cards.length); });
for (const cards of [[], ['adjective'], ['count','be'], ['article','be'], ['pronoun','be'], ['pronoun','adjective'], ['possessive','pronoun'], Array(9).fill('pronoun')] as Kind[][]) test(`invalid ${cards.join(' ')}`,()=>{const r=judge(cards);assert.equal(r.valid,false);assert.equal(r.points,0);assert.deepEqual(r.spans,[]);});
test('AI returns only owned distinct cards accepted by the same judge, bounded',()=>{ const hand: Kind[]=['pronoun','verb','mass','adjective','article','count','possessive','be','verb','adjective']; const cards=hand.map((kind,i)=>({id:String(i),kind})); for(const difficulty of ['easy','normal','hard'] as const){ const before=performance.now();const move=chooseMove(cards,difficulty); assert.ok(performance.now()-before<100);assert.ok(move);assert.equal(new Set(move).size,move.length);assert.equal(judge(move.map(id=>cards.find(c=>c.id===id)!.kind)).valid,true); } });
test('AI returns no move when no valid scoring combination exists',()=>{assert.equal(chooseMove([{id:'n',kind:'mass'},{id:'a',kind:'adjective'}],'hard'),null);});
test('AI finds an opening move independent of card order, including invalid-prefix roots',()=>{const kinds:Kind[]=['adjective','article','count','possessive','be','verb','verb','adjective','pronoun','mass'];for(let rotation=0;rotation<10;rotation++){const ordered=[...kinds.slice(rotation),...kinds.slice(0,rotation)];for(const difficulty of ['easy','normal','hard'] as const){const cards=ordered.map((kind,i)=>({kind,id:String(i)}));const move=chooseMove(cards,difficulty);assert.ok(move,`${difficulty} rotation ${rotation}`);assert.equal(judge(move.map(id=>cards[Number(id)].kind)).valid,true);}}});
for (const [seq,valid,start,length] of [
 [[P.VB],true,0,1], [[P.PRP,P.VB],true,0,2], [[P.PRP,P.BE,P.JJ],true,0,3],
 [[P.JJ,P.VB,P.JJ],true,1,1], [[P.JJ],false,0,0],
] as [P[],boolean,number,number][]) test(`Unity required example ${seq.map(p=>P[p]).join(' ')}`,()=>{
 const r=CheckPlayableSegment(seq,false);assert.equal(r.valid,valid);assert.equal(r.usedStartIndex,start);assert.equal(r.usedLength,length);
});
test('longest first, equal-length earliest first, and Check is intentionally different',()=>{
 const r=CheckPlayableSegment([P.PRP,P.VB,P.CC,P.PRP,P.VB]);assert.equal(r.usedStartIndex,0);assert.equal(r.usedLength,2);assert.equal(Check([P.PRP,P.VB,P.CC,P.PRP,P.VB]).usedLength,5);
 const longer=CheckPlayableSegment([P.VB,P.CC,P.PRP,P.BE,P.JJ]);assert.equal(longer.usedStartIndex,2);assert.equal(longer.usedLength,3);assert.equal(Check([P.VB]).valid,false);
});
test('bare noun option never leaks; numeric POS enum agrees exactly with Unity',()=>{
 assert.deepEqual(Object.values(P).filter(x=>typeof x==='number'),Array.from({length:19},(_,i)=>i));
 for(let i=0;i<10;i++){assert.equal(CheckPlayableSegment([P.NNC,P.VB],true).usedLength,2);const r=CheckPlayableSegment([P.NNC,P.VB]);assert.equal(r.usedLength,1);assert.equal(r.usedStartIndex,1);assert.equal(Check([P.NNC,P.VB]).valid,false);}
});
test('segment window stops at first 15; no false rejection of a valid shorter segment',()=>{
 assert.equal(CheckPlayableSegment([...Array<P>(15).fill(P.JJ),P.VB]).valid,false);
 const r=CheckPlayableSegment([...Array<P>(14).fill(P.JJ),P.VB,P.PRP]);assert.equal(r.usedStartIndex,14);assert.equal(r.usedLength,1);
});
test('points use only recognized cards, including single-card commands',()=>{
 const partial=judge(['adjective','verb','adjective']);assert.equal(partial.points,1);assert.equal(partial.usedStartIndex,1);assert.equal(partial.usedLength,1);assert.equal(partial.message,'명령문');assert.equal(judge(['verb']).points,1);
 assert.equal(judge(['pronoun','verb','adjective']).patternType,2); // Deliberately allowed in source.
});
