import {useEffect,useRef,useState} from 'react';
import {EXAMPLE_ROLE_LABELS,type SentenceExample} from '../shared/sentence-examples.js';
import {CATALOG} from '../shared/rules.js';
import './sentence-examples.css';
import {playSentenceExample,type VoiceCode} from './sentenceVoice.js';
import {unlockGameAudio} from './exampleAudio.js';
const voiceLabels:Partial<Record<VoiceCode,string>>={loading:'음성 불러오는 중…',playing:'문장 읽는 중',ended:'다시 듣기',blocked:'눌러서 음성 켜기',missing:'이 문장 음원 없음 · 다시 확인',network:'음성 연결 실패 · 다시 듣기',decode:'음성 파일 오류 · 다시 듣기',unsupported:'음성 재생 미지원',timeout:'음성 지연 · 다시 듣기'};
export function SentenceExamplePanel({example,onClose,voice=true}:{example:SentenceExample;onClose:()=>void;voice?:boolean}){
 const closeRef=useRef(onClose);closeRef.current=onClose;
 const [attempt,setAttempt]=useState(0),[status,setStatus]=useState<VoiceCode>('loading');
 useEffect(()=>{
  let alive=true;
  const enabled=voice||attempt>0;
  let timer=setTimeout(()=>closeRef.current(),enabled?20000:3000);
  const playback=enabled?playSentenceExample(example.english,()=>{if(alive){clearTimeout(timer);timer=setTimeout(()=>closeRef.current(),35000)}},()=>{if(alive){clearTimeout(timer);timer=setTimeout(()=>closeRef.current(),2000)}},state=>{if(alive)setStatus(state.code)}):null;
  void playback?.done.catch(()=>{}); // Failure never blocks input or retains this panel.
  const esc=(event:KeyboardEvent)=>{if(event.key==='Escape')closeRef.current()};document.addEventListener('keydown',esc);
  return()=>{alive=false;clearTimeout(timer);playback?.stop();document.removeEventListener('keydown',esc)};
 },[example.id,voice,attempt]);
 return <section className="sentence-example-panel example-auto" role="region" aria-label="카드에 맞춘 예문" data-example-id={example.id}>
  <button className="example-dismiss" aria-label="예문 닫기" onClick={onClose}>×</button>
  <div className="example-english" aria-label={example.english}>{example.parts.map((part,i)=><span className={'example-part role-'+part.role} key={i} data-example-card-id={part.cardId}><small>{part.kind?CATALOG[part.kind].name:EXAMPLE_ROLE_LABELS[part.role]}</small><b>{part.text}{i===example.parts.length-1?example.english.slice(-1):''}</b></span>)}</div>
  <p className="example-korean">{example.korean}</p>
  <button className="example-voice" data-voice-status={!voice&&!attempt?'off':status} disabled={(voice||attempt>0)&&(status==='playing'||status==='loading')} onClick={()=>{unlockGameAudio();setAttempt(n=>n+1)}}>{!voice&&!attempt?'문장 듣기':voiceLabels[status]??'다시 듣기'}</button>
 </section>;
}
