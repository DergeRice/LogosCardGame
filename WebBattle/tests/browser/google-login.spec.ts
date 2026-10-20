import {test,expect} from './fixtures.js';
test.use({autoGuest:false});
const nonce='a'.repeat(64);
for(const mobile of [false,true])test(`direct provider popup and guest return ${mobile?'mobile':'desktop'}`,async({page,context})=>{
 if(mobile){await page.setViewportSize({width:844,height:390});await page.addInitScript(()=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:844,height:330,offsetTop:20,offsetLeft:0,scale:1})}));}
 const sent:any[]=[];
 await page.route('https://appleid.cdn-apple.com/**',route=>route.fulfill({contentType:'text/javascript',body:`window.AppleID={auth:{init(o){window.testApple=o},async signIn(){window.appleCalls=(window.appleCalls||0)+1;return {authorization:{id_token:'apple-token',state:window.testApple.state}}}}}`}));
 await context.route('https://accounts.google.com/o/oauth2/v2/auth**',async route=>{const u=new URL(route.request().url());expect(u.searchParams.get('nonce')).toBe(nonce);expect(u.searchParams.get('scope')).toBe('openid profile');expect(u.searchParams.get('response_type')).toBe('id_token');const callback=u.searchParams.get('redirect_uri')+'#'+new URLSearchParams({id_token:'google-token',state:nonce});await route.fulfill({contentType:'text/html; charset=utf-8',body:`<button onclick="location.href='${callback}'">Choose Google account</button>`});});
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{
  const m=JSON.parse(String(raw));sent.push(m);
  const session=(account=false)=>ws.send(JSON.stringify({type:'session',id:'guest',uuid:account?'original-account':'guest',token:'guest-token',name:account?'원래 사용자':'게스트 검사',avatar:'pronoun',rating:1000,points:0,coins:account?123:0,account:account?{username:'원래 사용자',provider:'google',linkedProviders:['google']}:null}));
  const auth=()=>{ws.send(JSON.stringify({type:'auth',authToken:'account-token',username:'원래 사용자'}));session(true);};
  if(m.type==='hello')session(Boolean(m.authToken));
  if(m.type==='googleBegin')ws.send(JSON.stringify({type:'googleChallenge',clientId:'test.apps.googleusercontent.com',nonce}));
  if(m.type==='appleBegin')ws.send(JSON.stringify({type:'appleChallenge',clientId:'test.apple',redirectUri:'https://logos-card-battle.netlify.app/',nonce}));
  if(m.type==='googleLogin'){if(m.intent==='link')ws.send(JSON.stringify({type:'googleReturnConfirmation',username:'원래 사용자'}));else auth();}
  if(m.type==='googleReturnConfirm'&&m.accept)auth();
  if(m.type==='appleCredential')auth();
 }));
 await page.goto('/?intro',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('button',{name:'Google로 로그인',exact:true})).toBeEnabled();await page.screenshot({path:`.runtime/v116-login-buttons-${mobile?'mobile':'desktop'}-${test.info().project.name}.png`});
 await expect(page.getByRole('dialog')).toHaveCount(0);
 const open=context.waitForEvent('page',{timeout:15000});await page.getByRole('button',{name:'Google로 로그인',exact:true}).click();const popup=await open;
 await page.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:location.origin,source:window,data:{type:'logos-google-auth',state:'a'.repeat(64),credential:'forged-token'}})));expect(sent.some(m=>m.credential==='forged-token')).toBe(false);await expect(page.getByRole('dialog')).toHaveCount(0);await popup.getByRole('button',{name:'Choose Google account'}).click({timeout:15000});
 await page.waitForURL(u=>u.search==='',{waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:'홈 설정 열기'})).toBeVisible({timeout:60000});expect(await page.evaluate(()=>localStorage.getItem('logos-account-token'))).toBe('account-token');
 // Start a fresh guest without touching the server account, then link to the same identity.
 await page.evaluate(()=>{localStorage.removeItem('logos-account-token');sessionStorage.setItem('logos-entry','guest')});await page.reload();
 await page.getByRole('button',{name:'홈 설정 열기'}).click({timeout:60000});
 const link=page.getByRole('button',{name:'Google 계정 연결하기',exact:true});await expect(link).toBeEnabled();
 const open2=context.waitForEvent('page',{timeout:15000});await link.click();const popup2=await open2;await popup2.getByRole('button',{name:'Choose Google account'}).click();
 const confirm=page.getByRole('dialog',{name:'기존 계정 복귀'});await expect(confirm).toBeVisible();
 if(mobile){const b=(await confirm.boundingBox())!;expect(b.y).toBeGreaterThanOrEqual(20);expect(b.y+b.height).toBeLessThanOrEqual(350);}
 await confirm.getByRole('button',{name:'게스트로 계속하기'}).click();expect(sent.some(m=>m.type==='googleReturnConfirm'&&m.accept===false)).toBe(true);
 const open3=context.waitForEvent('page',{timeout:15000});await link.click();const popup3=await open3;await popup3.getByRole('button',{name:'Choose Google account'}).click();await confirm.getByRole('button',{name:'원래 계정으로 돌아가기'}).click();await expect(confirm).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('logos-account-token'))).toBe('account-token');
 await page.screenshot({path:`.runtime/v116-auth-${mobile?'mobile':'desktop'}-${test.info().project.name}.png`});
});

test('cached game account skips provider selection, including intro URL',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('logos-account-token','saved-token'));
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const m=JSON.parse(String(raw));if(m.type==='hello')ws.send(JSON.stringify({type:'session',uuid:'saved-account',id:'me',token:'session',name:'저장된 사용자',avatar:'pronoun',rating:1000,points:0,coins:12,account:{username:'저장된 사용자',provider:'google',linkedProviders:['google']}}));}));
 await page.goto('/?intro',{waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:'홈 설정 열기'})).toBeVisible({timeout:60000});await expect(page.getByRole('button',{name:'Google로 로그인',exact:true})).toHaveCount(0);
});


test('expired cached account returns to sign-in instead of silently entering another guest',async({page})=>{
 await page.addInitScript(()=>{if(!sessionStorage.getItem('invalid-cache-test')){localStorage.setItem('logos-account-token','expired-token');sessionStorage.setItem('invalid-cache-test','1')}});
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{const m=JSON.parse(String(raw));if(m.type==='hello')ws.send(JSON.stringify({type:'session',id:'guest',token:'guest-token',name:'게스트',avatar:'pronoun',rating:1000,points:0,coins:0,account:null}));}));
 await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.getByRole('main',{name:'로고스 카드게임 로그인'})).toBeVisible({timeout:60000});expect(await page.evaluate(()=>localStorage.getItem('logos-account-token'))).toBe(null);
});
