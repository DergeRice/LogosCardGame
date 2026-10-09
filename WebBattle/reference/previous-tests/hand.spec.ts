import { test, expect, type Page } from '@playwright/test';
async function pickFan(page:Page,name:string,touch=false){
 const button=page.getByRole('button',{name:`${name} 카드 선택`,exact:true}).first();
 await button.scrollIntoViewIfNeeded();
 // Click an actually exposed part of the overlapping card, never through a neighbour.
 const point=await button.evaluate(el=>{
  const r=el.getBoundingClientRect();
  for(let y=Math.max(2,r.top+5);y<Math.min(innerHeight-2,r.bottom-5);y+=4)
   for(let x=Math.max(2,r.left+5);x<Math.min(innerWidth-2,r.right-5);x+=4)
    if(document.elementFromPoint(x,y)?.closest('button')===el)return{x,y};
  return null;
 });
 expect(point).not.toBeNull();
 if(touch)await page.touchscreen.tap(point!.x,point!.y);else await page.mouse.click(point!.x,point!.y);
}
test('curved fan, field transfer/undo, partial scoring and VB command synchronize between browsers',async({browser})=>{
 const ca=await browser.newContext({viewport:{width:1280,height:1000}}),cb=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const a=await ca.newPage(),b=await cb.newPage();const errors:string[]=[];for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
 await a.goto('/');await b.goto('/');await a.getByRole('button',{name:'새 대전방 만들기'}).click();const code=await a.getByTestId('room-code').innerText();await b.getByLabel('방번호로 참가').fill(code);await b.getByRole('button',{name:'참가 ↗',exact:true}).click();await a.getByRole('button',{name:'준비 완료',exact:true}).click();await b.getByRole('button',{name:'준비 완료',exact:true}).tap();
 for(const p of [a,b]){await expect(p.locator('.hand-fan .game-card')).toHaveCount(10);const angles=await p.locator('.hand-fan .game-card').evaluateAll(cards=>cards.map(c=>Number.parseFloat((c as HTMLElement).style.getPropertyValue('--fan-angle'))));expect(angles[0]).toBeLessThan(0);expect(angles.at(-1)!).toBeGreaterThan(0);}
 await a.screenshot({path:'docs/screenshots/desktop-fan.png',fullPage:true});await b.screenshot({path:'docs/screenshots/mobile-fan.png',fullPage:true});
 await pickFan(a,'형용사');await expect(a.locator('.hand .game-card')).toHaveCount(9);await expect(a.locator('.sentence-card')).toHaveCount(1);
 await a.getByRole('button',{name:'1번 카드 되돌리기',exact:true}).click();await expect(a.locator('.hand .game-card')).toHaveCount(10);
 await pickFan(a,'형용사');await pickFan(a,'일반동사');await pickFan(a,'형용사');await expect(a.locator('.hand .game-card')).toHaveCount(7);
 await a.getByRole('button',{name:'문장 제출'}).click();await expect(a.getByTestId('my-score')).toHaveText('12');await expect(a.getByText(/명령문 · 제출 2~2번 카드 인정/)).toBeVisible();await expect(a.locator('.sentence-card')).toHaveCount(2);await expect(a.locator('.hand .game-card')).toHaveCount(8);
 await pickFan(b,'일반동사',true);await expect(b.locator('.hand .game-card')).toHaveCount(9);await b.getByRole('button',{name:'문장 제출'}).tap();await expect(b.getByTestId('my-score')).toHaveText('12');await expect(b.locator('.hand .game-card')).toHaveCount(10);await expect(b.locator('.sentence-card')).toHaveCount(0);
 await expect(a.locator('.opponent strong')).toHaveText('12');await expect(b.locator('.opponent strong')).toHaveText('12');
 await a.getByRole('button',{name:'모두 되돌리기'}).click();await expect(a.locator('.hand .game-card')).toHaveCount(10);
 expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await ca.close();await cb.close();
});
