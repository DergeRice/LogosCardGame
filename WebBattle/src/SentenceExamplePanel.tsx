import {useEffect,useRef} from 'react';
import {EXAMPLE_ROLE_LABELS,type SentenceExample} from '../shared/sentence-examples.js';
import {CATALOG} from '../shared/rules.js';
import './sentence-examples.css';
export function SentenceExamplePanel({example,onClose}:{example:SentenceExample;onClose:()=>void}){
 const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{
  let alive=true,finished=false,started=false;let timer:ReturnType<typeof setTimeout>;
  const delayClose=(delay=2000)=>{if(!alive||finished)return;finished=true;clearTimeout(timer);timer=setTimeout(()=>{if(alive)closeRef.current()},delay)};
  const supported=typeof window.speechSynthesis!=='undefined'&&typeof window.SpeechSynthesisUtterance!=='undefined';
  timer=setTimeout(()=>delayClose(),Math.min(14000,Math.max(5000,example.english.length*70)));
  if(supported){
   const synth=window.speechSynthesis;synth.cancel();const utterance=new SpeechSynthesisUtterance(example.english);utterance.lang='en-US';utterance.rate=.88;
   const voices=synth.getVoices().filter(v=>/^en[-_]/i.test(v.lang));utterance.voice=voices.find(v=>v.lang==='en-US'&&v.localService)??voices.find(v=>v.lang==='en-US')??voices[0]??null;
   utterance.onstart=()=>{if(!alive||finished||started)return;started=true;clearTimeout(timer);timer=setTimeout(()=>delayClose(),30000)};
   utterance.onend=()=>delayClose();utterance.onerror=()=>delayClose();
   try{synth.speak(utterance)}catch{delayClose()}
  }
  const esc=(e:KeyboardEvent)=>{if(e.key==='Escape'){clearTimeout(timer);closeRef.current()}};document.addEventListener('keydown',esc);
  return()=>{alive=false;clearTimeout(timer);document.removeEventListener('keydown',esc);if(supported)window.speechSynthesis.cancel()};
 },[example.id]);
 return <section className="sentence-example-panel example-auto" role="region" aria-label="카드에 맞춘 예문" data-example-id={example.id}>
  <div className="example-english" aria-label={example.english}>{example.parts.map((part,i)=><span className={'example-part role-'+part.role} key={i} data-example-card-id={part.cardId}><small>{part.kind?CATALOG[part.kind].name:EXAMPLE_ROLE_LABELS[part.role]}</small><b>{part.text}{i===example.parts.length-1?example.english.slice(-1):''}</b></span>)}</div>
  <p className="example-korean">{example.korean}</p>
 </section>;
}
