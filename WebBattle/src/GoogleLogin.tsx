import {nativeCredential,nativePlatform,gameSocketURL} from './nativeAuth.js';
import {useEffect,useRef,useState} from 'react';

type GoogleAPI={accounts:{id:{initialize:(options:Record<string,unknown>)=>void;renderButton:(element:HTMLElement,options:Record<string,unknown>)=>void}}};
let sdk:Promise<GoogleAPI>|undefined;
function loadGoogle(){
 return sdk??=new Promise<GoogleAPI>((resolve,reject)=>{
  const current=()=> (window as Window&{google?:GoogleAPI}).google;
  if(current())return resolve(current()!);
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
  const timer=setTimeout(()=>{sdk=undefined;script.remove();reject(Error('Google 로그인 화면을 불러오지 못했어요. 다시 시도해 주세요.'));},15000);
  script.onload=()=>{clearTimeout(timer);if(current())resolve(current()!);else{sdk=undefined;script.remove();reject(Error('Google 로그인 초기화에 실패했어요.'));}};
  script.onerror=()=>{clearTimeout(timer);sdk=undefined;script.remove();reject(Error('Google 로그인에 연결하지 못했어요.'));};document.head.append(script);
 });
}
type AppleAPI={auth:{init:(config:Record<string,unknown>)=>void;signIn:()=>Promise<{authorization:{id_token:string};user?:{name?:{firstName?:string;lastName?:string}}}>}};
let appleSdk:Promise<AppleAPI>|undefined;
function loadApple(){return appleSdk??=new Promise<AppleAPI>((resolve,reject)=>{
 const current=()=> (window as Window&{AppleID?:AppleAPI}).AppleID;if(current())return resolve(current()!);
 const script=document.createElement('script');script.src='https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/ko_KR/appleid.auth.js';script.async=true;
 const timer=setTimeout(()=>{appleSdk=undefined;script.remove();reject(Error('Apple 로그인 화면을 불러오지 못했어요.'));},15000);
 script.onload=()=>{clearTimeout(timer);if(current())resolve(current()!);else{appleSdk=undefined;reject(Error('Apple 로그인 초기화 오류'));}};
 script.onerror=()=>{clearTimeout(timer);appleSdk=undefined;script.remove();reject(Error('Apple 로그인 연결 오류'));};document.head.append(script);
});}
export function GoogleLogin({socket,onClose,onSuccess,provider='google'}:{provider?:'google'|'apple';socket?:WebSocket|null;onClose:()=>void;onSuccess:()=>void}){
 const label=provider==='google'?'Google':'Apple';
 const [returnAccount,setReturnAccount]=useState<string|null>(null);
 const connection=useRef<WebSocket|null>(null);
 const [start,setStart]=useState<null|(()=>Promise<void>)>(null);
 const target=useRef<HTMLDivElement>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const success=useRef(onSuccess);success.current=onSuccess;
 useEffect(()=>{
  let active=true,started=false;const own=!socket;
  setError('');setBusy(false);setStart(null);setReturnAccount(null);target.current?.replaceChildren();
  const ws=socket??new WebSocket(gameSocketURL());connection.current=ws;
  const fail=(message:string)=>{if(active){setError(message);setBusy(false);}};
  const begin=()=>{if(started||!active)return;started=true;ws.send(JSON.stringify({type:provider==='google'?'googleBegin':'appleBegin',platform:nativePlatform()??'web'}));};
  const hello=()=>ws.send(JSON.stringify({type:'hello',readableGuest:true,name:localStorage.getItem('logos-guest-name')||'Google 로그인',token:sessionStorage.getItem('logos-token')||localStorage.getItem('logos-guest-token'),authToken:localStorage.getItem('logos-account-token')}));
  const receive=async(event:MessageEvent)=>{
   const msg=JSON.parse(event.data);
   if(msg.type==='session'){if(own){sessionStorage.setItem('logos-token',msg.token);sessionStorage.setItem('logos-name',msg.name);}begin();}
   if(msg.type===(provider==='google'?'googleChallenge':'appleChallenge')){
    if(nativePlatform()){
     setStart(()=>async()=>{try{setBusy(true);const result=await nativeCredential(provider,msg);if(active&&ws.readyState===1)ws.send(JSON.stringify({type:provider==='google'?'googleLogin':'appleCredential',...result,...(provider==='google'?{intent:own?'login':'link'}:{})}));}catch(e){fail(e instanceof Error?e.message:'로그인을 취소했어요.');}});return;
    }
    if(provider==='apple'){
     try{const apple=await loadApple();if(!active)return;apple.auth.init({clientId:msg.clientId,scope:'name email',redirectURI:msg.redirectUri,nonce:msg.nonce,state:msg.nonce,usePopup:true});
      setStart(()=>async()=>{try{const response=await apple.auth.signIn();if(active&&ws.readyState===1){setBusy(true);ws.send(JSON.stringify({type:'appleCredential',credential:response.authorization.id_token,name:[response.user?.name?.firstName,response.user?.name?.lastName].filter(Boolean).join(' ')}));}}catch{fail('Apple 로그인이 취소되었거나 실패했어요. 닫고 다시 시도해 주세요.');}});
     }catch(e){fail(e instanceof Error?e.message:'Apple 로그인 오류');}return;
    }
    try{const google=await loadGoogle();if(!active||!target.current)return;
     google.accounts.id.initialize({client_id:msg.clientId,nonce:msg.nonce,auto_select:false,callback:({credential}:{credential:string})=>{if(!active||ws.readyState!==1)return;setBusy(true);ws.send(JSON.stringify({type:'googleLogin',credential,intent:own?'login':'link'}));}});
     google.accounts.id.renderButton(target.current,{theme:'outline',size:'large',text:'continue_with',width:280,locale:'ko'});
    }catch(e){fail(e instanceof Error?e.message:'Google 로그인 오류');}
   }
   if(msg.type==='googleReturnConfirmation'){setBusy(false);setReturnAccount(msg.username);}
   if(msg.type==='auth'&&msg.authToken){localStorage.setItem('logos-account-token',msg.authToken);sessionStorage.setItem('logos-entry','guest');success.current();}
   if(msg.type==='error')fail(msg.message);
  };
  const closed=()=>fail('서버 연결이 끊겼어요. 닫고 다시 시도해 주세요.');
  ws.addEventListener('message',receive);ws.addEventListener('close',closed);ws.addEventListener('error',closed);
  if(own)ws.addEventListener('open',hello);else if(ws.readyState===1)begin();else if(ws.readyState!==0)fail('서버 연결 후 다시 시도해 주세요.');
  return()=>{active=false;ws.removeEventListener('message',receive);ws.removeEventListener('close',closed);ws.removeEventListener('error',closed);ws.removeEventListener('open',hello);if(own)ws.close();};
 },[socket,provider]);
 return <div className="account-backdrop"><section className="account-dialog" role="dialog" aria-modal="true" aria-label={`${label} 계정 연결`}><h2>{label} 계정 연결</h2><p>처음 연결하면 현재 진행 기록과 보유 아이템이 저장돼요. 이미 연결한 계정은 그 계정의 기록을 불러와요.</p><div ref={target} hidden={returnAccount!==null}/>{returnAccount!==null&&<div className="google-return-confirmation"><h3>원래 계정으로 돌아가시겠습니까?</h3><p>{returnAccount} 계정의 기존 기록과 보유 아이템을 불러옵니다. 현재 게스트 기록과 합쳐지지 않습니다.</p><button disabled={busy} onClick={()=>{setBusy(true);connection.current?.send(JSON.stringify({type:'googleReturnConfirm',accept:true}));}}>원래 계정으로 돌아가기</button><button disabled={busy} onClick={()=>{connection.current?.send(JSON.stringify({type:'googleReturnConfirm',accept:false}));onClose();}}>게스트로 계속하기</button></div>}{start&&returnAccount===null&&<button className={provider==='apple'?'apple-login':'google-login'} disabled={busy} onClick={()=>void start()}>{label} 계정으로 계속하기</button>}{busy&&<p role="status">계정을 확인하고 있어요…</p>}{error&&<p role="alert">{error}</p>}<button onClick={onClose}>닫기</button></section></div>;
}
