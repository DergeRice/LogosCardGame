import {useCallback,useState} from 'react';
import {BUILD_VERSION} from './buildVersion.js';
import {PixiLanding} from './PixiLanding.js';

export function LoginLanding({onGuest,onApple,appleBusy=false,appleError='',departing=false}:{onGuest:()=>void;onApple:()=>void;appleBusy?:boolean;appleError?:string;departing?:boolean}){
 const [ready,setReady]=useState(false),show=useCallback(()=>setReady(true),[]);
 return <main className={`login-landing ${ready?'landing-ready':''} ${departing?'landing-departing':''}`} aria-label="로고스 카드게임 로그인">
  <div className="landing-background" aria-hidden="true"/>
  <div className="landing-content">
   <PixiLanding onReady={show}/>
   <h1 className="landing-visually-hidden">로고스 카드게임</h1>
   <div className="landing-cta">
    <div className="entry-login-options" aria-label="로그인 방식">
     <button disabled className="google-login"><b className="google-mark" aria-hidden="true">G</b><span>Google로 로그인<small>업데이트 예정</small></span></button>
     <button className="apple-login" disabled={appleBusy} onClick={onApple}><b aria-hidden="true"></b>{appleBusy?'Apple 로그인 중…':'Apple로 로그인'}</button>
     <button className="guest-login" disabled={appleBusy} onClick={onGuest}>게스트로 로그인 <span aria-hidden="true">→</span></button>
    </div>
    {appleError&&<small className="landing-login-error" role="alert">{appleError}</small>}
   </div>
  </div>
  <small className="landing-copyright">@copyright all reserves in BaraGames 2026</small>
  <span className="build-version">{BUILD_VERSION}</span>
 </main>;
}
