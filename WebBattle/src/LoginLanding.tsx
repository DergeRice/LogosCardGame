import {AccountLoginButtons} from './GoogleLogin.js';
import {useCallback,useState} from 'react';
import {BUILD_VERSION} from './buildVersion.js';
import {PixiLanding} from './PixiLanding.js';

export function LoginLanding({onGuest,departing=false}:{onGuest:()=>void;departing?:boolean}){
 const [ready,setReady]=useState(false),show=useCallback(()=>setReady(true),[]);
 return <><main className={`login-landing ${ready?'landing-ready':''} ${departing?'landing-departing':''}`} aria-label="로고스 카드게임 로그인">
  <div className="landing-background" aria-hidden="true"/>
  <div className="landing-content">
   <PixiLanding onReady={show}/>
   <h1 className="landing-visually-hidden">로고스 카드게임</h1>
   <div className="landing-cta">
    <div className="entry-login-options" aria-label="로그인 방식">
     <AccountLoginButtons onSuccess={()=>{const url=new URL(location.href);url.searchParams.delete('intro');location.replace(url);}}/>
     <button className="guest-login" onClick={onGuest}>게스트로 로그인 <span aria-hidden="true">→</span></button>
    </div>
   </div>
  </div>
  <div className="landing-footer"><span className="build-version">{BUILD_VERSION}</span><nav className="landing-policy-links" aria-label="서비스 안내"><a href="/about.html" target="_blank" rel="noopener">서비스 소개</a><a href="/privacy.html" target="_blank" rel="noopener">개인정보처리방침</a></nav><small className="landing-copyright">@copyright all reserves in BaraGames 2026</small></div>
 </main></>;
}
