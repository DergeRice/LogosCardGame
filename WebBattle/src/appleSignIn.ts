type AppleAuthorization={authorization:{code:string;id_token?:string;state?:string};user?:{name?:{firstName?:string;lastName?:string}}};
type AppleGlobal={auth:{init(config:{clientId:string;scope:string;redirectURI:string;state:string;nonce:string;usePopup:boolean}):void;signIn():Promise<AppleAuthorization>}};
declare global {interface Window {AppleID?:AppleGlobal}}

const scriptUrl='https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
let scriptPromise:Promise<void>|undefined;
export function prepareAppleSignIn(){
 if(!import.meta.env.VITE_APPLE_CLIENT_ID||!import.meta.env.VITE_APPLE_REDIRECT_URI)return Promise.resolve();
 if(window.AppleID)return Promise.resolve();
 return scriptPromise??=new Promise<void>((resolve,reject)=>{
  const script=document.createElement('script');script.src=scriptUrl;script.async=true;
  script.onload=()=>resolve();script.onerror=()=>{scriptPromise=undefined;reject(Error('Apple 로그인 화면을 불러오지 못했어요.'));};document.head.append(script);
 });
}
const randomHex=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
export async function signInWithApple():Promise<{code:string;nonce:string;name?:string}>{
 const clientId=import.meta.env.VITE_APPLE_CLIENT_ID,redirectURI=import.meta.env.VITE_APPLE_REDIRECT_URI;
 if(!clientId||!redirectURI)throw Error('Apple 로그인 설정이 아직 완료되지 않았어요.');
 await prepareAppleSignIn();if(!window.AppleID)throw Error('Apple 로그인 화면을 불러오지 못했어요.');
 const nonce=randomHex(),state=randomHex();window.AppleID.auth.init({clientId,scope:'name email',redirectURI,state,nonce,usePopup:true});
 const result=await window.AppleID.auth.signIn();
 if(result.authorization?.state!==state||!result.authorization.code)throw Error('Apple 로그인 응답이 올바르지 않아요.');
 const name=[result.user?.name?.firstName,result.user?.name?.lastName].filter(Boolean).join(' ').trim().slice(0,16)||undefined;
 return {code:result.authorization.code,nonce,name};
}

export function openAppleGameSession(credential:{code:string;nonce:string;name?:string}):Promise<void>{
 return new Promise((resolve,reject)=>{
  const url=import.meta.env.VITE_WS_URL||`${location.protocol==='https:'?'wss':'ws'}://${location.host}/socket`;
  const ws=new WebSocket(url);let completed=false,requested=false;const timer=setTimeout(()=>finish(Error('Apple 로그인 연결 시간이 초과됐어요.')),15000);
  function finish(error?:Error){if(completed)return;completed=true;clearTimeout(timer);ws.close();if(error)reject(error);else resolve();}
  ws.onopen=()=>ws.send(JSON.stringify({type:'hello',name:sessionStorage.getItem('logos-name')||'Apple 사용자',token:sessionStorage.getItem('logos-token')||localStorage.getItem('logos-guest-token')}));
  ws.onmessage=event=>{const msg=JSON.parse(event.data);
   if(msg.type==='session'&&!requested){requested=true;sessionStorage.setItem('logos-token',msg.token);ws.send(JSON.stringify({type:'appleLogin',...credential}));}
   if(msg.type==='auth'&&msg.authToken){localStorage.setItem('logos-account-token',msg.authToken);sessionStorage.setItem('logos-name',msg.username);finish();}
   if(msg.type==='error')finish(Error(msg.message??'Apple 로그인에 실패했어요.'));
  };
  ws.onerror=()=>finish(Error('로그인 서버에 연결하지 못했어요.'));
  ws.onclose=()=>{if(!completed)finish(Error('Apple 로그인 연결이 끊겼어요.'));};
 });
}
