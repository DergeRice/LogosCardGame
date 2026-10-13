import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {EXAMPLE_AUDIO_WORDS,exampleAudioTokens} from '../shared/example-audio.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';import {judgeCards,type Kind} from '../shared/rules.js';
import observed from './fixtures/observed-pos-combinations.json' with {type:'json'};
const manifest=JSON.parse(readFileSync('public/audio/examples/manifest-v1.json','utf8'));
test('recorded example vocabulary has real non-silent PCM speech and valid ranges',()=>{
 const wav=readFileSync('public/audio/examples/voice-v1.wav');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),manifest.sampleRate);
 for(const word of EXAMPLE_AUDIO_WORDS){const s=manifest.segments[word];assert.ok(s,word);assert.ok(s.length>1000);assert.ok(44+(s.start+s.length)*2<=wav.length);let peak=0;for(let i=s.start;i<s.start+s.length;i++)peak=Math.max(peak,Math.abs(wav.readInt16LE(44+i*2)));assert.ok(peak>500,word);}
});
test('all observed and expanded examples have a complete recorded-word path',()=>{
 const sequences=[...observed,['pronoun','be','adjective','adjective','adjective'],['pronoun','verb','pronoun','to-infinitive'],['pronoun','be','adverb','adverb','adjective'],['pronoun','modal','frequency','frequency','verb']] as Kind[][];
 for(const kinds of sequences)for(let variation=0;variation<3;variation++){const cards=kinds.map((kind,i)=>({id:String(i),kind})),example=cardSentenceExample(cards,judgeCards(cards),variation).example!;for(const word of exampleAudioTokens(example.english))assert.ok(manifest.segments[word],word+' in '+example.english);}
});
