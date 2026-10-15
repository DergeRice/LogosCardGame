/** One-time protected R2 upload. Credentials stay in an ignored local file and a temporary Worker secret. */
import {readFileSync,appendFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve('.runtime/kokoro-catalog'),receipt=resolve(root,'uploaded.jsonl'),origin=process.env.AUDIO_UPLOAD_ORIGIN??'https://logos-card-audio-upload.jesus-and-children-ranking-worker.workers.dev';
const token=readFileSync(process.env.AUDIO_UPLOAD_TOKEN_FILE??'.runtime/audio-upload-token','utf8').trim();
if(!token||!origin.startsWith('https://'))throw Error('Upload credentials/HTTPS endpoint required');
const rows=readFileSync('docs/one-example-per-pos/examples.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l)).filter(e=>e.availableInCurrentDeck);
const files=rows.map(e=>'kokoro-afheart-v1/'+createHash('sha256').update('kokoro-v1.0/af_heart/1.0/'+e.english).digest('hex').slice(0,20)+'.mp3');
if(files.length!==24155||new Set(files).size!==files.length)throw Error('Canonical catalog changed');
mkdirSync(root,{recursive:true});const uploaded=new Map(existsSync(receipt)?readFileSync(receipt,'utf8').trim().split('\n').filter(Boolean).map(l=>{const e=JSON.parse(l);return [e.file,e]}):[]);
let bytes=[...uploaded.values()].reduce((n,e)=>n+e.bytes,0),lastProgress=Date.now();
async function put(file){
 const body=readFileSync(resolve(root,file)),sha=createHash('sha256').update(body).digest('hex');
 for(let retry=0;;retry++){
  try{
   const response=await fetch(origin+'/'+file,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'audio/mpeg','X-Content-SHA256':sha},body,signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('Upload HTTP '+response.status);
   const data=await response.json();if(data.key!==file||data.size!==body.length||data.sha256!==sha)throw Error('Upload integrity mismatch');
   const record={file,bytes:body.length,sha256:sha};appendFileSync(receipt,JSON.stringify(record)+'\n');uploaded.set(file,record);bytes+=body.length;lastProgress=Date.now();
   if(uploaded.size%100===0)console.log(JSON.stringify({uploaded:uploaded.size,total:files.length,bytes}));return;
  }catch(error){if(retry>=5)throw Error('Upload failed after retries for '+file);await new Promise(r=>setTimeout(r,Math.min(30000,1000*2**retry)));}
 }
}
while(uploaded.size<files.length){
 const ready=files.filter(file=>!uploaded.has(file)&&existsSync(resolve(root,file)));let cursor=0;
 await Promise.all(Array.from({length:8},async()=>{while(cursor<ready.length){const file=ready[cursor++];await put(file)}}));
 if(uploaded.size<files.length){if(Date.now()-lastProgress>600000)throw Error('No generated/uploaded progress for 10 minutes');await new Promise(r=>setTimeout(r,2000));}
}
let cursor='',seen=0;const listed=new Set();
do{
 const response=await fetch(origin+'/inventory'+(cursor?'?cursor='+encodeURIComponent(cursor):''),{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('R2 inventory HTTP '+response.status);const page=await response.json();
 for(const o of page.objects){const expected=uploaded.get(o.key);if(!expected||expected.bytes!==o.size||expected.sha256!==o.sha256)throw Error('R2 inventory integrity mismatch');listed.add(o.key);seen++;}
 cursor=page.truncated?page.cursor:'';
}while(cursor);
if(listed.size!==files.length||seen!==files.length)throw Error('R2 inventory count mismatch');
const result={uploaded:uploaded.size,verifiedInventory:listed.size,bytes,completedAt:new Date().toISOString()};writeFileSync(resolve(root,'upload-complete.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
