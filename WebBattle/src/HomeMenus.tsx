import {useEffect,useState} from 'react';
import {Avatar} from './MatchPresentation.js';
const menus=['친구','계정','상점','치장','랜덤박스'] as const;
type Menu=typeof menus[number];
export function HomeMenus({account,onLogin,onRegister,onLogout}:{account:string|null;onLogin:()=>void;onRegister:()=>void;onLogout:()=>void}){
 const [open,setOpen]=useState<Menu|null>(null);
 useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(null)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[open]);
 const action=(fn:()=>void)=>{setOpen(null);fn()};
 return <><nav className="home-feature-menu" aria-label="홈 메뉴">{menus.map(menu=><button key={menu} onClick={()=>setOpen(menu)}>{menu}</button>)}</nav>{open&&<div className="feature-menu-backdrop" onClick={()=>setOpen(null)}><section className="feature-menu-dialog" role="dialog" aria-modal="true" aria-label={open} onClick={e=>e.stopPropagation()}><header><h2>{open}</h2><button autoFocus aria-label={`${open} 닫기`} onClick={()=>setOpen(null)}>×</button></header>{open==='계정'?<div className="feature-menu-body"><p>{account?`${account} 계정으로 플레이 중입니다.`:'계정을 연결하면 다른 기기에서도 기록을 이어갈 수 있어요.'}</p>{account?<button onClick={()=>action(onLogout)}>로그아웃</button>:<><button onClick={()=>action(onLogin)}>계정 로그인</button><button onClick={()=>action(onRegister)}>계정 만들기</button></>}</div>:<div className="feature-menu-body"><span className="feature-coming">준비 중</span>{open==='친구'?<><p>친구와 함께 플레이할 공간을 준비하고 있어요.</p><div className="feature-placeholders"><span>친구 목록</span><span>친구 초대하기</span><span>초대받은 대전</span></div></>:<><p>{open==='랜덤박스'?'감정표현·프로필·치장·칭호를 만날 수 있는 랜덤박스를 준비하고 있어요.':open==='치장'?'획득한 아이템으로 내 모습을 꾸밀 공간이에요.':'게임에서 모은 코인으로 이용할 상점을 준비하고 있어요.'}</p><div className="feature-categories"><span><b>☺</b>감정표현</span><span><Avatar kind="pronoun"/>프로필</span><span><b>✧</b>치장</span><span><b>✦</b>칭호</span></div></>}</div>}</section></div>}</>;
}
