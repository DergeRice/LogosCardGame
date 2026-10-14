import {test,expect} from './fixtures.js';
test.use({autoGuest:false});
test('illustrated entry reveals two login choices and retains guest credentials for return',async({page})=>{
 const hello:any[]=[];await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const msg=JSON.parse(String(raw));if(msg.type==='hello'){hello.push(msg);ws.send(JSON.stringify({type:'session',token:'guest-account-token',name:'게스트 1234',avatar:'pronoun',rating:1000,points:0,account:null}));ws.send(JSON.stringify({type:'home',rating:1000,points:0}))}}));
 await page.goto('/');await expect(page.getByRole('heading',{name:'로고스 카드게임',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Google로 로그인/})).toBeDisabled();await expect(page.getByRole('button',{name:/Apple ID로 로그인/})).toHaveCount(0);await expect(page.getByText('업데이트 예정',{exact:true})).toHaveCount(1);await expect(page.locator('.entry-login-options button')).toHaveCount(2);await expect(page.locator('.quick-start')).toHaveCount(0);expect(hello.length).toBe(0);
 for(const image of await page.locator('.landing-art img').all())await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0)).toBe(true);
 const timings=await page.locator('.landing-cards,.landing-title,.landing-mascots,.landing-cta').evaluateAll(els=>els.map(el=>parseFloat(getComputedStyle(el).animationDelay)));expect(timings).toEqual([.45,1.2,1.95,2.8]);
 await page.waitForTimeout(3400);await page.screenshot({path:'docs/screenshots/login-only.png'});
 await page.setViewportSize({width:667,height:320});const bounds=await page.getByRole('button',{name:/게스트로 로그인/}).boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(320);await page.getByRole('button',{name:/게스트로 로그인/}).click();await expect(page.getByTestId('guest-name')).toHaveText('게스트 1234');await expect(page.locator('.home-profile')).toContainText('포인트 0 P');expect(hello.length).toBe(1);await page.evaluate(()=>sessionStorage.clear());await page.reload();await expect(page.locator('.login-landing')).toBeVisible();await page.getByRole('button',{name:/게스트로 로그인/}).click();await expect(page.getByTestId('guest-name')).toBeVisible();expect(hello.at(-1).token).toBe('guest-account-token');
});

test('login art and buttons fit a reduced landscape visual viewport with system bars',async({page})=>{
 await page.setViewportSize({width:844,height:390});
 await page.addInitScript(()=>{const viewport=Object.assign(new EventTarget(),{width:844,height:350,offsetTop:20,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});});
 await page.goto('/');await page.waitForTimeout(3400);
 const bounds=await page.locator('.landing-art,.landing-cta').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}}));
 for(const box of bounds){expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(844);expect(box.top).toBeGreaterThanOrEqual(20);expect(box.bottom).toBeLessThanOrEqual(370);}
 await page.screenshot({path:'docs/screenshots/login-landscape.png'});
});

test('login art and buttons fit narrow portrait screens',async({page})=>{
 for(const size of [{width:390,height:844},{width:320,height:568}]){
  await page.setViewportSize(size);await page.goto('/');await page.waitForTimeout(3400);
  const bounds=await page.locator('.landing-art,.landing-cta').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}}));
  for(const box of bounds){expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(size.width);expect(box.top).toBeGreaterThanOrEqual(0);expect(box.bottom).toBeLessThanOrEqual(size.height);}
  if(size.width===390)await page.screenshot({path:'docs/screenshots/login-portrait.png'});
 }
});
