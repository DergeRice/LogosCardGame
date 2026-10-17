import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {judgeCards,type Kind} from '../shared/rules.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';
import {safeDetails} from '../server/audit.js';
test('reported exact sentence and generated possessive/prepositional families have real complete MP3s',()=>{
 const manifest=JSON.parse(readFileSync('public/audio/sentences/manifest.json','utf8')),supplement=JSON.parse(readFileSync('docs/supplemental-voice-v1.json','utf8'));
 const recorded=new Map<string,any>(manifest.entries.map((e:any)=>[e.text,e]));
 const expected=['I can work near our friends.'];
 for(const noun of [['possessive','count'],['article','count'],['indefinite','adjective','count']] as Kind[][]){const seq:Kind[]=['pronoun','modal','verb','preposition',...noun],cards=seq.map((kind,i)=>({id:String(i),kind})),j=judgeCards(cards);assert.equal(j.usedLength,cards.length);expected.push(cardSentenceExample(cards,j).example!.english);}
 for(const text of [...expected,...supplement.entries.map((e:any)=>e.english)]){const e=recorded.get(text);assert.ok(e,text);const data=readFileSync('public/audio/sentences/'+e.file);assert.equal(data.length,e.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),e.sha256);assert.ok(e.peak>.02);assert.ok(e.duration>.4);}
});
test('audio failure audit retains exact sentence and filename without credentials',()=>{
 const details=safeDetails({code:'AUDIO_FAILURE',sentence:'I can work near our friends.',file:'14ec0701df5835da2005.mp3',token:'secret',password:'secret'});assert.equal(details.sentence,'I can work near our friends.');assert.equal(details.file,'14ec0701df5835da2005.mp3');assert.equal(details.token,undefined);assert.equal(details.password,undefined);
});
