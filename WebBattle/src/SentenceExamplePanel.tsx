import {useEffect,useRef} from 'react';
import {EXAMPLE_ROLE_LABELS,type SentenceExample} from '../shared/sentence-examples.js';
import {CATALOG} from '../shared/rules.js';
import './sentence-examples.css';
export function SentenceExamplePanel({example,onClose}:{example:SentenceExample;onClose:()=>void}){
 const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{
  const timer=setTimeout(()=>closeRef.current(),3000);
  const esc=(event:KeyboardEvent)=>{if(event.key==='Escape')closeRef.current()};document.addEventListener('keydown',esc);
  return()=>{clearTimeout(timer);document.removeEventListener('keydown',esc)};
 },[example.id]);
 return <section className="sentence-example-panel example-auto" role="region" aria-label="카드에 맞춘 예문" data-example-id={example.id}>
  <button className="example-dismiss" aria-label="예문 닫기" onClick={onClose}>×</button>
  <div className="example-english" aria-label={example.english}>{example.parts.map((part,i)=><span className={'example-part role-'+part.role} key={i} data-example-card-id={part.cardId}><small>{part.kind?CATALOG[part.kind].name:EXAMPLE_ROLE_LABELS[part.role]}</small><b>{part.text}{i===example.parts.length-1?example.english.slice(-1):''}</b></span>)}</div>
  <p className="example-korean">{example.korean}</p>
 </section>;
}
