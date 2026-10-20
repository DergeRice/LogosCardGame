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
export function GoogleLogin({socket,onClose,onSuccess}:{socket?:WebSocket|null;onClose:()=>void;onSuccess:()=>void}){
 const target=useRef<HTMLDivElement>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const success=useRef(onSuccess);success.current=onSuccess;
 useEffect(()=>{
  let active=true,started=false;const own=!socket;
  const ws=socket??new WebSocket(import.meta.env.VITE_WS_URL||`${location.protocol==='https:'?'wss':'ws'}://${location.host}/socket`);
  const fail=(message:string)=>{if(active){setError(message);setBusy(false);}};
  const begin=()=>{if(started||!active)return;started=true;ws.send(JSON.stringify({type:'googleBegin'}));};
  const hello=()=>ws.send(JSON.stringify({type:'hello',readableGuest:true,name:localStorage.getItem('logos-guest-name')||'Google 로그인',token:sessionStorage.getItem('logos-token')||localStorage.getItem('logos-guest-token'),authToken:localStorage.getItem('logos-account-token')}));
  const receive=async(event:MessageEvent)=>{
   const msg=JSON.parse(event.data);
   if(msg.type==='session'&&own){sessionStorage.setItem('logos-token',msg.token);sessionStorage.setItem('logos-name',msg.name);begin();}
   if(msg.type==='googleChallenge'){
    try{const google=await loadGoogle();if(!active||!target.current)return;
     google.accounts.id.initialize({client_id:msg.clientId,nonce:msg.nonce,auto_select:false,callback:({credential}:{credential:string})=>{if(!active||ws.readyState!==1)return;setBusy(true);ws.send(JSON.stringify({type:'googleLogin',credential}));}});
     google.accounts.id.renderButton(target.current,{theme:'outline',size:'large',text:'continue_with',width:280,locale:'ko'});
    }catch(e){fail(e instanceof Error?e.message:'Google 로그인 오류');}
   }
   if(msg.type==='auth'&&msg.authToken){localStorage.setItem('logos-account-token',msg.authToken);sessionStorage.setItem('logos-entry','guest');success.current();}
   if(msg.type==='error')fail(msg.message);
  };
  const closed=()=>fail('서버 연결이 끊겼어요. 닫고 다시 시도해 주세요.');
  ws.addEventListener('message',receive);ws.addEventListener('close',closed);ws.addEventListener('error',closed);
  if(own)ws.addEventListener('open',hello);else if(ws.readyState===1)begin();else fail('서버 연결 후 다시 시도해 주세요.');
  return()=>{active=false;ws.removeEventListener('message',receive);ws.removeEventListener('close',closed);ws.removeEventListener('error',closed);ws.removeEventListener('open',hello);if(own)ws.close();};
 },[socket]);
 return <div className="account-backdrop"><section className="account-dialog" role="dialog" aria-modal="true" aria-label="Google 계정 연결"><h2>Google 계정 연결</h2><p>처음 연결하면 현재 진행 기록과 보유 아이템이 저장돼요. 이미 연결한 Google 계정은 그 계정의 기록을 불러와요.</p><div ref={target}/>{busy&&<p role="status">계정을 확인하고 있어요…</p>}{error&&<p role="alert">{error}</p>}<button onClick={onClose}>닫기</button></section></div>;
}
