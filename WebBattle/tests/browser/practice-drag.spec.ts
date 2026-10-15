import {test,expect} from './fixtures.js';
for(const touch of [false,true])test(`practice uses shared drag and suppresses image menu ${touch?'touch hold':'mouse'}`,async({browser,browserName,baseURL})=>{
 test.skip(touch&&browserName!=='chromium','Native touch injection uses Chromium CDP; WebKit mouse path is tested separately.');
 const context=await browser.newContext({baseURL,viewport:{width:844,height:390},isMobile:touch,hasTouch:touch}),page=await context.newPage();await page.addInitScript(()=>sessionStorage.setItem('logos-entry','guest'));
 try{
  await page.goto('/practice');for(const kind of ['대명사','일반동사','형용사'])await page.getByRole('button',{name:`${kind} 카드 손패에 추가`,exact:true}).click();await page.getByRole('button',{name:'손패 펼쳐 보기'}).click();for(const kind of ['대명사','일반동사'])await page.getByRole('button',{name:`${kind} 필드에 놓기`,exact:true}).click();
  const first=page.locator('[data-field-id]').first(),id=await first.getAttribute('data-field-id'),r=(await first.boundingBox())!,board=(await page.locator('.pointer-field').boundingBox())!,from={x:r.x+r.width/2,y:r.y+r.height/2},to={x:board.x+board.width-35,y:board.y+board.height*.5};
  expect(await first.evaluate(el=>!el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})))).toBe(true);expect(await first.locator('img').evaluate(el=>getComputedStyle(el).getPropertyValue('-webkit-touch-callout')==='none'||getComputedStyle(el).pointerEvents==='none')).toBe(true);
  const cdp=touch?await context.newCDPSession(page):null;
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});await page.waitForTimeout(350);await expect(first).toHaveClass(/drag-holding/);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+15,y:from.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[to]});}else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});}
  await expect(page.locator('.field-drag-slot')).toHaveCount(1);await expect(page.getByRole('region',{name:'카드 버리기'})).toBeVisible();await page.screenshot({path:`.runtime/practice-drag-${browserName}-${touch}.png`});
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach()}else await page.mouse.up();await expect(page.locator('[data-field-id]').last()).toHaveAttribute('data-field-id',id!);await expect(page.locator('.field-drag-slot')).toHaveCount(0);
  await page.locator('[data-field-id]').last().click();await expect(page.locator('[data-field-id]')).toHaveCount(1);await expect(page.locator('.hand .game-card')).toHaveCount(2);
 }finally{await context.close()}
});
