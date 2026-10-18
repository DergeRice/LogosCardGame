import {test,expect} from './fixtures.js';
async function supported(page:import('@playwright/test').Page){await page.goto('/audio-check');test.skip(!await page.evaluate(()=>typeof AudioContext!=='undefined'),'Windows WebKit lacks Web Audio; no physical iOS claim');}
test('reported enjoy sentence plays the actual natural Kokoro MP3',async({page})=>{
 await supported(page);await page.getByRole('combobox').selectOption('I can enjoy music near a useful friend.');await page.getByRole('button',{name:'문장 재생',exact:true}).click();await expect(page.getByRole('status')).toHaveText('ended',{timeout:20000});await expect(page.locator('dl')).toContainText('/audio/sentences/kokoro-afheart-v1/20163d701283b250d281.mp3');
});
test('HTTP 200 HTML is rejected as audio, never reported playing',async({page})=>{
 await page.route('**/audio/sentences/**/*.mp3',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>app shell'}));await page.route('https://logos-card-audio.*.workers.dev/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>app shell'}));await supported(page);await page.getByRole('combobox').selectOption('I work.');await page.getByRole('button',{name:'문장 재생',exact:true}).click();await expect(page.getByRole('status')).toHaveText('decode',{timeout:15000});
});
test('failed Kokoro backup never silently switches to a system voice',async({page})=>{
 await page.addInitScript(()=>{(window as any).__spoken=0;Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},resume(){},speak(){(window as any).__spoken++}}});});
 await page.route('**/*kokoro.worker*',r=>r.fulfill({contentType:'application/javascript',body:'throw Error("Worker failure fixture")'}));await page.route('**/audio/sentences/manifest.json',r=>r.fulfill({json:{entries:[]}}));await page.route('https://logos-card-audio.*.workers.dev/**',r=>r.fulfill({status:404}));await supported(page);
 await page.getByRole('button',{name:'문장 재생',exact:true}).click();await expect(page.getByRole('status')).toHaveText('network');expect(await page.evaluate(()=>(window as any).__spoken)).toBe(0);
});

for(const [text,hash] of [
 ['Does management give the management something?','37f1029aedf1c57f9344'],
 ['Does the management make them enjoy our management?','2053dfabb04875e85579'],
])test(`reported question plays Kokoro to completion: ${hash}`,async({page})=>{
 await supported(page);await page.getByLabel('직접 검사할 문장').fill(text);await page.getByRole('button',{name:'문장 재생',exact:true}).click();await expect(page.getByRole('status')).toHaveText('ended',{timeout:20000});await expect(page.locator('dl')).toContainText(`/audio/sentences/kokoro-afheart-v1/${hash}.mp3`);
});
