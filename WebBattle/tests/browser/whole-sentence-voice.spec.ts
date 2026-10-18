import {readFileSync} from 'node:fs';
import {test,expect} from './fixtures.js';
test('all Kokoro sentence files decode into complete non-silent audio',async({page,browserName})=>{
 test.skip(browserName==='webkit','Windows WebKit has no Web Audio decoder; not physical iOS verification.');
 await page.goto('/cards');
 const result=await page.evaluate(async()=>{
  const manifest=await (await fetch('/audio/sentences/manifest.json')).json();const ctx=new AudioContext();const failures:string[]=[];let count=0;
  for(let i=0;i<manifest.entries.length;i+=8)await Promise.all(manifest.entries.slice(i,i+8).map(async(e:{text:string;file:string;duration:number;bytes:number;sha256:string})=>{
   try{const response=await fetch('/audio/sentences/'+e.file);if(!response.ok)throw Error('HTTP '+response.status);if(!response.headers.get('Content-Type')?.startsWith('audio/'))throw Error('Not audio');const data=await response.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join('');if(hash!==e.sha256||data.byteLength!==e.bytes)throw Error('File hash/size mismatch');const decoded=await ctx.decodeAudioData(data);let peak=0;for(const v of decoded.getChannelData(0))peak=Math.max(peak,Math.abs(v));if(peak<.02||Math.abs(decoded.duration-e.duration)>.15)throw Error('Silent/incomplete');count++;}catch(error){failures.push(e.text+':'+String(error));}
  }));await ctx.close();return {count,expected:manifest.entries.length,engine:manifest.engine,failures};
 });
 console.log(JSON.stringify({staticAudioVerification:result}));await test.info().attach('decoded-inventory',{body:JSON.stringify(result),contentType:'application/json'});expect(result.expected).toBe(JSON.parse(readFileSync('public/audio/sentences/manifest.json','utf8')).entries.length);
 expect(result.engine).toBe('Kokoro-82M v1.0');expect(result.expected).toBeGreaterThanOrEqual(661);expect(result.count).toBe(result.expected);expect(result.failures).toEqual([]);
});
