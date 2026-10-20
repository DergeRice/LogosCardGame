import {test,expect} from './fixtures.js';
test.use({autoGuest:false});
for(const mobile of [false,true])test(`Google landing and settings use server nonce ${mobile?'mobile':'desktop'}`,async({page})=>{
 if(mobile){await page.setViewportSize({width:844,height:390});await page.addInitScript(()=>Object.defineProperty(window,'visualViewport',{value:Object.assign(new EventTarget(),{width:844,height:330,offsetTop:20,offsetLeft:0,scale:1})}));}
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'text/javascript',body:`window.google={accounts:{id:{initialize(options){window.testGoogleOptions=options},renderButton(el){const b=document.createElement('button');b.textContent='테스트 Google 계정 선택';b.onclick=()=>window.testGoogleOptions.callback({credential:'test-credential'});el.append(b)}}}};`}));
 const sent:any[]=[];
 await page.routeWebSocket('**/socket',ws=>ws.onMessage(raw=>{
  const m=JSON.parse(String(raw));sent.push(m);
  if(m.type==='hello')ws.send(JSON.stringify({type:'session',id:'guest-id',uuid:'guest-id',token:'guest-token',name:'연동 검사',avatar:'pronoun',rating:1000,points:0,coins:123,account:null}));
  if(m.type==='googleBegin')ws.send(JSON.stringify({type:'googleChallenge',clientId:'test.apps.googleusercontent.com',nonce:'server-nonce'}));
  if(m.type==='googleLogin'&&m.intent==='link'){ws.send(JSON.stringify({type:'googleReturnConfirmation',username:'구글 사용자'}));return;}
  if(m.type==='googleLogin'||(m.type==='googleReturnConfirm'&&m.accept===true)){ws.send(JSON.stringify({type:'auth',authToken:'test-account-token',username:'구글 사용자'}));ws.send(JSON.stringify({type:'session',id:'guest-id',uuid:'account-id',token:'guest-token',name:'구글 사용자',avatar:'pronoun',rating:1000,points:0,coins:123,account:{username:'구글 사용자',provider:'google'}}));}
 }));
 await page.goto('/?intro',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Google로 로그인',exact:true}).click({timeout:45000});
 const dialog=page.getByRole('dialog',{name:'Google 계정 연결'});await expect(dialog.getByRole('button',{name:'테스트 Google 계정 선택'})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).testGoogleOptions.nonce)).toBe('server-nonce');
 const box=await dialog.boundingBox();if(mobile){expect(box!.y).toBeGreaterThanOrEqual(20);expect(box!.y+box!.height).toBeLessThanOrEqual(350);}
 await page.screenshot({path:`.runtime/google-login-${mobile?'mobile':'desktop'}-${test.info().project.name}.png`});
 await dialog.getByRole('button',{name:'테스트 Google 계정 선택'}).click();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('logos-account-token'))).toBe('test-account-token');
 expect(sent.find(m=>m.type==='googleLogin')).toEqual({type:'googleLogin',credential:'test-credential',intent:'login'});
 await page.waitForURL(url=>url.pathname==='/'&&url.search==='',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'홈 설정 열기'}).click({timeout:45000});
 // The new session is a guest in this transport fixture; settings can initiate linking on its existing socket.
 await page.getByRole('button',{name:'Google 계정 연결하기'}).click();await expect(page.getByRole('dialog',{name:'Google 계정 연결'})).toBeVisible();
 await page.getByRole('button',{name:'테스트 Google 계정 선택'}).click();
 await expect(page.getByRole('heading',{name:'원래 계정으로 돌아가시겠습니까?'})).toBeVisible();
 if(mobile){const bounds=await dialog.boundingBox();expect(bounds!.y).toBeGreaterThanOrEqual(20);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(350);}
 await page.screenshot({path:`.runtime/google-return-${mobile?'mobile':'desktop'}-${test.info().project.name}.png`});
 await page.getByRole('button',{name:'게스트로 계속하기',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Google 계정 연결'})).toHaveCount(0);
 expect(sent.some(m=>m.type==='googleReturnConfirm'&&m.accept===false)).toBe(true);
 await page.getByRole('button',{name:'홈 설정 열기'}).click();
 await page.getByRole('button',{name:'Google 계정 연결하기'}).click();
 await page.getByRole('button',{name:'테스트 Google 계정 선택'}).click();
 await page.getByRole('button',{name:'원래 계정으로 돌아가기',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Google 계정 연결'})).toHaveCount(0);
 expect(sent.some(m=>m.type==='googleReturnConfirm'&&m.accept===true)).toBe(true);
});
