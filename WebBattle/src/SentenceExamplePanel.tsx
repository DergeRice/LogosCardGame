import {useEffect,useRef,useState} from 'react';
import {EXAMPLE_ROLE_LABELS,type SentenceExample} from '../shared/sentence-examples.js';
import {CATALOG} from '../shared/rules.js';
import {playSentenceExample} from './sentenceVoice.js';
import {primeSpeech} from './speech.js';
import './sentence-examples.css';
export function SentenceExamplePanel({example,onClose}:{example:SentenceExample;onClose:()=>void}){
 const closeRef=useRef(onClose);closeRef.current=onClose;
 const [retry,setRetry]=useState(0),[blocked,setBlocked]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>{
  let alive=true,timer:ReturnType<typeof setTimeout>|undefined;setBlocked(false);setStatus('');
  const playback=playSentenceExample(example.english,()=>{if(alive)setStatus('')},()=>{if(alive)timer=setTimeout(()=>closeRef.current(),2000)},text=>{if(alive)setStatus(text)});
  void playback.done.catch(error=>{if(alive&&error?.name!=='AbortError'){setStatus('');setBlocked(true)}});
  const esc=(event:KeyboardEvent)=>{if(event.key==='Escape')closeRef.current()};document.addEventListener('keydown',esc);
  return()=>{alive=false;clearTimeout(timer);playback.stop();document.removeEventListener('keydown',esc)};
 },[example.id,retry]);
 return <section className="sentence-example-panel example-auto" role="region" aria-label="카드에 맞춘 예문" data-example-id={example.id}>
  <div className="example-english" aria-label={example.english}>{example.parts.map((part,i)=><span className={'example-part role-'+part.role} key={i} data-example-card-id={part.cardId}><small>{part.kind?CATALOG[part.kind].name:EXAMPLE_ROLE_LABELS[part.role]}</small><b>{part.text}{i===example.parts.length-1?example.english.slice(-1):''}</b></span>)}</div>
  <p className="example-korean">{example.korean}</p>
  {status&&<p className="example-voice-status" role="status">{status}</p>}
  {blocked&&<button className="example-audio-retry" onClick={()=>{primeSpeech();setRetry(x=>x+1)}}>소리 켜고 듣기</button>}
 </section>;
}
