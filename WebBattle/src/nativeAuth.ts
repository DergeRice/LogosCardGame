import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Browser} from '@capacitor/browser';
import {SocialLogin} from '@capgo/capacitor-social-login';

export const nativePlatform=()=>Capacitor.isNativePlatform()?Capacitor.getPlatform():null;
export async function nativeCredential(provider:'google'|'apple',config:{clientId:string;iosClientId?:string;redirectUri?:string;nonce:string}){
 if(!nativePlatform())throw Error('앱에서만 사용할 수 있는 로그인입니다.');
 if(provider==='google'){
  if(nativePlatform()==='ios'&&!config.iosClientId)throw Error('iOS Google 클라이언트 설정이 필요합니다.');
  await SocialLogin.initialize({google:{webClientId:config.clientId,iOSClientId:config.iosClientId,iOSServerClientId:config.clientId,mode:'online'}});
  const response=await SocialLogin.login({provider:'google',options:{nonce:config.nonce,scopes:['openid','profile','email']}});
  if(response.result.responseType!=='online'||!response.result.idToken)throw Error('Google 인증 토큰을 받지 못했어요.');
  return {credential:response.result.idToken};
 }
 if(nativePlatform()==='android')return androidApple(config);
 await SocialLogin.initialize({apple:{clientId:config.clientId,redirectUrl:nativePlatform()==='ios'?'':config.redirectUri,useBroadcastChannel:false,useProperTokenExchange:false}});
 const response=await SocialLogin.login({provider:'apple',options:{nonce:config.nonce,scopes:['name','email']}});
 if(!response.result.idToken)throw Error('Apple 인증 토큰을 받지 못했어요.');
 return {credential:response.result.idToken,name:[response.result.profile.givenName,response.result.profile.familyName].filter(Boolean).join(' ')};
}

export function gameSocketURL(){return import.meta.env.VITE_WS_URL||(nativePlatform()?'wss://logos-card-battle-server.jesus-and-children-ranking-worker.workers.dev/socket':`${location.protocol==='https:'?'wss':'ws'}://${location.host}/socket`);}

async function androidApple(config:{clientId:string;redirectUri?:string;nonce:string}):Promise<{credential:string}>{
 if(!config.redirectUri)throw Error('Apple 콜백 설정이 필요합니다.');
 const url=new URL('https://appleid.apple.com/auth/authorize');
 url.search=new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code id_token',response_mode:'form_post',state:config.nonce,nonce:config.nonce}).toString();
 return new Promise(async(resolve,reject)=>{
  let done=false,handle:Awaited<ReturnType<typeof App.addListener>>|undefined;
  const finish=(error?:Error,credential?:string)=>{if(done)return;done=true;clearTimeout(timer);void handle?.remove();void Browser.close().catch(()=>{});error?reject(error):resolve({credential:credential!});};
  const timer=setTimeout(()=>finish(Error('Apple 로그인 시간이 만료됐어요.')),5*60_000);
  try{
   handle=await App.addListener('appUrlOpen',({url:result})=>{
    let callback:URL;try{callback=new URL(result)}catch{return}
    if(callback.protocol!=='com.baragames.logoscardgame:'||callback.hostname!=='auth'||callback.pathname!=='/apple'||callback.searchParams.get('state')!==config.nonce)return;
    const credential=callback.searchParams.get('id_token');if(!credential||callback.searchParams.has('error'))finish(Error('Apple 로그인이 취소되었거나 실패했어요.'));else finish(undefined,credential);
   });
   await Browser.open({url:url.href});
  }catch(e){finish(e instanceof Error?e:Error('Apple 로그인 창을 열지 못했어요.'));}
 });
}
