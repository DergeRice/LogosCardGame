import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SENTENCE_EXAMPLES,chooseSentenceExample} from '../shared/sentence-examples.js';
test('150 distinct bilingual examples cover all five forms and preserve core roles when adjuncts are added',()=>{
 assert.equal(SENTENCE_EXAMPLES.length,150);assert.equal(new Set(SENTENCE_EXAMPLES.map(e=>e.english)).size,150);assert.equal(new Set(SENTENCE_EXAMPLES.map(e=>e.id)).size,150);
 const structures=[['subject','verb'],['subject','verb','subjectComplement'],['subject','verb','object'],['subject','verb','indirect','direct'],['subject','verb','object','objectComplement']];
 for(let form=1;form<=5;form++){
  const pool=SENTENCE_EXAMPLES.filter(e=>e.patternType===form);assert.equal(pool.length,30);
  for(const e of pool){assert.deepEqual(e.parts.slice(0,structures[form-1].length).map(p=>p.role),structures[form-1]);assert.match(e.korean,/[가-힣]/);assert.equal(e.english,e.parts.map(p=>p.text).join(' ')+'.');assert.ok(!e.korean.includes('undefined'));}
  assert.ok(pool.some(e=>e.parts.some(p=>p.role==='place')));assert.ok(pool.some(e=>e.parts.some(p=>p.role==='time')));
  assert.equal(new Set(Array.from({length:30},(_,i)=>chooseSentenceExample(form,i).id)).size,30);
 }
});
test('To complements stay a single fifth-pattern phrase; commands explain omitted subjects',()=>{
 for(let i=0;i<10;i++){const e=chooseSentenceExample(5,i,false,true);assert.ok(e.parts.some(p=>p.role==='objectComplement'&&p.text==='to study'));assert.equal(e.patternType,5);}
 const command=chooseSentenceExample(1,0,true);assert.equal(command.english,'Run!');assert.deepEqual(command.parts.map(p=>p.role),['verb']);
});
