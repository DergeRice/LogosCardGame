import {test,expect} from '@playwright/test';

test('account can be created, resumed, logged out, and used again',async({page})=>{
 const username=`learner${Date.now().toString(36)}`;
 await page.goto('/');
 await expect(page.getByRole('button',{name:'계정 만들기'})).toBeVisible({timeout:60_000});
 await page.getByRole('button',{name:'계정 만들기'}).click({timeout:60_000});
 await page.getByLabel('아이디').fill(username);
 await page.getByLabel('비밀번호').fill('a strong test password');
 await page.getByRole('button',{name:'만들고 연동'}).click();
 await expect(page.getByTestId('guest-name')).toHaveText(username);
 await expect(page.getByText('계정 레이팅 저장 중')).toBeVisible();
 await page.reload();
 await expect(page.getByTestId('guest-name')).toHaveText(username);
 await page.getByRole('button',{name:'로그아웃'}).click();
 await expect(page.getByRole('button',{name:'계정 로그인'})).toBeVisible();
 await page.getByRole('button',{name:'계정 로그인'}).click();
 await page.getByLabel('아이디').fill(username);
 await page.getByLabel('비밀번호').fill('a strong test password');
 await page.getByRole('button',{name:'로그인',exact:true}).click();
 await expect(page.getByTestId('guest-name')).toHaveText(username);
});

test('account dialog stays inside the visible mobile viewport',async({page})=>{
 await page.setViewportSize({width:667,height:320});
 await page.addInitScript(()=>{const viewport=Object.assign(new EventTarget(),{width:667,height:240,offsetTop:24,offsetLeft:0});Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});});
 await page.goto('/');
 await page.getByRole('button',{name:'계정 만들기'}).click();
 const box=await page.getByRole('dialog',{name:'계정 만들기'}).boundingBox();
 expect(box).not.toBeNull();expect(box!.y).toBeGreaterThanOrEqual(24);expect(box!.y+box!.height).toBeLessThanOrEqual(264);
});
