import {test,expect,guestContext} from './fixtures.js';
import {COSMETICS,defaultHubSave} from '../../shared/store.js';

for(const layout of ['portrait','landscape'] as const)test(`demo ranking uses varied catalog profiles ${layout}`,async({browser})=>{
 const viewport=layout==='portrait'?{width:390,height:844}:{width:844,height:390};
 const ctx=await guestContext(browser,{viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await ctx.addInitScript(({viewport})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:viewport.width,height:viewport.height-60,offsetTop:20,offsetLeft:0,scale:1})}),{viewport});
 const page=await ctx.newPage(),save=defaultHubSave();
 await page.routeWebSocket('**/socket',socket=>socket.onMessage(raw=>{
  const message=JSON.parse(String(raw));
  if(message.type==='hello'){
   socket.send(JSON.stringify({type:'session',id:'me',uuid:'ranking-profile-check',name:'프로필 검사',token:'ranking-profile-fixture',avatar:'pronoun',rating:1000,coins:0,points:0}));
   socket.send(JSON.stringify({type:'community',community:{serverNow:Date.now(),rankGames:3,friends:[],incoming:[],outgoing:[],invites:[],store:save}}));
  }
  if(message.type==='ranking')socket.send(JSON.stringify({type:'ranking',tier:message.tier,players:[],total:0}));
 }));
 try{
  await page.goto('/');await page.getByRole('tab',{name:'랭킹',exact:true}).click({timeout:60000});
  const demos=page.locator('.hub-ranking-list [role=listitem]').filter({has:page.getByText('예시',{exact:true})});
  await expect(demos).toHaveCount(11);
  const profileIds=await demos.locator('[data-profile-id]').evaluateAll(avatars=>avatars.map(avatar=>avatar.getAttribute('data-profile-id')));
  expect(new Set(profileIds).size).toBe(11);
  expect(profileIds.every(id=>COSMETICS.some(item=>item.type==='profile'&&item.id===id))).toBe(true);
  expect(profileIds.some(id=>id?.startsWith('profile-accessory-'))).toBe(true);
  await expect.poll(()=>demos.locator('[data-profile-id] img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).naturalWidth>0))).toBe(true);
  await page.screenshot({path:`.runtime/v141-ranking-profiles-${layout}-${test.info().project.name}.png`});
  await page.getByRole('button',{name:'다음 리그'}).click();
  const nextIds=await demos.locator('[data-profile-id]').evaluateAll(avatars=>avatars.map(avatar=>avatar.getAttribute('data-profile-id')));
  expect(nextIds).not.toEqual(profileIds);
  await page.getByRole('button',{name:'이전 리그'}).click();
  await expect.poll(()=>demos.locator('[data-profile-id]').evaluateAll(avatars=>avatars.map(avatar=>avatar.getAttribute('data-profile-id')))).toEqual(profileIds);
 }finally{await ctx.close();}
});
