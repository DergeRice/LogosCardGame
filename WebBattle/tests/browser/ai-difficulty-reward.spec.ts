import {test,expect,guestContext} from './fixtures.js';
import {defaultHubSave} from '../../shared/store.js';

for(const {name,rating,viewport,mobile,options,bonus} of [
 {name:'bronze portrait',rating:1000,viewport:{width:390,height:844},mobile:true,options:['easy','normal','hard','veryHard'],bonus:'골드 AI · 승리 +15%'},
 {name:'gold landscape',rating:2000,viewport:{width:844,height:390},mobile:true,options:['normal','hard','veryHard'],bonus:'에메랄드 AI · 승리 +15%'},
 {name:'diamond desktop',rating:3500,viewport:{width:1366,height:900},mobile:false,options:['veryHard'],bonus:'네더라이트 AI · 승리 +10%'}
] as const)test(`AI choices and bonus preview ${name}`,async({browser})=>{
 const ctx=await guestContext(browser,{viewport,isMobile:mobile,hasTouch:mobile});
 if(mobile)await ctx.addInitScript(({viewport})=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:viewport.width,height:viewport.height-60,offsetTop:20,offsetLeft:0,scale:1})}),{viewport});
 const page=await ctx.newPage(),sent:any[]=[];
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const m=JSON.parse(String(raw));sent.push(m);if(m.type==='hello'){ws.send(JSON.stringify({type:'session',id:'me',name:'AI 검사',token:'ai-check',avatar:'pronoun',rating,coins:0,points:0}));ws.send(JSON.stringify({type:'community',community:{friends:[],incoming:[],outgoing:[],invites:[],store:defaultHubSave()}}));}}));
 try{
  await page.goto('/');const select=page.getByRole('combobox',{name:'AI난이도 설정'});
  await expect(select).toBeVisible({timeout:10000});
  expect(await select.locator('option').evaluateAll(xs=>xs.map(x=>(x as HTMLOptionElement).value))).toEqual(options);
  await select.selectOption('veryHard');await expect(page.locator('.hub-ai-reward')).toHaveText(bonus);
  const badge=await page.locator('.hub-ai-reward').boundingBox();expect(badge).not.toBeNull();expect(badge!.x).toBeGreaterThanOrEqual(0);expect(badge!.x+badge!.width).toBeLessThanOrEqual(viewport.width);
  await page.getByRole('button',{name:'빠른 시작',exact:true}).click();await expect.poll(()=>sent.find(m=>m.type==='quick')?.difficulty).toBe('veryHard');
 }finally{await ctx.close()}
});

