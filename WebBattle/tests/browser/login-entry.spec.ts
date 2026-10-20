import {test,expect} from './fixtures.js';
import sharp from 'sharp';
test.use({autoGuest:false});
test('illustrated entry reveals two login choices and retains guest credentials for return',async({page})=>{
 const hello:any[]=[];await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const msg=JSON.parse(String(raw));if(msg.type==='hello'){hello.push(msg);ws.send(JSON.stringify({type:'session',token:'guest-account-token',name:'게스트 1234',avatar:'pronoun',rating:1000,points:0,account:null}));ws.send(JSON.stringify({type:'home',rating:1000,points:0}))}}));
 await page.goto('/');await expect(page.getByRole('heading',{name:'로고스 카드게임',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Google로 로그인/})).toBeEnabled();await expect(page.getByRole('button',{name:/Apple ID로 로그인/})).toBeEnabled();await expect(page.getByText('업데이트 예정',{exact:true})).toHaveCount(0);await expect(page.locator('.entry-login-options button')).toHaveCount(3);await expect(page.locator('.quick-start')).toHaveCount(0);expect(hello.length).toBe(0);
 await expect(page.locator('.landing-art[data-pixi="ready"] canvas')).toBeVisible();
 const timing=await page.locator('.landing-cta').evaluate(el=>parseFloat(getComputedStyle(el).animationDelay));expect(timing).toBe(1.4);
 await page.waitForTimeout(3400);await page.screenshot({path:'docs/screenshots/login-only.png'});
 await page.setViewportSize({width:667,height:320});const bounds=await page.getByRole('button',{name:/게스트로 로그인/}).boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(320);await page.getByRole('button',{name:/게스트로 로그인/}).click();await expect(page.getByTestId('guest-name')).toHaveText('게스트 1234');await expect(page.locator('.welcome-profile')).toContainText('현재 레이팅 1000');expect(hello.length).toBe(1);await page.evaluate(()=>sessionStorage.clear());await page.reload();await expect(page.locator('.login-landing')).toBeVisible();await page.getByRole('button',{name:/게스트로 로그인/}).click();await expect(page.getByTestId('guest-name')).toBeVisible();expect(hello.at(-1).token).toBe('guest-account-token');
});

test('login art and buttons fit a reduced landscape visual viewport with system bars',async({page})=>{
 await page.setViewportSize({width:844,height:390});
 await page.addInitScript(()=>{const viewport=Object.assign(new EventTarget(),{width:844,height:350,offsetTop:20,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});});
 await page.goto('/');await page.waitForTimeout(3400);
 const bounds=await page.locator('.landing-art,.landing-cta').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}}));
 for(const box of bounds){expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(844);expect(box.top).toBeGreaterThanOrEqual(20);expect(box.bottom).toBeLessThanOrEqual(370);}
 await page.screenshot({path:'docs/screenshots/login-landscape.png'});
});

test('desktop login keeps every button clickable above the version and copyright',async({page})=>{
 for(const size of [{width:1440,height:900},{width:1366,height:768},{width:1280,height:720}]){
  await page.setViewportSize(size);await page.goto('/?intro');await expect(page.locator('.landing-art[data-pixi="ready"] canvas')).toBeVisible();
  const buttons=page.locator('.entry-login-options button');
  for(const button of await buttons.all()){
   const box=(await button.boundingBox())!;expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThan(size.height-34);
  }
  const footer=(await page.locator('.landing-footer').boundingBox())!;
  expect(footer.y).toBeGreaterThan((await buttons.last().boundingBox())!.y+(await buttons.last().boundingBox())!.height);
  await expect(page.getByRole('button',{name:/게스트로 로그인/})).toBeEnabled();
 }
 await page.getByRole('button',{name:/게스트로 로그인/}).click();await expect(page.locator('.welcome-profile')).toBeVisible();
});

test('login art and buttons fit narrow portrait screens',async({page})=>{
 for(const size of [{width:390,height:844},{width:320,height:568}]){
  await page.setViewportSize(size);await page.goto('/');await page.waitForTimeout(3400);
  const bounds=await page.locator('.landing-art,.landing-cta').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}}));
  for(const box of bounds){expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(size.width);expect(box.top).toBeGreaterThanOrEqual(0);expect(box.bottom).toBeLessThanOrEqual(size.height);}
  expect(bounds[1].right-bounds[1].left).toBeLessThanOrEqual(size.width*.71);
  expect(bounds[1].top-bounds[0].top).toBeLessThanOrEqual(bounds[0].bottom-bounds[0].top);
  await page.evaluate(()=>window.scrollTo(0,200));expect(await page.evaluate(()=>window.scrollY)).toBe(0);
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overscrollBehavior)).toBe('none');
  if(size.width===390)await page.screenshot({path:'docs/screenshots/login-portrait.png'});
 }
});

