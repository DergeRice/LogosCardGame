import { chromium } from '@playwright/test';
const browser = await chromium.launch();
try {
 for (const [name, width, height] of [['desktop-home',1440,1000],['mobile-home',390,844]]) {
  const page = await browser.newPage({viewport:{width,height}});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/'); await page.evaluate(()=>document.fonts.ready);
  await page.locator('.original-demo').last().waitFor();
  await page.screenshot({path:`docs/screenshots/${name}.png`,fullPage:true});
  if (name === 'desktop-home') {
   await page.getByRole('button',{name:'빠른시작'}).click();
   await page.locator('.battle').waitFor({timeout:15000});
   await page.locator('.hand .game-card').first().waitFor();
   await page.screenshot({path:'docs/screenshots/desktop-battle.png',fullPage:true});
   page.once('dialog',dialog=>dialog.accept());
   await page.getByRole('button',{name:'대전 나가기'}).click();
  }
  console.log(name,JSON.stringify({overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors}));
  await page.close();
 }
} finally { await browser.close(); }
