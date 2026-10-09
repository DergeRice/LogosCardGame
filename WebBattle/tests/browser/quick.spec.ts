import { test, expect, type Page } from '@playwright/test';
import { CATALOG, type Card, type Kind } from '../../shared/rules.js';
import { chooseMove } from '../../server/ai.js';
async function hand(page:Page):Promise<Card[]>{return page.locator('.hand .game-card').evaluateAll(els=>els.map(e=>({id:e.getAttribute('data-card-id')!,kind:e.getAttribute('data-kind') as Kind,variant:e.getAttribute('data-variant')||undefined})));}
async function pick(page:Page,id:string,touch=false){const button=page.locator(`[data-card-id="${id}"]`);await button.scrollIntoViewIfNeeded({timeout:5000});await expect(button).toBeEnabled();const point=await button.evaluate(el=>{
 const r=el.getBoundingClientRect();let best:{x:number;y:number;distance:number}|null=null;
 const hit=(x:number,y:number)=>document.elementFromPoint(x,y)?.closest('button')===el;
 for(let y=Math.max(10,r.top+10);y<Math.min(innerHeight-10,r.bottom-10);y+=4)
  for(let x=Math.max(10,r.left+10);x<Math.min(innerWidth-10,r.right-10);x+=4){
   if(![[0,0],[8,0],[-8,0],[0,8],[0,-8]].every(([dx,dy])=>hit(x+dx,y+dy)))continue;
   const distance=Math.hypot(x-(r.left+r.width/2),y-(r.top+r.height/2));if(!best||distance<best.distance)best={x,y,distance};
  }
 return best;
});expect(point).not.toBeNull();if(touch)await page.touchscreen.tap(point!.x,point!.y);else await page.mouse.click(point!.x,point!.y);await expect(button).toHaveCount(0);}

