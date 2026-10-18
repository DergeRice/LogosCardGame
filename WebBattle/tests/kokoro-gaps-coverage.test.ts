import {execFileSync} from 'node:child_process';
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {judgeCards,type Kind} from '../shared/rules.js';import {cardSentenceExample} from '../shared/card-sentence-example.js';import {kokoroObjectKey} from '../shared/kokoro-audio.js';
const zip=(path:string)=>JSON.parse(gunzipSync(readFileSync(path)).toString());
test('finished supplement has one real verified R2 object for every new recording',async()=>{
 const m=zip('docs/audio-audit/kokoro-gaps-v72-manifest.json.gz'),input=zip('docs/audio-audit/kokoro-gaps-v72-input.json.gz'),inventory=zip('docs/audio-audit/r2-inventory-v72.json.gz'),remote=new Map<string,any>(inventory.objects.map((o:any)=>[o.key,o]));
 assert.equal(m.complete,true);assert.equal(m.entries.length,input.rows.length);assert.equal(new Set(m.entries.map((e:any)=>e.file)).size,m.entries.length);
 for(let i=0;i<m.entries.length;i+=256)await Promise.all(m.entries.slice(i,i+256).map(async(e:any)=>{assert.equal(e.file,await kokoroObjectKey(e.text));const actual=remote.get(e.file);assert.ok(actual,'Missing R2 object: '+e.file);assert.equal(actual.size,e.bytes);assert.equal(actual.sha256,e.sha256);assert.ok(e.duration>.3&&e.peak>.02);}));
});
test('all supported played POS snapshots have a recorded current English example',()=>{
 const rows=JSON.parse(readFileSync('docs/audio-audit/played-pos-v72-final.json','utf8')) as {kinds:Kind[]}[],known=new Set<string>();
 for(const m of [JSON.parse(readFileSync('public/audio/sentences/manifest.json','utf8')),zip('docs/audio-audit/base-manifest.json.gz'),zip('docs/audio-audit/expanded-manifest.json.gz'),zip('docs/audio-audit/kokoro-gaps-v72-manifest.json.gz')])for(const e of m.entries)known.add(e.text);
 const missing:string[]=[],rejected:Kind[][]=[];for(const row of rows){const cards=row.kinds.map((kind,i)=>({kind,id:String(i)})),j=judgeCards(cards),e=cardSentenceExample(cards,j,0).example;if(!e){rejected.push(row.kinds);continue;}if(!known.has(e.english))missing.push(e.english);}
 assert.deepEqual(missing,[]);assert.equal(rejected.length,2);assert.ok(rejected.every(seq=>seq.some((kind,i)=>kind==='indefinite'&&seq[i+1]==='mass')));
});

test('full frozen current-generator census has no uncovered recorded output, including RB aliases',()=>{
 execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/audit-kokoro-gaps.ts','--verify-complete','--frozen','--output=.runtime/v72-census-test.json'],{stdio:'pipe',timeout:120000});
 const result=JSON.parse(readFileSync('.runtime/v72-census-test.json','utf8')),input=zip('docs/audio-audit/kokoro-gaps-v72-input.json.gz');assert.equal(result.checked,input.checked);assert.equal(result.accepted,input.accepted);assert.equal(result.missing,0);assert.equal(result.accepted,82034);assert.equal(result.skippedStock,177);
});
