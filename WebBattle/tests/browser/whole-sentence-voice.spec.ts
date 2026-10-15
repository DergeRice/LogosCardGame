import {test,expect} from './fixtures.js';
test('all Kokoro sentence files decode into complete non-silent audio',async({page,browserName})=>{
 test.skip(browserName==='webkit','Windows WebKit has no Web Audio decoder; not physical iOS verification.');
 await page.goto('/cards');
 const result=await page.evaluate(async()=>{
  const manifest=await (await fetch('/audio/sentences/manifest.json')).json();const ctx=new AudioContext();const failures:string[]=[];let count=0;
  for(let i=0;i<manifest.entries.length;i+=8)await Promise.all(manifest.entries.slice(i,i+8).map(async(e:{text:string;file:string;duration:number})=>{
   try{const response=await fetch('/audio/sentences/'+e.file);if(!response.ok)throw Error('HTTP '+response.status);const decoded=await ctx.decodeAudioData(await response.arrayBuffer());let peak=0;for(const v of decoded.getChannelData(0))peak=Math.max(peak,Math.abs(v));if(peak<.02||Math.abs(decoded.duration-e.duration)>.15)throw Error('Silent/incomplete');count++;}catch(error){failures.push(e.text+':'+String(error));}
  }));await ctx.close();return {count,expected:manifest.entries.length,engine:manifest.engine,failures};
 });
 expect(result.engine).toBe('Kokoro-82M v1.0');expect(result.expected).toBe(547);expect(result.count).toBe(result.expected);expect(result.failures).toEqual([]);
});
