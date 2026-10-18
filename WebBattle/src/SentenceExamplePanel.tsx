import {useEffect,useRef} from 'react';
import {EXAMPLE_ROLE_LABELS,type SentenceExample} from '../shared/sentence-examples.js';
import {CATALOG} from '../shared/rules.js';
import './sentence-examples.css';
import {playSentenceExample} from './sentenceVoice.js';
export function SentenceExamplePanel({example,onClose,voice=true}:{example:SentenceExample;onClose:()=>void;voice?:boolean}){
 const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{
  let alive=true;
  const enabled=voice;
  let timer=setTimeout(()=>closeRef.current(),enabled?12000:3000);
  const playback=enabled?playSentenceExample(example.english,()=>{if(alive){clearTimeout(timer);timer=setTimeout(()=>closeRef.current(),32000)}},()=>{if(alive){clearTimeout(timer);timer=setTimeout(()=>closeRef.current(),2000)}},state=>{if(alive&&!['loading','playing','ended'].includes(state.code)){clearTimeout(timer);timer=setTimeout(()=>closeRef.current(),2500)}}):null;
  void playback?.done.catch(()=>{if(alive){clearTimeout(timer);timer=setTimeout(()=>closeRef.current(),2500)}}); // Failure never blocks input or retains this panel.
  const esc=(event:KeyboardEvent)=>{if(event.key==='Escape')closeRef.current()};document.addEventListener('keydown',esc);
  return()=>{alive=false;clearTimeout(timer);playback?.stop();document.removeEventListener('keydown',esc)};
 },[example.id,example.english,voice]);
 return <section className="sentence-example-panel example-auto" role="region" aria-label="카드에 맞춘 예문" data-example-id={example.id}>
  <div className="example-english" aria-label={example.english}>{example.parts.map((part,i)=><span className={'example-part role-'+part.role} key={i} data-example-card-id={part.cardId}><small>{part.kind?CATALOG[part.kind].name:EXAMPLE_ROLE_LABELS[part.role]}</small><b>{part.text}{i===example.parts.length-1?example.english.slice(-1):''}</b></span>)}</div>
  <p className="example-korean">{example.korean}</p>

 </section>;
}
