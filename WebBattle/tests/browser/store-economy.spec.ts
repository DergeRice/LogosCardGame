import {test,expect,guestContext} from './fixtures.js';
import {defaultHubSave} from '../../shared/store.js';
for(const mobile of [false,true])test(`v96 shop odds prices and board reveal ${mobile?'mobile':'desktop'}`,async({browser})=>{
 const ctx=await guestContext(browser,{viewport:mobile?{width:844,height:390}:{width:1366,height:900},isMobile:mobile,hasTouch:mobile});
 if(mobile)await ctx.addInitScript(()=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:844,height:330,offsetTop:20,offsetLeft:0,scale:1})}));
 const page=await ctx.newPage(),store={...defaultHubSave(),dust:849},errors:string[]=[],sent:any[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const m=JSON.parse(String(raw));sent.push(m);if(m.type==='hello'){ws.send(JSON.stringify({type:'session',name:'상점 검증',token:'economy-fixture',avatar:'pronoun',rating:1000,coins:50000,points:0}));ws.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store}}));}}));
 try{
  await page.goto('/');await page.getByRole('tab',{name:'상점',exact:true}).click({timeout:60000});
  await expect(page.getByRole('button',{name:'✧ 850 · 구매',exact:true})).toBeDisabled();
  for(const [category,price] of [['보드판',500],['배경',400],['프레임',300],['이모티콘',200]] as const){await page.getByRole('tab',{name:category,exact:true}).click();await expect(page.getByRole('button',{name:`✧ ${price} · 구매`,exact:true}).first()).toBeEnabled();}
  const boxes=page.locator('.store-box-rows>article');
  for(let i=0;i<3;i++){
   await boxes.nth(i).getByRole('button',{name:'획득 확률 ⓘ'}).click();const rates=page.getByRole('dialog',{name:'상자 확률',exact:true});
   await expect(rates).toContainText(['59.5%','25%','10%'][i]);await expect(rates).toContainText(['7.5%','18%','22%'][i]);await expect(rates).toContainText('보드판');await expect(rates).toContainText('천장 없음');
   await rates.getByRole('button',{name:'확인',exact:true}).click();
  }
  // A controlled random roll selects a board, not a forced server payout.
  await page.evaluate(()=>{Math.random=()=>.9999});await boxes.first().getByRole('button',{name:'1회 오픈 무료',exact:true}).click();
  const result=page.getByRole('dialog',{name:'상자 결과',exact:true});await expect(result).toHaveAttribute('data-phase','cards');await result.getByRole('button',{name:'전체 뒤집기',exact:true}).click();await expect(result.locator('.is-revealed')).toHaveCount(1);await expect(result.locator('.reward-flip')).toHaveAttribute('data-loot-type','board');await result.getByRole('button',{name:'확인',exact:true}).click();
  await page.screenshot({path:`.runtime/v96-shop-${mobile?'mobile':'desktop'}-${test.info().project.name}.png`});
  expect(sent.filter(m=>m.type==='storeOpen')).toHaveLength(0);expect(errors).toEqual([]);expect(await page.evaluate(()=>scrollY)).toBe(0);
 }finally{await ctx.close();}
});
