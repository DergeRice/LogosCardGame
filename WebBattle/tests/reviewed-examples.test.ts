import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {judgeCards,type Kind} from '../shared/rules.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';
import {SENTENCE_EXAMPLES,type SentenceExample} from '../shared/sentence-examples.js';
const reviewed=JSON.parse(readFileSync('shared/reviewed-examples.json','utf8')) as (SentenceExample&{family:string;reviewed:boolean})[];
const example=(kinds:Kind[],index=0)=>{const cards=kinds.map((kind,i)=>({id:String(i),kind}));return cardSentenceExample(cards,judgeCards(cards),index).example!};
test('216 reviewed representatives reproduce card-aligned English and Korean across 72 families',()=>{
 assert.equal(reviewed.length,216);assert.equal(new Set(reviewed.map(e=>e.english)).size,216);
 const counts=new Map<string,number>();
 for(const e of reviewed){
  assert.equal(e.reviewed,true);counts.set(e.family,(counts.get(e.family)??0)+1);
  const kinds=e.parts.map(p=>p.kind!),index=Number(e.id.split('-').at(-1));
  const actual=example(kinds,index);assert.equal(actual.english,e.english);assert.equal(actual.korean,e.korean);assert.deepEqual(actual.parts.map(p=>p.kind),kinds);
  assert.ok(!/undefined|나가 되어|보인다\?|만든다\?|나이 아니다/.test(e.korean),e.korean);
 }
 assert.equal(counts.size,72);assert.ok([...counts.values()].every(c=>c===3));
});
test('reviewed vocabulary and Korean retain human objects, reflexives, complements and modality',()=>{
 assert.equal(example(['verb','proper']).english,'Help Naro!');
 assert.equal(example(['pronoun','verb','pronoun','pronoun']).english,'I give them something.');
 assert.equal(example(['pronoun','be','pronoun'],1).english,'We are ourselves.');
 assert.equal(example(['do','pronoun','verb','adjective']).korean,'나는 행복해 보이나요?');
 assert.equal(example(['pronoun','modal','verb','pronoun','verb']).korean,'나는 그들이 일하게 만들 수 있다.');
 assert.equal(example(['pronoun','be','not','pronoun']).korean,'나는 나 자신이 아니다.');
 assert.equal(example(['be','not','adjective']).english,'Be not afraid!');
 assert.equal(example(['adverb','do','not','verb']).english,'Today, do not work!');
});
test('prepared neural audio contains entire reviewed and original sentences with verified non-silent waveforms',()=>{
 const manifest=JSON.parse(readFileSync('public/audio/sentences/manifest.json','utf8')) as {sentenceLevel:boolean;engine:string;voice:string;entries:{text:string;file:string;bytes:number;sha256:string;duration:number;peak:number;sampleRate:number}[]};
 assert.equal(manifest.sentenceLevel,true);assert.equal(manifest.engine,'Kokoro-82M v1.0');assert.equal(manifest.voice,'af_heart');const texts=new Set(manifest.entries.map(e=>e.text));
 for(const e of [...reviewed,...SENTENCE_EXAMPLES])assert.ok(texts.has(e.english),e.english);
 assert.equal(texts.size,manifest.entries.length);
 for(const e of manifest.entries){
  const wav=readFileSync('public/audio/sentences/'+e.file);assert.equal(wav.length,e.bytes);assert.equal(createHash('sha256').update(wav).digest('hex'),e.sha256);
  assert.ok(e.file.endsWith('.mp3')||(e as {source?:string}).source==='system-en-us-fallback');assert.ok(wav.length>1500);assert.equal(e.sampleRate,24000);assert.ok(e.duration>.3&&e.duration<25,e.text);assert.ok(e.peak>.02&&e.peak<=1.01,e.text);
 }
});
