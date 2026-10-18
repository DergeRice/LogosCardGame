import {guestContext} from './fixtures.js';
import {test,expect} from './fixtures.js';

test('desktop host and mobile guest share a named room, transfer host and start together',async({browser})=>{
 const hostContext=await guestContext(browser,{viewport:{width:1280,height:900}}),guestContextMobile=await guestContext(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const host=await hostContext.newPage(),guest=await guestContextMobile.newPage();const errors:string[]=[];
 for(const page of [host,guest])page.on('pageerror',error=>errors.push(error.message));
 try{
  await Promise.all([host.goto('/'),guest.goto('/')]);
  await expect(host.getByRole('button',{name:'＋ 방 만들기'})).toBeEnabled({timeout:45000});
  await expect(guest.getByRole('button',{name:'방 목록',exact:true})).toBeEnabled({timeout:45000});
  await expect(guest.locator('.hub-rooms')).toHaveCount(0);
  await guest.getByRole('button',{name:'방 목록',exact:true}).tap();
  const nickname=await host.getByTestId('guest-name').textContent();
  await host.getByRole('button',{name:'＋ 방 만들기'}).click();
  await expect(host.locator('.room-lobby h1')).toHaveText(`${nickname}님의 방`);
  await expect(guest.locator('.hub-rooms article')).toHaveCount(1);
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

test('login page begins loading card images before guest entry without showing a percentage',async({page})=>{
 const cards:string[]=[];page.on('request',request=>{if(request.url().includes('/cards/'))cards.push(request.url());});
 await page.addInitScript(()=>{sessionStorage.removeItem('logos-entry');localStorage.removeItem('logos-account-token');});
 await page.goto('/?intro');
 await expect.poll(()=>cards.length).toBeGreaterThan(0);
 await expect(page.locator('.login-landing')).not.toContainText(/\d+%/);
});

test('room browser stays inside a short mobile visual viewport',async({browser})=>{
 const context=await guestContext(browser,{viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,get:()=>innerHeight-60});});
 const page=await context.newPage();
 try{
  await page.goto('/');
  await expect(page.getByRole('button',{name:'방 목록',exact:true})).toBeEnabled({timeout:45000});
  await expect(page.locator('.hub-rooms')).toHaveCount(0);
  await page.getByRole('button',{name:'방 목록',exact:true}).click();
  const bounds=await page.evaluate(()=>({visualHeight:visualViewport!.height,dialogBottom:document.querySelector('.hub-mobile-room-window')!.getBoundingClientRect().bottom,stageHeight:document.querySelector('.shell')!.getBoundingClientRect().height}));
  expect(bounds.stageHeight).toBe(bounds.visualHeight);
  expect(bounds.dialogBottom).toBeLessThanOrEqual(bounds.visualHeight);
 }finally{await context.close();}
});
