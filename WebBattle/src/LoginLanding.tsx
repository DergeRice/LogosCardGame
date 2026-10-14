import {useCallback,useState} from 'react';
import {BUILD_VERSION} from './buildVersion.js';
import {PixiLanding} from './PixiLanding.js';

export function LoginLanding({onGuest,departing=false}:{onGuest:()=>void;departing?:boolean}){
 const [ready,setReady]=useState(false),show=useCallback(()=>setReady(true),[]);
 return <main className={`login-landing ${ready?'landing-ready':''} ${departing?'landing-departing':''}`} aria-label="로고스 카드게임 로그인">
  <div className="landing-background" aria-hidden="true"/>
  <div className="landing-content">
   <PixiLanding onReady={show}/>
   <h1 className="landing-visually-hidden">로고스 카드게임</h1>
   <div className="landing-cta">
    <div className="entry-login-options" aria-label="로그인 방식">
     <button disabled className="google-login"><b className="google-mark" aria-hidden="true">G</b><span>Google로 로그인<small>업데이트 예정</small></span></button>
     <button className="apple-login" disabled aria-label="Apple ID로 로그인 · 업데이트 예정"><b aria-hidden="true"></b><span>Apple ID로 로그인<small>업데이트 예정</small></span></button>
     <button className="guest-login" onClick={onGuest}>게스트로 로그인 <span aria-hidden="true">→</span></button>
    </div>
   </div>
  </div>
  <div className="landing-footer"><span className="build-version">{BUILD_VERSION}</span><small className="landing-copyright">@copyright all reserves in BaraGames 2026</small></div>
 </main>;
}