test('portrait entry follows a shortened iOS visual viewport without page scroll',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{const viewport=Object.assign(new EventTarget(),{width:390,height:760,offsetTop:42,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});});
 await page.goto('/');await expect(page.locator('.landing-art[data-pixi="ready"] canvas')).toBeVisible();
 const bounds=await page.locator('.login-landing,.landing-cta').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom}}));
 expect(bounds[0].top).toBe(42);expect(bounds[0].bottom).toBe(802);expect(bounds[1].top).toBeGreaterThan(42);expect(bounds[1].bottom).toBeLessThan(802);
 await page.evaluate(()=>window.scrollTo(0,300));expect(await page.evaluate(()=>window.scrollY)).toBe(0);
});

test('touch device uses small textures and shows art if WebGL context is lost',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:3});
 const page=await context.newPage(),textures:string[]=[];
 page.on('request',request=>{if(request.url().includes('/landing/'))textures.push(request.url());});
 try{
  await page.goto('/');
  const canvas=page.locator('.landing-art[data-pixi="ready"] canvas');await expect(canvas).toBeVisible();
  expect(await canvas.evaluate(el=>(el as HTMLCanvasElement).width/el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(1.9);
  expect(textures.some(url=>url.endsWith('/landing/cards-mobile.webp'))).toBe(true);
  expect(textures.some(url=>url.endsWith('/landing/cards.png'))).toBe(false);
  await canvas.evaluate(element=>element.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(page.locator('.landing-art-fallback .landing-cards')).toBeVisible();
  await expect(page.locator('.landing-art canvas')).toBeHidden();
 }finally{await context.close();}
});

test('reduced motion shows finished artwork without allocating WebGL',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 try{
  const page=await context.newPage();await page.goto('/');
  await expect(page.locator('.landing-art-fallback .landing-title')).toBeVisible();
  await expect(page.locator('.landing-art canvas')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/게스트로 로그인/})).toBeVisible();
 }finally{await context.close();}
});

test('mobile canvas visibly changes during the Pixi intro',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:3});
 try{
  const page=await context.newPage();await page.goto('/');
  const canvas=page.locator('.landing-art[data-pixi="ready"] canvas');await expect(canvas).toBeVisible();
  const first=await canvas.screenshot();await page.waitForTimeout(2500);const last=await canvas.screenshot();
  const a=await sharp(first).ensureAlpha().raw().toBuffer(),b=await sharp(last).ensureAlpha().raw().toBuffer();
  expect(a.length).toBe(b.length);
  let changed=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])+Math.abs(a[i+3]-b[i+3])>80)changed++;
  expect(changed).toBeGreaterThan(500);
 }finally{await context.close();}
});

test('a stalled Safari frame does not skip the whole intro',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:3});
 try{
  const page=await context.newPage();await page.goto('/');
  const canvas=page.locator('.landing-art[data-pixi="ready"] canvas');await expect(canvas).toBeVisible();
  await page.evaluate(()=>{const until=performance.now()+2200;while(performance.now()<until){};});
  const first=await canvas.screenshot();await page.waitForTimeout(450);const last=await canvas.screenshot();
  const a=await sharp(first).ensureAlpha().raw().toBuffer(),b=await sharp(last).ensureAlpha().raw().toBuffer();
  let changed=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])+Math.abs(a[i+3]-b[i+3])>80)changed++;
  expect(changed).toBeGreaterThan(500);
 }finally{await context.close();}
});

test('motion diagnostics reports Safari media preference and active CSS animation',async({page})=>{
 await page.goto('/?motion-debug=1');
 await expect(page.getByRole('complementary',{name:'애니메이션 진단'})).toBeVisible();
 await expect(page.locator('.motion-debug')).toContainText('동작 줄이기 판정: 꺼짐');
 await expect(page.locator('.motion-debug')).toContainText('CSS 연출: landing-fade');
});
