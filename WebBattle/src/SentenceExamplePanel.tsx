import {useEffect,useRef,useState} from 'react';
import {EXAMPLE_ROLE_LABELS,FORM_STRUCTURES,type SentenceExample} from '../shared/sentence-examples.js';
import './sentence-examples.css';

export function SentenceExamplePanel({example,autoRead,onClose}:{example:SentenceExample;autoRead:boolean;onClose:()=>void}){
 const [speaking,setSpeaking]=useState(false),[speechError,setSpeechError]=useState('');
 const supported=typeof window.speechSynthesis!=='undefined'&&typeof window.SpeechSynthesisUtterance!=='undefined';
 const closeRef=useRef(onClose);closeRef.current=onClose;
 const speechRef=useRef<SpeechSynthesisUtterance|null>(null),alive=useRef(true),hideTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 function keepOpen(){clearTimeout(hideTimer.current);hideTimer.current=setTimeout(()=>closeRef.current(),12000);}
 function speak(){
  keepOpen();if(!supported){setSpeechError('이 브라우저에서는 음성 읽기를 사용할 수 없어요.');return;}
  const synth=window.speechSynthesis;synth.cancel();const utterance=new SpeechSynthesisUtterance(example.english);speechRef.current=utterance;utterance.lang='en-US';utterance.rate=.88;
  const voices=synth.getVoices(),english=voices.filter(v=>/^en[-_]/i.test(v.lang));utterance.voice=english.find(v=>v.lang==='en-US'&&v.localService)??english.find(v=>v.lang==='en-US')??english[0]??null;
  const current=()=>alive.current&&speechRef.current===utterance;
  utterance.onstart=()=>{if(current()){setSpeaking(true);setSpeechError('');}};
  utterance.onend=()=>{if(current())setSpeaking(false);};
  utterance.onerror=e=>{if(current()){setSpeaking(false);if(e.error!=='canceled'&&e.error!=='interrupted')setSpeechError('🔊 버튼을 눌러 다시 들어보세요.');}};
  try{synth.speak(utterance);}catch{setSpeechError('🔊 버튼을 눌러 다시 들어보세요.');}
 }
 useEffect(()=>{alive.current=true;keepOpen();if(autoRead)speak();const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')closeRef.current()};document.addEventListener('keydown',esc);return()=>{alive.current=false;clearTimeout(hideTimer.current);document.removeEventListener('keydown',esc);if(supported)window.speechSynthesis.cancel();};},[example.id]);
 useEffect(()=>{if(!autoRead&&supported){speechRef.current=null;window.speechSynthesis.cancel();setSpeaking(false);}},[autoRead]);
 return <section className="sentence-example-panel" role="region" aria-label="문장 형식 대표 예문" data-example-id={example.id}>
  <header><div><b>{example.imperative?'명령문':`${example.patternType}형식`}</b><small>{example.imperative?'주어가 생략된 명령문':FORM_STRUCTURES[example.patternType]}</small></div><button className="example-close" aria-label="예문 닫기" onClick={onClose}>×</button></header>
  <div className="example-english" aria-label={example.english}>{example.parts.map((part,i)=><span className={'example-part role-'+part.role} key={i}><small>{EXAMPLE_ROLE_LABELS[part.role]}</small><b>{part.text}{i===example.parts.length-1?(example.imperative?'!':'.'):''}</b></span>)}</div>
  <p className="example-korean">{example.korean}</p>
  <footer><small>형식을 설명하는 대표 예문 · 부사어는 형식을 바꾸지 않아요</small><div><button aria-label="예문 다시 듣기" disabled={!supported} onClick={speak}>{speaking?'🔊 읽는 중':'🔊 듣기'}</button><button className="example-continue" onClick={onClose}>계속 →</button></div></footer>
  {speechError&&<span className="example-speech-status" role="status">{speechError}</span>}
 </section>;
}
