import {test,expect} from '@playwright/test';

test('live AI test board shows every stealable ROB card with its owner',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await expect(page.getByRole('button',{name:'빠른시작'})).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'빠른시작'}).click();
 await expect(page.locator('.battle')).toBeVisible({timeout:20000});
 await page.getByRole('button',{name:'설정 열기'}).click();await page.getByRole('button',{name:'치트 · 특수카드 받기'}).click();await page.getByRole('button',{name:'설정 열기'}).click();
 await expect(page.getByText('테스트 판 · 보상 없음')).toBeVisible();await page.getByRole('button',{name:'설정 닫기'}).click();
 const rob=page.locator('.hand [data-kind="rob"]');await expect(rob).toHaveCount(1);
 const spread=page.getByRole('button',{name:'손패 펼쳐 보기'});if(await spread.isVisible())await spread.click();
 await rob.click();const dialog=page.getByRole('dialog',{name:'ROB 카드 선택'});await expect(dialog).toBeVisible();
 await expect.poll(()=>dialog.locator('.rob-card-choice').count()).toBeGreaterThan(0);
 const owners=await dialog.locator('.rob-card-owner b').allTextContents();
 expect(owners.every(name=>name==='로고스 AI의 카드')).toBe(true);
 await expect(dialog.locator('.special-targets')).toHaveCount(0);
 await expect(dialog.locator('.rob-zone-label')).toHaveCount(0);
 expect(errors).toEqual([]);
});