test('two isolated browsers: unique deck, click return, mouse/touch drag preview, unanimous draw and reconnect',async({browser})=>{
 const ca=await browser.newContext({viewport:{width:1280,height:1000}}),cb=await browser.newContext({viewport:process.env.BATTLE_MOBILE_LANDSCAPE?{width:844,height:390}:{width:390,height:844},isMobile:true,hasTouch:true});const a=await ca.newPage(),b=await cb.newPage();const urls:string[]=[],errors:string[]=[];for(const p of[a,b]){p.on('websocket',ws=>{if(new URL(ws.url()).pathname==='/socket')urls.push(ws.url());});p.on('pageerror',e=>errors.push(e.message));}
 try{
  await Promise.all([a.goto('/',{waitUntil:'domcontentloaded'}),b.goto('/',{waitUntil:'domcontentloaded'})]);
  for(const p of [a,b])await expect(p.getByRole('button',{name:'빠른시작'})).toBeVisible({timeout:45000});
  await a.getByRole('button',{name:'빠른시작'}).click();await b.getByRole('button',{name:'빠른시작'}).tap();
  await expect(a.getByRole('heading',{name:'매칭 성사!'})).toBeVisible();
  for(const p of[a,b]){await expect(p.locator('.hand .game-card')).toHaveCount(5);await expect(p.locator('.hand .game-card').first()).toBeEnabled();}
  await expect(a.locator('.table-player:not(.self) .mini-hand-preview .status-card-block')).toHaveCount(5);
  await a.getByRole('button',{name:/의 손패와 문장 보기/}).click();await expect(a.locator('.opponent-field-preview .opponent-preview-group').first().locator('img')).toHaveCount(5);await expect(a.locator('.hand[aria-label="내 손패"] .game-card')).toHaveCount(5);await a.getByRole('button',{name:'상대 미리보기 닫기'}).click();await expect(a.locator('.sentence-area')).toBeVisible();
  const first=(await hand(b)).find(c=>!['get2','get3','rob','exchange','protect'].includes(c.kind))!;await pick(b,first.id,true);await a.getByRole('button',{name:/의 손패와 문장 보기/}).click();await expect(a.locator('.opponent-preview-group').filter({hasText:'현재 문장'}).locator('img')).toHaveCount(1);await expect(a.locator('.opponent-preview-group').first().locator('img')).toHaveCount(4);await expect(a.locator('.hand .game-card')).toHaveCount(5);await a.getByRole('button',{name:'내 프로필 · 내 문장 보기'}).click();await expect(a.locator('.sentence-area')).toBeVisible();await b.locator('.sentence-card').tap();await expect(b.locator('[data-card-id="'+first.id+'"]').first()).toBeVisible();
  for(const [p,touch] of [[a,false],[b,true]] as const){
   await expect.poll(async()=> (await hand(p)).filter(c=>!['get2','get3','rob','exchange','protect'].includes(c.kind)).length,{timeout:25000}).toBeGreaterThanOrEqual(2);const cards=(await hand(p)).filter(c=>!['get2','get3','rob','exchange','protect'].includes(c.kind)).slice(0,2);for(const card of cards)await pick(p,card.id,touch);
   await expect(p.locator('.sentence-card button')).toHaveCount(0);
   const field=p.locator('.sentence-area');await field.scrollIntoViewIfNeeded();
   const r1=await p.locator('[data-field-id="'+cards[0].id+'"]').boundingBox(),r2=await p.locator('[data-field-id="'+cards[1].id+'"]').boundingBox();expect(r1).not.toBeNull();expect(r2).not.toBeNull();
   const from={x:r1!.x+r1!.width/2,y:r1!.y+r1!.height/2},to={x:r2!.x+r2!.width-5,y:r2!.y+r2!.height/2};
   const cdp=touch?await p.context().newCDPSession(p):null;
   if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[to]});}
   else{await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps:8});}
   await expect(p.locator('.drop-preview')).toBeVisible();await expect(p.locator('[data-field-id="'+cards[0].id+'"]')).toHaveCount(0);
   await p.screenshot({path:'docs/screenshots/drag-preview-'+(touch?'mobile':'desktop')+'.png',fullPage:true});
   if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}else await p.mouse.up();
   await expect(p.locator('.drop-preview')).toHaveCount(0);expect(await p.locator('[data-field-id]').evaluateAll(els=>els.map(e=>e.getAttribute('data-field-id')))).toEqual([cards[1].id,cards[0].id]);
   for(let i=0;i<2;i++){if(touch)await p.locator('.sentence-card').first().tap();else await p.locator('.sentence-card').first().click();}
  }
  await expect(a.locator('.deck-request-button')).toContainText('0/2');await a.getByRole('button',{name:'카드 배분 동의'}).click();await expect(b.locator('.deck-request-button')).toContainText('1/2');await expect(a.locator('.hand .game-card')).toHaveCount(5);await b.getByRole('button',{name:'카드 배분 동의'}).tap();for(const p of[a,b])await expect(p.locator('.hand .game-card')).toHaveCount(6);
  await a.getByRole('button',{name:'감정표현 열기'}).click();await expect(a.locator('.emoji-options button')).toHaveCount(4);await a.getByRole('button',{name:'👍 감정표현 보내기'}).click();await expect(b.locator('.reaction-bubble')).toContainText('👍');
  let target=a,verb:Card|undefined;for(let i=0;i<5&&!verb;i++){for(const p of[a,b]){verb=(await hand(p)).find(c=>c.kind==='verb');if(verb){target=p;break;}}if(!verb){await a.getByRole('button',{name:'카드 배분 동의'}).click();await b.getByRole('button',{name:'카드 배분 동의'}).tap();}}
  expect(verb).toBeDefined();await pick(target,verb!.id,target===b);await target.getByRole('button',{name:'문장 제출'}).click();await expect(target.locator('.score-calculation.score-only')).toBeVisible();await expect(target.locator('.score-calculation.score-only')).toContainText(/^\d+$/);await expect(target.getByTestId('my-score')).toHaveText('0');await expect(target.locator('[data-field-id="'+verb!.id+'"]')).toHaveCount(1);
  await target.waitForTimeout(1600);await target.getByRole('button',{name:'문장 제출'}).click();await expect(target.getByTestId('my-score')).toHaveText('0');await expect(target.locator('[data-field-id="'+verb!.id+'"]')).toHaveCount(1);await target.screenshot({path:'docs/screenshots/correct-retained.png',fullPage:true});await target.locator('.sentence-card').click();
  const all=[...await hand(a),...await hand(b)];expect(new Set(all.map(c=>c.kind+':'+(c.variant||'base'))).size).toBe(all.length);
  const ids=(await hand(a)).map(c=>c.id);await a.reload();await expect(a.locator('.battle')).toBeVisible({timeout:45000});for(const id of ids)expect((await hand(a)).some(c=>c.id===id)).toBe(true);
  await a.screenshot({path:'docs/screenshots/quick-table-desktop.png',fullPage:true});await b.screenshot({path:'docs/screenshots/quick-table-mobile.png',fullPage:true});expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);if(process.env.EXPECTED_WS_URL){expect(urls.length).toBeGreaterThanOrEqual(2);expect(urls.every(url=>url===process.env.EXPECTED_WS_URL)).toBe(true);}
 }finally{await ca.close();await cb.close();}
});

