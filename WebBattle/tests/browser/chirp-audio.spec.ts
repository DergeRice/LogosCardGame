import {createHash} from 'node:crypto';
import {test,expect} from '@playwright/test';

test('a generated Chirp file takes priority and starts promptly',async({page})=>{
 const id=createHash('sha256').update('Hello.').digest('hex').slice(0,16);
 await page.route('**/audio/chirp/manifest.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({version:1,voice:'en-US-Chirp3-HD-Leda',ids:[id]})}));
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const played:string[]=[];
  class FakeAudio {
   src:string;preload='';onplaying:(()=>void)|null=null;onended:(()=>void)|null=null;
   constructor(src:string){this.src=src;}
   async play(){played.push(this.src);this.onplaying?.();}
   pause(){}removeAttribute(){}load(){}
  }
  const original=window.Audio;
  window.Audio=FakeAudio as unknown as typeof Audio;
  try{
   const source='/src/chirpAudio.ts';
   const {playChirpExample}=await import(/* @vite-ignore */ source) as typeof import('../../src/chirpAudio.js');
   let starts=0;
   const playback=await playChirpExample('  Hello. ',()=>starts++,()=>{},new AbortController().signal);
   playback?.stop();
   return {played,starts,found:Boolean(playback)};
  }finally{window.Audio=original;}
 });
 expect(result).toEqual({played:[`/audio/chirp/${id.slice(0,2)}/${id}.mp3`],starts:1,found:true});
});
