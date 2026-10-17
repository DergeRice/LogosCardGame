import {test,expect} from './fixtures.js';
test('reported missing sentence and canonical singular play actual supplemented MP3s',async({page})=>{
 await page.goto('/audio-check');test.skip(!await page.evaluate(()=>typeof AudioContext!=='undefined'),'Windows WebKit lacks Web Audio; no physical iOS playback claim');
 for(const text of ['I can work near our friends.','I can work near our friend.']){
  await page.getByRole('combobox').selectOption(text);await page.getByRole('button',{name:'문장 재생'}).click();await expect(page.getByRole('status')).toHaveText('ended',{timeout:20000});const data=await page.locator('dl').evaluate(el=>Object.fromEntries([...el.children].map(row=>[row.querySelector('dt')!.textContent,row.querySelector('dd')!.textContent])));expect(Number(data.peak)).toBeGreaterThan(.02);expect(Number(data.duration)).toBeGreaterThan(.4);expect(data.url).toMatch(/^\/audio\/sentences\//);
 }
});
test('a decoder that never resolves reports timeout instead of remaining loading forever',async({page})=>{
 await page.addInitScript(()=>{if(typeof AudioContext!=='undefined')AudioContext.prototype.decodeAudioData=(()=>new Promise(()=>{})) as any});await page.goto('/audio-check');test.skip(!await page.evaluate(()=>typeof AudioContext!=='undefined'),'Windows WebKit lacks Web Audio');await page.getByRole('combobox').selectOption('I can work near our friends.');await page.getByRole('button',{name:'문장 재생'}).click();await expect(page.getByRole('status')).toHaveText('timeout',{timeout:10000});
});
test('an old in-memory manifest refreshes on missing audio and finds the new local sentence',async({page})=>{
 let manifests=0;await page.route('**/audio/sentences/manifest.json',route=>route.fulfill({json:{entries:++manifests===1?[]:[{text:'I can work near our friends.',file:'kokoro-afheart-v1/14ec0701df5835da2005.mp3'}]}}));await page.route('https://logos-card-audio.*.workers.dev/**',route=>route.fulfill({status:404}));await page.goto('/audio-check');test.skip(!await page.evaluate(()=>typeof AudioContext!=='undefined'),'Windows WebKit lacks Web Audio');await page.getByRole('combobox').selectOption('I can work near our friends.');await page.getByRole('button',{name:'문장 재생'}).click();await expect(page.getByRole('status')).toHaveText('ended',{timeout:15000});expect(manifests).toBe(2);
});
