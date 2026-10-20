// The identity token is still authenticated against the initiating socket nonce.
// This endpoint only returns Apple's form_post to the fixed Android app callback.
export async function appleAndroidCallback(request:Request):Promise<Response>{
 const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
 if(request.method!=='POST'||!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded'))return new Response('Invalid callback',{status:405,headers});
 if(Number(request.headers.get('Content-Length')??0)>16384)return new Response('Too large',{status:413,headers});
 const body=await request.text();if(body.length>16384)return new Response('Too large',{status:413,headers});
 const data=new URLSearchParams(body),state=data.get('state')??'',token=data.get('id_token'),error=data.get('error');
 if(!/^[a-f0-9]{64}$/.test(state)||(!error&&(!token||token.length>8192)))return new Response('Invalid callback',{status:400,headers});
 const redirect=new URL('com.baragames.logoscardgame://auth/apple');redirect.searchParams.set('state',state);
 if(error)redirect.searchParams.set('error','apple_login_failed');else redirect.searchParams.set('id_token',token!);
 const nonce=crypto.randomUUID(),target=JSON.stringify(redirect.href).replace(/</g,'\\u003c');
 return new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Apple 로그인 — 로고스 카드게임</title><h1>로고스 카드게임</h1><p>Apple 인증을 마쳤습니다. 앱으로 돌아가서 로그인을 완료하세요.</p><a id="back">앱으로 돌아가기</a><script nonce="${nonce}">const url=${target};document.getElementById('back').href=url;location.replace(url);</script></html>`,{headers:{...headers,'Content-Type':'text/html;charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`}});
}
