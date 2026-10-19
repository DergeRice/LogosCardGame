import {useEffect,useRef} from 'react';
import {EXAMPLE_ROLE_LABELS,type SentenceExample} from '../shared/sentence-examples.js';
import {CATALOG} from '../shared/rules.js';
import './sentence-examples.css';
import {playSentenceExample} from './sentenceVoice.js';
export function SentenceExamplePanel({example,onClose,voice=true}:{example:SentenceExample;onClose:()=>void;voice?:boolean}){
 const closeRef=useRef(onClose);closeRef.current=onClose;
 const dismissed=useRef(false);
 const dismiss=()=>{dismissed.current=true;closeRef.current()};
 useEffect(()=>{
  dismissed.current=false;
  const timer=setTimeout(dismiss,2000);
  const playback=voice?playSentenceExample(example.english,()=>{},()=>{}):null;
  void playback?.done.catch(()=>{});
  const esc=(event:KeyboardEvent)=>{if(event.key==='Escape')dismiss()};document.addEventListener('keydown',esc);
  return()=>{clearTimeout(timer);if(!dismissed.current)playback?.stop();document.removeEventListener('keydown',esc)};
 },[example.id,example.english,voice]);
 return <section className="sentence-example-panel example-auto" role="region" aria-label="카드에 맞춘 예문" aria-description="누르면 패널만 닫히고 음성은 계속 재생됩니다" tabIndex={0} onClick={dismiss} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();dismiss()}}} data-example-id={example.id}>
  <div className="example-english" aria-label={example.english}>{example.parts.map((part,i)=><span className={'example-part role-'+part.role} key={i} data-example-card-id={part.cardId}><small>{part.kind?CATALOG[part.kind].name:EXAMPLE_ROLE_LABELS[part.role]}</small><b>{part.text}{i===example.parts.length-1?example.english.slice(-1):''}</b></span>)}</div>
  <p className="example-korean">{example.korean}</p>

 </section>;
}
