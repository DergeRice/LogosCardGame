/** Verify a completed local pack, all upload receipts and public MP3 samples before release. */
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {chromium} from '@playwright/test';
const folder='.runtime/kokoro-catalog/',manifest=JSON.parse(readFileSync(folder+'manifest.json')),complete=JSON.parse(readFileSync(folder+'upload-complete.json'));
const rows=readFileSync('docs/one-example-per-pos/examples.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(e=>e.availableInCurrentDeck),expected=new Map(rows.map(e=>[e.key,e]));
if(!manifest.complete||manifest.entries.length!==24155||complete.verifiedInventory!==24155)throw Error('Pack/upload is not complete');
const receipts=new Map(readFileSync(folder+'uploaded.jsonl','utf8').trim().split('\n').map(l=>{const e=JSON.parse(l);return [e.file,e]}));let bytes=0,min=Infinity,max=0;const files=new Set();
for(const e of manifest.entries){
 const row=expected.get(e.posKey),receipt=receipts.get(e.file);if(!row||row.english!==e.text||!receipt||receipt.sha256!==e.sha256||receipt.bytes!==e.bytes||files.has(e.file))throw Error('Canonical coverage/receipt mismatch');
 const data=readFileSync(folder+e.file);if(data.length!==e.bytes||createHash('sha256').update(data).digest('hex')!==e.sha256)throw Error('Local audio integrity mismatch');
 files.add(e.file);bytes+=e.bytes;min=Math.min(min,e.duration);max=Math.max(max,e.duration);
}
if(bytes!==complete.bytes||expected.size!==files.size)throw Error('Total/count mismatch');
const sample=new Map();for(let form=1;form<=5;form++){const sorted=manifest.entries.filter(e=>expected.get(e.posKey).patternType===form).sort((a,b)=>a.duration-b.duration);for(const e of [sorted[0],sorted.at(-1)])sample.set(e.file,e);}
for(let i=0;i<24;i++){const e=manifest.entries[Math.floor(i*(manifest.entries.length-1)/23)];sample.set(e.file,e);}
const origin='https://logos-card-audio.jesus-and-children-ranking-worker.workers.dev',browser=await chromium.launch();let tested;
try{
 const page=await browser.newPage({viewport:{width:900,height:430},isMobile:true,hasTouch:true});await page.goto(process.env.BATTLE_VERIFY_BASE??'http://127.0.0.1:5186/cards');
 tested=await page.evaluate(async({origin,samples})=>{
  const ctx=new AudioContext(),results=[];
  for(let i=0;i<samples.length;i+=4)results.push(...await Promise.all(samples.slice(i,i+4).map(async e=>{
   const start=performance.now(),response=await fetch(origin+'/'+e.file,{signal:AbortSignal.timeout(15000)});if(!response.ok||!response.headers.get('Content-Type')?.startsWith('audio/mpeg'))throw Error('Public audio HTTP/type failure');
   const data=await response.arrayBuffer(),sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),v=>v.toString(16).padStart(2,'0')).join('');if(sha!==e.sha256)throw Error('Public hash mismatch');
   const decoded=await ctx.decodeAudioData(data);let peak=0;for(const x of decoded.getChannelData(0))peak=Math.max(peak,Math.abs(x));if(peak<.02||Math.abs(decoded.duration-e.duration)>.15)throw Error('Public audio decode failure');
   return {file:e.file,duration:decoded.duration,peak,ms:Math.round(performance.now()-start)};
  })));await ctx.close();return results;
 },{origin,samples:[...sample.values()]});
}finally{await browser.close()}
const result={version:'v0.9.58',engine:manifest.engine,voice:manifest.voice,canonicalIndex:0,scope:'Audited structural/exhaustive set realizable from current shared deck; not every possible 15-card array.',sentences:files.size,bytes,MiB:Number((bytes/1048576).toFixed(2)),minSeconds:min,maxSeconds:max,localSha256Verified:files.size,r2InventoryVerified:complete.verifiedInventory,publicDecodedSamples:tested.length,catalogSha256:createHash('sha256').update(readFileSync('docs/one-example-per-pos/examples.jsonl')).digest('hex'),manifestSha256:createHash('sha256').update(readFileSync(folder+'manifest.json')).digest('hex'),origin,verifiedAt:new Date().toISOString(),verification:'Mobile viewport Chromium, real R2 MP3 downloads; not physical handset speaker listening.',samples:tested};
writeFileSync('docs/canonical-audio-release.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,samples:undefined}));
