import {test,expect} from './fixtures.js';
import {observeRecordedAudio} from './helpers/audio.js';
for(const mobile of [false,true])test(`real Kokoro WASM backup and cache, ${mobile?'mobile touch':'PC'}`,async({browser})=>{
 test.setTimeout(150000);
 const ctx=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
 await ctx.addInitScript(observeRecordedAudio);await ctx.addInitScript(()=>{(window as any).__voiceEvents=[];(window as any).__ticks=0;setInterval(()=>(window as any).__ticks++,50);window.addEventListener('logos-voice-status',event=>(window as any).__voiceEvents.push((event as CustomEvent).detail));Object.defineProperty(window,'speechSynthesis',{value:undefined});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:undefined});});
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/audio/sentences/**/*.mp3',route=>route.fulfill({status:404}));await page.route('https://logos-card-audio.*.workers.dev/**',route=>route.fulfill({status:404}));
 try{await page.goto('/audio-check');const text='A kind teacher can make our friend read the useful story quietly.';await page.getByLabel('직접 검사할 문장').fill(text);
 if(mobile)await page.getByRole('button',{name:'문장 재생',exact:true}).tap();else await page.getByRole('button',{name:'문장 재생',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__voiceEvents.some((e:any)=>e.code==='generating'))).toBe(true);
 const before=await page.evaluate(()=>(window as any).__ticks);await page.getByLabel('직접 검사할 문장').fill(text+' ');await expect(page.getByLabel('직접 검사할 문장')).toHaveValue(text+' ');await expect.poll(()=>page.evaluate(()=>(window as any).__ticks)).toBeGreaterThan(before+4);
 await expect(page.getByRole('status')).toHaveText('ended',{timeout:110000});await expect(page.locator('dl')).toContainText('kokoro-generated:');
 const recordings=await page.evaluate(()=>(window as any).__recordedBuffers);expect(recordings).toHaveLength(1);expect(recordings[0].peak).toBeGreaterThan(.02);expect(recordings[0].end).toBeGreaterThan(recordings[0].start);expect(recordings[0].duration).toBeGreaterThan(2);
 await page.getByRole('button',{name:'문장 재생',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__recordedBuffers.length),{timeout:10000}).toBe(2);await expect(page.getByRole('status')).toHaveText('ended',{timeout:20000});await expect(page.locator('dl')).toContainText('kokoro-cache:');expect(errors).toEqual([]);
 const evidence=await page.evaluate(()=>(window as any).__voiceEvents.filter((e:any)=>e.code==='ended'));await test.info().attach('kokoro-backup-real-playback',{body:JSON.stringify({mobile,evidence,recordings}),contentType:'application/json'});
 }finally{await ctx.close();}
});
