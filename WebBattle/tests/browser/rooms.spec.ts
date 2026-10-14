import {guestContext} from './fixtures.js';
import {test,expect} from './fixtures.js';

test('desktop host and mobile guest share a named room, transfer host and start together',async({browser})=>{
 const hostContext=await guestContext(browser,{viewport:{width:1280,height:900}}),guestContextMobile=await guestContext(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const host=await hostContext.newPage(),guest=await guestContextMobile.newPage();const errors:string[]=[];
 for(const page of [host,guest])page.on('pageerror',error=>errors.push(error.message));
 try{
  await Promise.all([host.goto('/'),guest.goto('/')]);
  await expect(host.getByRole('button',{name:'방 목록 · 방 만들기'})).toBeEnabled({timeout:45000});
  await expect(guest.getByRole('button',{name:'방 목록 · 방 만들기'})).toBeEnabled({timeout:45000});
  const nickname=await host.getByTestId('guest-name').textContent();
  await host.getByRole('button',{name:'방 목록 · 방 만들기'}).click();
  await host.getByRole('button',{name:'＋ 방 만들기'}).click();
  await expect(host.locator('.room-lobby h1')).toHaveText(`${nickname}님의 방`);
  await guest.getByRole('button',{name:'방 목록 · 방 만들기'}).tap();
  await expect(guest.locator('.room-list-item')).toHaveCount(1);
  await guest.getByRole('button',{name:'입장'}).tap();
  await expect(host.locator('.room-player')).toHaveCount(2);
  await host.getByRole('button',{name:'방 이름 편집'}).click();
  await host.getByRole('textbox',{name:'방 이름'}).fill('오늘의 대전');
  await host.getByRole('button',{name:'저장'}).click();
  await expect(guest.locator('.room-lobby h1')).toHaveText('오늘의 대전');
  await host.getByRole('button',{name:'＋ AI 추가'}).click();
  await expect(guest.locator('.room-player')).toHaveCount(3);
  await host.getByRole('button',{name:'방 나가기'}).click();
  await expect(guest.locator('.room-player')).toHaveCount(2);
  await expect(guest.getByRole('button',{name:'게임 시작 ↗'})).toBeVisible();
  await guest.getByRole('button',{name:'게임 시작 ↗'}).tap();
  await expect(guest.locator('.battle')).toBeVisible({timeout:20000});
  expect(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
 }finally{await hostContext.close();await guestContextMobile.close();}
});

test('login page begins loading card images before guest entry and reports a percentage',async({page})=>{
 await page.addInitScript(()=>{sessionStorage.removeItem('logos-entry');localStorage.removeItem('logos-account-token');});
 await page.goto('/?intro');
 await expect(page.locator('.landing-preload')).toContainText(/이미지 준비 \d+%/);
 await expect(page.locator('.landing-preload')).toContainText('100%',{timeout:45000});
});
