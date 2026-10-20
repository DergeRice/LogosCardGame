import {useEffect,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {CATALOG,type Card} from '../shared/rules.js';
import {CardLabel} from './CardLabel.js';
import './card-storage.css';
export function CardStorage({cards,disabled,onRetrieve,renderFace}:{cards:Card[];disabled:boolean;onRetrieve:(id:string)=>void;renderFace:(card:Card)=>ReactNode}){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState('');
 useEffect(()=>{if(!cards.some(c=>c.id===selected))setSelected('');},[cards,selected]);
 useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};addEventListener('keydown',close);return()=>removeEventListener('keydown',close)},[open]);
 return <><button className="card-storage-trigger" aria-label={`보관함 열기 ${cards.length}장`} aria-expanded={open} onClick={()=>setOpen(true)}><span aria-hidden="true">▣</span> 보관함 <b>{cards.length}</b></button>{open&&createPortal(<div className="special-backdrop card-storage-backdrop" onClick={()=>setOpen(false)}><section className="special-dialog card-storage-dialog" role="dialog" aria-modal="true" aria-label="카드 보관함" onClick={e=>e.stopPropagation()}><header><h2>보관함 <small>{cards.length}장</small></h2><button autoFocus aria-label="보관함 닫기" onClick={()=>setOpen(false)}>×</button></header><p>카드를 선택한 뒤 손패로 꺼내오세요.</p><div className="card-storage-grid">{cards.map(card=><button key={card.id} aria-label={`${CATALOG[card.kind].name} 보관 카드 선택`} aria-pressed={selected===card.id} onClick={()=>setSelected(card.id)}>{renderFace(card)}<CardLabel card={card}/></button>)}{!cards.length&&<p>보관 중인 카드가 없어요.<br/>카드를 아래 보관 영역으로 옮겨 보세요.</p>}</div><footer><button className="primary" disabled={disabled||!selected||!cards.some(c=>c.id===selected)} onClick={()=>onRetrieve(selected)}>꺼내오기</button></footer></section></div>,document.body)}</>;
}
