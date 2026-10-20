import {test,expect} from './fixtures.js';
test.use({autoGuest:false});
for(const mobile of [false,true])test(`Apple login uses the server nonce and keeps Google available ${mobile?'mobile':'desktop'}`,async({page})=>{
 if(mobile){await page.setViewportSize({width:844,height:390});await page.addInitScript(()=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:844,height:330,offsetTop:20,offsetLeft:0,scale:1})}));}
 await page.route('https://appleid.cdn-apple.com/**',route=>route.fulfill({contentType:'text/javascript',body:`window.AppleID={auth:{init(options){window.testAppleOptions=options},async signIn(){return {authorization:{id_token:'test-apple-token'},user:{name:{firstName:'연동',lastName:'사용자'}}}}}};`}));
 const sent:any[]=[];
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{
  const m=JSON.parse(String(raw));sent.push(m);
  if(m.type==='hello')ws.send(JSON.stringify({type:'session',id:'guest-id',uuid:'guest-id',token:'guest-token',name:'Apple 검사',avatar:'pronoun',rating:1000,points:0,coins:0}));
  if(m.type==='appleBegin')ws.send(JSON.stringify({type:'appleChallenge',clientId:'com.baragames.logoscardgame.web',redirectUri:'https://logos-card-battle.netlify.app/',nonce:'a'.repeat(64)}));
  if(m.type==='appleCredential'){ws.send(JSON.stringify({type:'auth',authToken:'apple-game-account-token',username:'Apple 사용자'}));ws.send(JSON.stringify({type:'session',id:'guest-id',uuid:'account-id',token:'guest-token',name:'Apple 사용자',avatar:'pronoun',rating:1000,points:0,coins:0,account:{username:'Apple 사용자',provider:'apple',linkedProviders:['google','apple']}}));}
 }));
 await page.goto('/?intro');await expect(page.getByRole('button',{name:'Google로 로그인',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Apple ID로 로그인',exact:true}).click({timeout:45000});
 const dialog=page.getByRole('dialog',{name:'Apple 계정 연결'});await expect(dialog.getByRole('button',{name:'Apple 계정으로 계속하기'})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).testAppleOptions.nonce)).toBe('a'.repeat(64));
 expect(await page.evaluate(()=>(window as any).testAppleOptions.state)).toBe('a'.repeat(64));
 const box=await dialog.boundingBox();if(mobile){expect(box!.y).toBeGreaterThanOrEqual(20);expect(box!.y+box!.height).toBeLessThanOrEqual(350);}
 await page.screenshot({path:`.runtime/apple-login-${mobile?'mobile':'desktop'}-${test.info().project.name}.png`});
 await dialog.getByRole('button',{name:'Apple 계정으로 계속하기'}).click();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('logos-account-token'))).toBe('apple-game-account-token');
 expect(sent.find(m=>m.type==='appleBegin')).toMatchObject({platform:'web'});
 expect(sent.find(m=>m.type==='appleCredential')).toEqual({type:'appleCredential',credential:'test-apple-token',name:'연동 사용자'});
});
