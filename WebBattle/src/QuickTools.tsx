import {useEffect,useState} from 'react';
import './quick-tools.css';
export function QuickTools(){
 const [open,setOpen]=useState(false);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='g'){e.preventDefault();e.stopPropagation();setOpen(o=>!o)}else if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',key,true);return()=>document.removeEventListener('keydown',key,true)},[]);
 if(!open)return null;
 return <div className="quick-tools-backdrop" onClick={()=>setOpen(false)}><section className="quick-tools-dialog" role="dialog" aria-modal="true" aria-label="게임 바로가기" onClick={e=>e.stopPropagation()}><header><div><small>CTRL + G</small><h2>게임 바로가기</h2></div><button autoFocus aria-label="바로가기 닫기" onClick={()=>setOpen(false)}>×</button></header><nav><a href="/admin" target="_blank" rel="noopener noreferrer">≡ <span>관리자 페이지<small>로그 · 카드 뷰어 · 문장 음성 검사 · 프로필 편집</small></span>↗</a></nav></section></div>;
}
