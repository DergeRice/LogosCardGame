import {test,expect} from './fixtures.js';
for(const size of [{width:667,height:320},{width:844,height:390},{width:1280,height:800}])test(`practice table and home artwork ${size.width}`,async({browser,baseURL})=>{
 const mobile=size.width<1000,context=await browser.newContext({baseURL,viewport:size,isMobile:mobile,hasTouch:mobile});
 await context.addInitScript(({mobile,size})=>{sessionStorage.setItem('logos-entry','guest');if(mobile){const v=new EventTarget();Object.assign(v,{width:size.width,height:size.height-48,offsetTop:24,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:v});}},{mobile,size});
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{if(JSON.parse(String(raw)).type==='hello'){ws.send(JSON.stringify({type:'session',token:'layout-fixture',name:'게스트 1234',avatar:'pronoun',rating:1000,points:0}));}}));
 try{
  await page.goto('/');await expect(page.locator('.welcome-profile')).toBeVisible();await expect(page.locator('.dashboard-cards')).toBeVisible();await expect.poll(()=>page.locator('.welcome-profile').evaluate(el=>{const r=el.getBoundingClientRect();return r.top})).toBeGreaterThanOrEqual(mobile?24:0);
  await page.locator('.welcome-profile').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
  const profile=(await page.locator('.welcome-profile').boundingBox())!,actions=(await page.locator('.dashboard-actions').boundingBox())!,art=(await page.locator('.dashboard-cards').boundingBox())!;
  if(mobile){expect(profile.y).toBeLessThan(48);expect(profile.y+profile.height).toBeLessThan(actions.y);expect(actions.y+actions.height).toBeLessThanOrEqual(art.y+5);}
  expect(await page.locator('.dashboard-cards').evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);await page.screenshot({path:`.runtime/layout-home-${browser.browserType().name()}-${size.width}.png`});
  await page.goto('/practice');await expect(page.locator('.practice-supply button')).toHaveCount(18);await expect(page.locator('.practice-supply img')).toHaveCount(0);
  for(const kind of ['대명사','일반동사','형용사'])await page.getByRole('button',{name:`${kind} 카드 손패에 추가`,exact:true}).click();
  await expect(page.locator('.hand-fan .game-card')).toHaveCount(3);await page.screenshot({path:`.runtime/layout-fan-${browser.browserType().name()}-${size.width}.png`});await page.getByRole('button',{name:'손패 펼쳐 보기'}).click();
  for(const kind of ['대명사','일반동사'])await page.getByRole('button',{name:`${kind} 필드에 놓기`,exact:true}).click();
  await expect(page.locator('.sentence-card')).toHaveCount(2);await expect(page.locator('.hand .game-card')).toHaveCount(1);await page.getByRole('button',{name:'문장 확인',exact:true}).click();await expect(page.getByRole('status')).toContainText('2장 인정');
  const board=(await page.locator('.field-feedback-wrap').boundingBox())!,hand=(await page.locator('.practice-hand-zone').boundingBox())!;expect(board.y+board.height).toBeLessThanOrEqual(hand.y+1);
  for(const img of await page.locator('.sentence-card img,.hand .game-card img').all())expect(await img.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>=400)).toBe(true);
  const card=(await page.locator('.sentence-card').first().boundingBox())!;expect(card.height/card.width).toBeGreaterThan(1.35);expect(card.height/card.width).toBeLessThan(1.5);
  await page.screenshot({path:`.runtime/layout-practice-${browser.browserType().name()}-${size.width}.png`});await page.getByRole('button',{name:'1번 대명사 카드 손패로 돌리기',exact:true}).click();await expect(page.locator('.hand .game-card')).toHaveCount(2);await page.getByRole('button',{name:'모두 되돌리기',exact:true}).click();await expect(page.locator('.sentence-card')).toHaveCount(0);await expect(page.locator('.hand .game-card')).toHaveCount(3);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 }finally{await context.close();}
});
