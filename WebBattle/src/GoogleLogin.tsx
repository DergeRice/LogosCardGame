import {useEffect,useRef,useState} from 'react';
import {nativeCredential,nativePlatform,gameSocketURL} from './nativeAuth.js';
type Provider='google'|'apple';
type Challenge={clientId:string;iosClientId?:string;redirectUri?:string;nonce:string};
type AppleAPI={auth:{init:(config:Record<string,unknown>)=>void;signIn:()=>Promise<{authorization:{id_token:string;state:string};user?:{name?:{firstName?:string;lastName?:string}}}>}};
let appleSdk:Promise<AppleAPI>|undefined;
function loadApple(){return appleSdk??=new Promise<AppleAPI>((resolve,reject)=>{
 const current=()=> (window as Window&{AppleID?:AppleAPI}).AppleID;if(current())return resolve(current()!);
 const script=document.createElement('script');script.src='https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/ko_KR/appleid.auth.js';script.async=true;
 const fail=()=>{clearTimeout(timer);appleSdk=undefined;script.remove();reject(Error('Apple 로그인 연결에 실패했어요. 다시 시도해 주세요.'));};
 const timer=setTimeout(fail,15000);script.onload=()=>{clearTimeout(timer);if(current())resolve(current()!);else fail();};script.onerror=fail;document.head.append(script);
});}
export function AccountLoginButtons({socket,onSuccess,linked=[],available=true}:{socket?:WebSocket|null;onSuccess:()=>void;linked?:string[];available?:boolean}){
 const own=!socket,connection=useRef<WebSocket|null>(null),configs=useRef<Partial<Record<Provider,Challenge>>>({});
 const [ready,setReady]=useState<Partial<Record<Provider,boolean>>>({}),[busy,setBusy]=useState<Provider|null>(null),[error,setError]=useState(''),[returnAccount,setReturnAccount]=useState<string|null>(null);
 const busyRef=useRef<Provider|null>(null),popup=useRef<Window|null>(null),popupState=useRef(''),apple=useRef<AppleAPI|null>(null),nativePending=useRef<Provider|null>(null),success=useRef(onSuccess);success.current=onSuccess;
 const setWorking=(value:Provider|null)=>{busyRef.current=value;setBusy(value);};
 useEffect(()=>{
  if(!available)return;
  let active=true;const ws=socket??new WebSocket(gameSocketURL());connection.current=ws;
  configs.current={};setReady({});setError('');setWorking(null);setReturnAccount(null);
  const fail=(message:string)=>{if(active){setError(message);setWorking(null);popup.current?.close();popup.current=null;nativePending.current=null;}};
  const send=(message:Record<string,unknown>)=>{if(ws.readyState===1)ws.send(JSON.stringify(message));};
  const prepare=()=>{for(const provider of ['google','apple'] as const)if(!linked.includes(provider))send({type:provider==='google'?'googleBegin':'appleBegin',platform:nativePlatform()??'web'});};
  const hello=()=>send({type:'hello',readableGuest:true,token:sessionStorage.getItem('logos-token')||localStorage.getItem('logos-guest-token'),authToken:localStorage.getItem('logos-account-token')});
  const submit=(provider:Provider,result:{credential:string;name?:string})=>send({type:provider==='google'?'googleLogin':'appleCredential',...result,...(provider==='google'?{intent:own?'login':'link'}:{})});
  const receive=async(event:MessageEvent)=>{
   const msg=JSON.parse(event.data);
   if(msg.type==='session'){
    if(own){sessionStorage.setItem('logos-token',msg.token);sessionStorage.setItem('logos-name',msg.name);}
    if(!configs.current.google&&!configs.current.apple)prepare();
   }
   if(msg.type==='googleChallenge'||msg.type==='appleChallenge'){
    const provider:Provider=msg.type==='googleChallenge'?'google':'apple';configs.current[provider]=msg;
    if(nativePending.current===provider){nativePending.current=null;try{const result=await nativeCredential(provider,msg);if(active)submit(provider,result);}catch(e){fail(e instanceof Error?e.message:'로그인이 취소됐어요.');}return;}
    if(provider==='google'){
     setReady(old=>({...old,google:true}));
     if(popup.current&&!popup.current.closed&&busyRef.current==='google'){
      popupState.current=msg.nonce;
      const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search=new URLSearchParams({client_id:msg.clientId,redirect_uri:new URL('/auth/google.html',location.origin).href,response_type:'id_token',response_mode:'fragment',scope:'openid profile',nonce:msg.nonce,state:msg.nonce,prompt:'select_account'}).toString();
      popup.current.location.href=url.href;
     }
    }else if(nativePlatform())setReady(old=>({...old,apple:true}));
    else try{const sdk=await loadApple();if(!active)return;apple.current=sdk;sdk.auth.init({clientId:msg.clientId,scope:'name email',redirectURI:msg.redirectUri,nonce:msg.nonce,state:msg.nonce,usePopup:true});setReady(old=>({...old,apple:true}));}catch(e){fail(e instanceof Error?e.message:'Apple 로그인 오류');}
   }
   if(msg.type==='googleReturnConfirmation'){setWorking(null);setReturnAccount(msg.username);}
   if(msg.type==='auth'&&msg.authToken){localStorage.setItem('logos-account-token',msg.authToken);sessionStorage.setItem('logos-entry','guest');success.current();}
   if(msg.type==='error')fail(msg.message);
  };
  const returned=(event:MessageEvent)=>{
   if(event.origin!==location.origin||event.source!==popup.current||event.data?.type!=='logos-google-auth'||event.data.state!==popupState.current)return;
   popup.current?.close();popup.current=null;popupState.current='';
   if(typeof event.data.credential!=='string'||event.data.credential.length>8192)return fail('Google 로그인이 취소되었거나 실패했어요.');
   submit('google',{credential:event.data.credential});
  };
  const closed=()=>fail('서버에 다시 연결한 뒤 로그인해 주세요.');
  ws.addEventListener('message',receive);ws.addEventListener('close',closed);window.addEventListener('message',returned);
  if(own)ws.addEventListener('open',hello);else if(ws.readyState===1)prepare();
  const refresh=setInterval(()=>{if(!busyRef.current&&ws.readyState===1)prepare();},180000);
  const cancelled=setInterval(()=>{if(popup.current?.closed){popup.current=null;fail('Google 로그인을 취소했어요.');}},700);
  return()=>{active=false;clearInterval(refresh);clearInterval(cancelled);popup.current?.close();popup.current=null;ws.removeEventListener('message',receive);ws.removeEventListener('close',closed);ws.removeEventListener('open',hello);window.removeEventListener('message',returned);if(own)ws.close();};
 },[socket,available,linked.join(',')]);
 const start=(provider:Provider)=>{
  const ws=connection.current,config=configs.current[provider];if(!ws||ws.readyState!==1||!config)return;setError('');setWorking(provider);
  if(nativePlatform()){nativePending.current=provider;ws.send(JSON.stringify({type:provider==='google'?'googleBegin':'appleBegin',platform:nativePlatform()}));return;}
  if(provider==='google'){
   const child=window.open('/auth/starting.html','logos-google-login','popup,width=520,height=680');
   if(!child){setWorking(null);setError('브라우저에서 로그인 팝업을 허용해 주세요.');return;}
   popup.current=child;popupState.current='';ws.send(JSON.stringify({type:'googleBegin',platform:'web'}));return;
  }
  void apple.current!.auth.signIn().then(response=>{
   if(response.authorization.state!==config.nonce)throw Error('Apple 인증 요청이 일치하지 않아요.');
   if(ws===connection.current&&ws.readyState===1)ws.send(JSON.stringify({type:'appleCredential',credential:response.authorization.id_token,name:[response.user?.name?.firstName,response.user?.name?.lastName].filter(Boolean).join(' ')}));
  }).catch(()=>{setWorking(null);setError('Apple 로그인이 취소되었거나 실패했어요. 다시 시도해 주세요.');});
 };
 return <><div className="account-login-buttons" aria-label={own?'계정 로그인':'계정 연결'}>{(['google','apple'] as const).map(provider=>{
  const label=provider==='google'?'Google':'Apple',connected=linked.includes(provider);
  return <button key={provider} type="button" className={`provider-login ${provider}-login`} disabled={connected||!available||!ready[provider]||busy!==null} onClick={()=>start(provider)} aria-label={own?`${label}로 로그인`:`${label} 계정 ${connected?'연동됨.':'연결하기'}`}><span className={`provider-icon ${provider}`} aria-hidden="true"><img src={`/icons/auth/${provider}.png`} alt=""/></span><span>{connected?'연동됨.':busy===provider?'로그인 확인 중…':own?`${label}로 로그인`:`${label} 계정 연결하기`}</span></button>;
 })}</div>{error&&<p className="provider-error" role="alert">{error}</p>}{returnAccount!==null&&<div className="account-backdrop"><section className="account-dialog google-return-confirmation" role="dialog" aria-modal="true" aria-label="기존 계정 복귀"><h2>원래 계정으로 돌아가시겠습니까?</h2><p>{returnAccount} 계정의 기존 기록과 보유 아이템을 불러옵니다. 현재 게스트 기록과 합쳐지지 않습니다.</p><button disabled={busy!==null} onClick={()=>{setWorking('google');connection.current?.send(JSON.stringify({type:'googleReturnConfirm',accept:true}));}}>원래 계정으로 돌아가기</button><button disabled={busy!==null} onClick={()=>{connection.current?.send(JSON.stringify({type:'googleReturnConfirm',accept:false}));setReturnAccount(null);}}>게스트로 계속하기</button></section></div>}</>;
}
