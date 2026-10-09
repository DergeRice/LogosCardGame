import { test, expect } from '@playwright/test';
test('automatic guests enter rooms immediately, original cards work on desktop and touch',async({browser})=>{
 const desktop=await browser.newContext();const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const a=await desktop.newPage(),b=await mobile.newPage();const errors:string[]=[];for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
 for(const p of [a,b]){await p.goto('/');await expect(p.getByRole('heading',{name:'대전방',exact:true})).toBeVisible();await expect(p.getByTestId('guest-name')).toHaveText(/게스트 \d{4}/);await expect(p.getByLabel('닉네임',{exact:true})).toHaveCount(0);await expect(p.getByRole('button',{name:'새 대전방 만들기'})).toBeEnabled();}
 const guest=await a.getByTestId('guest-name').innerText();await a.reload();await expect(a.getByTestId('guest-name')).toHaveText(guest);
 await a.getByRole('button',{name:'새 대전방 만들기'}).click();const code=await a.getByTestId('room-code').innerText();await b.getByLabel('방번호로 참가').fill(code);await b.getByRole('button',{name:'참가 ↗',exact:true}).tap();
 await a.getByRole('button',{name:'준비 완료',exact:true}).click();await b.getByRole('button',{name:'준비 완료',exact:true}).tap();
 for(const p of [a,b]){
  await p.getByRole('button',{name:'손패 펼쳐 보기'}).click();
  await expect(p.locator('.hand .game-card')).toHaveCount(10);
  const face=p.locator('.hand .illustration').first();const box=await face.boundingBox();expect(box!.width/box!.height).toBeCloseTo(488/693,2);
  await expect(p.locator('.hand .card-top')).toHaveCount(0);
 }
 await a.getByRole('button',{name:'대명사 카드 선택',exact:true}).first().dragTo(a.getByLabel('문장 조합 영역'));await a.getByRole('button',{name:'일반동사 카드 선택',exact:true}).first().click();
 await b.getByRole('button',{name:'일반동사 카드 선택',exact:true}).first().tap();await b.getByRole('button',{name:'대명사 카드 선택',exact:true}).first().tap();await b.getByRole('button',{name:'2번 카드 왼쪽 이동',exact:true}).tap();
 await a.screenshot({path:'docs/screenshots/desktop-original-cards.png',fullPage:true});await b.screenshot({path:'docs/screenshots/mobile-original-cards.png',fullPage:true});
 await Promise.all([a.getByRole('button',{name:'문장 제출'}).click(),b.getByRole('button',{name:'문장 제출'}).tap()]);
 for(const p of [a,b]){await expect(p.getByTestId('my-score')).toHaveText('14');await expect(p.locator('.opponent strong')).toHaveText('14');}
 await b.reload();await expect(b.getByTestId('my-score')).toHaveText('14');expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 await desktop.close();await mobile.close();
});