test('two isolated browsers receive the automatic card at 30 seconds without a vote',async({browser})=>{
 const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
 const pages=await Promise.all(contexts.map(c=>c.newPage()));
 try{
  await Promise.all(pages.map(p=>p.goto('/')));
  await Promise.all(pages.map(p=>p.getByRole('button',{name:'빠른시작'}).click()));
  await Promise.all(pages.map(p=>expect(p.locator('.hand .game-card')).toHaveCount(5,{timeout:20000})));
  for(const p of pages)await expect(p.locator('.deck-request-button')).toContainText('0/2');
  await Promise.all(pages.map(p=>expect(p.locator('.hand .game-card')).toHaveCount(6,{timeout:38000})));
  for(const p of pages)await expect(p.locator('.deck-request-button')).toContainText('0/2');
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});

test('mobile unlimited AI match: quick start, refresh and intentional exit',async({browser})=>{
 const ctx=await browser.newContext({viewport:process.env.BATTLE_MOBILE_LANDSCAPE?{width:844,height:390}:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage(),errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
 try{await p.goto('/');await expect(p.getByRole('button',{name:'빠른시작'})).toBeVisible({timeout:45000});await p.getByRole('button',{name:'빠른시작'}).tap();await expect(p.getByText('대기 중인 상대가 없어 AI 매칭을 준비했어요.')).toHaveCount(0);await expect(p.getByRole('heading',{name:'매칭 성사!'})).toBeVisible();await expect(p.locator('.rival-profiles')).toContainText('로고스 AI');await expect(p.locator('.battle')).toBeVisible({timeout:15000});await expect(p.locator('.table-scoreboard')).toContainText('AI');await expect(p.locator('.round-strip')).toContainText('시간 제한 없음');await p.reload();await expect(p.locator('.battle')).toBeVisible({timeout:45000});await expect(p.locator('.round-strip')).toContainText('시간 제한 없음');p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'설정 열기'}).tap();await p.getByRole('button',{name:'대전 나가기'}).tap();await expect(p.getByRole('button',{name:'빠른시작'})).toBeVisible();expect(errors).toEqual([]);}finally{await ctx.close();}
});

test('four independent browser guests share a table and see a synchronized forfeit result',async({browser})=>{
 const contexts=await Promise.all(Array.from({length:4},(_,i)=>browser.newContext({viewport:i===3?{width:390,height:844}:{width:1280,height:900},hasTouch:i===3,isMobile:i===3}))),pages=await Promise.all(contexts.map(c=>c.newPage()));
 try{
  await Promise.all(pages.map(p=>p.goto('/',{waitUntil:'domcontentloaded'})));await Promise.all(pages.map(p=>expect(p.getByRole('button',{name:'빠른시작'})).toBeVisible({timeout:60000})));await Promise.all(pages.map(p=>p.getByRole('button',{name:'빠른시작'}).click()));
  await Promise.all(pages.map(p=>expect(p.locator('.match-profile')).toHaveCount(4)));for(const p of pages){await expect(p.locator('.table-player')).toHaveCount(4);await expect(p.locator('.hand .game-card')).toHaveCount(5);}
  await pages[3].screenshot({path:'docs/screenshots/quick-four-mobile.png',fullPage:true});await pages[0].screenshot({path:'docs/screenshots/quick-four-desktop.png',fullPage:true});
  pages[0].once('dialog',d=>d.accept());await pages[0].getByRole('button',{name:'설정 열기'}).click();await pages[0].getByRole('button',{name:'대전 나가기'}).click();await expect(pages[0].getByRole('button',{name:'빠른시작'})).toBeVisible();for(const p of pages.slice(1))await expect(p.locator('.result')).toBeVisible();expect(await pages[3].evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{for(const c of contexts)await c.close();}
});

