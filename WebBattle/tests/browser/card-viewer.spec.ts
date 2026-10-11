import {test,expect} from '@playwright/test';

test('card viewer lists the active deck and opens the new grammar card',async({page})=>{
 await page.goto('/cards');
 await expect(page.getByRole('heading',{name:'카드 뷰어'})).toBeVisible();
 await expect(page.locator('.viewer-tile')).toHaveCount(60);
 await expect(page.getByRole('button',{name:/Very 카드 보기/})).toHaveCount(0);
 await page.getByRole('searchbox',{name:'카드 검색'}).fill('to부정사');
 await expect(page.locator('.viewer-tile')).toHaveCount(2);
 await page.getByRole('button',{name:'to부정사 +3 카드 보기'}).click();
 await expect(page.getByRole('dialog',{name:'to부정사 카드 상세'})).toBeVisible();
 await expect(page.getByRole('dialog')).toContainText('동사원형 앞에 놓아');
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('card viewer works in a narrow phone viewport',async({page})=>{
 await page.setViewportSize({width:390,height:720});
 await page.addInitScript(()=>{const viewport=Object.assign(new EventTarget(),{width:390,height:640,offsetTop:24,offsetLeft:0});Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});});
 await page.goto('/cards');
 await page.addStyleTag({content:'body::before,body::after{content:"";position:fixed;left:0;right:0;z-index:2000;background:#18271c;pointer-events:none}body::before{top:0;height:24px}body::after{bottom:0;height:56px}'});
 await expect(page.getByRole('heading',{name:'카드 뷰어'})).toBeVisible();
 await page.getByRole('button',{name:'기능',exact:true}).click();
 await expect(page.locator('.viewer-tile')).toHaveCount(5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('card viewer scrolls through the full deck in landscape',async({browser})=>{
 const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,isMobile:true});
 const phone=await context.newPage();
 try{
  await phone.goto('/cards');
  await expect(phone.locator('.viewer-tile')).toHaveCount(60);
  const before=await phone.evaluate(()=>({height:document.scrollingElement!.scrollHeight,top:scrollY,visible:innerHeight}));
  expect(before.height).toBeGreaterThan(before.visible);
  await phone.mouse.move(400,220);
  await phone.mouse.wheel(0,600);
  await expect.poll(()=>phone.evaluate(()=>scrollY)).toBeGreaterThan(0);
  await phone.locator('.viewer-tile').last().scrollIntoViewIfNeeded();
  expect(await phone.evaluate(()=>scrollY)).toBeGreaterThan(0);
  await expect(phone.locator('.viewer-tile').last()).toBeInViewport();
 }finally{await context.close();}
});
