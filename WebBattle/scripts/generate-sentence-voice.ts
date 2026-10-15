import {chromium} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync,unlinkSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {SENTENCE_EXAMPLES} from '../shared/sentence-examples.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';
import {judgeCards,type Kind} from '../shared/rules.js';
import {normalizeSpeechText} from '../shared/chirp-audio.js';

// Offline preparation using the same free, local neural engine as the browser.
// Run Vite first; this builder never contacts a billable TTS service.
const base=process.env.VOICE_BUILD_ORIGIN??'http://127.0.0.1:5182';
const reviewed=JSON.parse(readFileSync('shared/reviewed-examples.json','utf8')) as {english:string}[];
const observed=JSON.parse(readFileSync('tests/fixtures/observed-pos-combinations.json','utf8')) as Kind[][];
const more:Kind[][]=[...observed,['pronoun','verb','article','count','adjective'],['pronoun','be','adverb','adverb','adjective'],['pronoun','modal','frequency','frequency','verb'],['pronoun','be','adjective','adjective','adjective'],['frequency','verb','adjective','adverb'],['proper','verb'],['proper','be','adjective'],['proper','do','not','verb']];
const dynamic=more.flatMap(kinds=>{const cards=kinds.map((kind,i)=>({id:String(i),kind})),j=judgeCards(cards);return [0,1,2].map(v=>cardSentenceExample(cards,j,v).example?.english??'')});
const texts=[...new Set([...reviewed,...SENTENCE_EXAMPLES].map(e=>e.english).concat(dynamic).map(normalizeSpeechText).filter(Boolean))];
const output=resolve('public/audio/sentences');mkdirSync(output,{recursive:true});
const entries:{text:string;file:string;bytes:number;sha256:string}[]=[];
const browser=await chromium.launchPersistentContext(resolve('.runtime/sentence-voice-browser'),{headless:true});
const page=await browser.newPage();await page.route('**/voice-build.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Local sentence voice build</title>'}));
page.on('pageerror',e=>console.error(e.message));
await page.goto(base+'/voice-build.html');
const persist=async()=>{writeFileSync(resolve(output,'manifest.tmp'),JSON.stringify({version:1,engine:'Piper VITS',voice:'en_US-ljspeech-medium',sentenceLevel:true,entries},null,2)+'\n');for(let attempt=0;;attempt++){try{renameSync(resolve(output,'manifest.tmp'),resolve(output,'manifest.json'));break;}catch(error){if(attempt>=8)throw error;await new Promise(r=>setTimeout(r,50*(attempt+1)));}}};
try{
 for(let i=0;i<texts.length;i++){
  const text=texts[i],id=createHash('sha256').update(text).digest('hex').slice(0,16),file=id+'.wav',target=resolve(output,file);
  if(!existsSync(target)){
   const result=await page.evaluate(text=>new Promise<{bytes?:number[];error?:string}>(resolve=>{
    const state=window as unknown as {voiceWorker?:Worker;voiceCount?:number};if(!state.voiceWorker||(state.voiceCount??0)>=4){state.voiceWorker?.terminate();state.voiceWorker=new Worker('/src/sentenceVoice.worker.ts',{type:'module'});state.voiceCount=0;}const worker=state.voiceWorker;state.voiceCount=(state.voiceCount??0)+1;
    const timer=setTimeout(()=>{worker.terminate();resolve({error:'Synthesis timeout'})},120000);
    worker.onerror=e=>{clearTimeout(timer);worker.terminate();resolve({error:e.message})};
    worker.onmessage=async e=>{
     if(e.data.type==='progress')return;
     clearTimeout(timer);
     if(e.data.type==='audio')resolve({bytes:Array.from(new Uint8Array(await e.data.wav.arrayBuffer()))});
     else resolve({error:e.data.message});
    };
    worker.postMessage(text);
   }),text);
   if(!result.bytes)throw Error(text+': '+result.error);
   writeFileSync(target,Buffer.from(result.bytes));
  }
  const wav=readFileSync(target);if(wav.toString('ascii',0,4)!=='RIFF'||wav.length<4000)throw Error('Invalid sentence recording '+file);
  entries.push({text,file,bytes:wav.length,sha256:createHash('sha256').update(wav).digest('hex')});
  if((i+1)%25===0||i===texts.length-1){await persist();console.log(`Whole-sentence voice ${i+1}/${texts.length}`);}
 }
 const keep=new Set(entries.map(e=>e.file));for(const file of readdirSync(output))if(/^[a-f0-9]{16}\.wav$/.test(file)&&!keep.has(file))unlinkSync(resolve(output,file));
 console.log(`${entries.length} full utterances; ${(entries.reduce((n,e)=>n+e.bytes,0)/1024/1024).toFixed(1)} MiB. Paid API calls: 0.`);
}finally{await browser.close()}
