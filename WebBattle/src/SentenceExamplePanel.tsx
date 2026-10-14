import {useEffect,useRef,useState} from 'react';
import {EXAMPLE_ROLE_LABELS,type SentenceExample} from '../shared/sentence-examples.js';
import {CATALOG} from '../shared/rules.js';
import {playRecordedExample} from './exampleAudio.js';
import {playChirpExample} from './chirpAudio.js';
import {primeSpeech} from './speech.js';
import './sentence-examples.css';
export function SentenceExamplePanel({example,onClose}:{example:SentenceExample;onClose:()=>void}){
 const closeRef=useRef(onClose);closeRef.current=onClose;
 const utteranceRef=useRef<SpeechSynthesisUtterance|null>(null);
 const [retry,setRetry]=useState(0),[blocked,setBlocked]=useState(false);
 useEffect(()=>{
  let alive=true,finished=false,started=false,fallback=false;let timer:ReturnType<typeof setTimeout>,recording:ReturnType<typeof playRecordedExample>|undefined,chirp:{stop:()=>void}|null=null;const controller=new AbortController();
  setBlocked(false);
  const delayClose=()=>{if(!alive||finished)return;finished=true;clearTimeout(timer);timer=setTimeout(()=>{if(alive)closeRef.current()},2800)};
  const began=()=>{if(!alive||finished)return;started=true;setBlocked(false);clearTimeout(timer);timer=setTimeout(()=>{recording?.stop();delayClose()},45000)};
  const recorded=()=>{
   if(!alive||finished||fallback)return;fallback=true;clearTimeout(timer);
   const synth=window.speechSynthesis;if(synth){synth.cancel();utteranceRef.current=null;}
   recording=playRecordedExample(example.english,began,delayClose);
   void recording.done.catch(()=>{if(!alive||finished)return;clearTimeout(timer);setBlocked(true);});
  };
  const supported=typeof window.speechSynthesis!=='undefined'&&typeof window.SpeechSynthesisUtterance!=='undefined';
  const mobile=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;
  const startExisting=()=>{if(!alive||finished)return;if(mobile||!supported||retry>0){recorded();return;}
   const synth=window.speechSynthesis;synth.cancel();const utterance=new SpeechSynthesisUtterance(example.english);utteranceRef.current=utterance;utterance.lang='en-US';utterance.rate=.88;
   const voices=synth.getVoices().filter(v=>/^en[-_]/i.test(v.lang));utterance.voice=voices.find(v=>v.lang==='en-US'&&v.localService)??voices.find(v=>v.lang==='en-US')??voices[0]??null;
   utterance.onstart=()=>{if(!fallback)began()};utterance.onend=()=>{if(!fallback)delayClose()};utterance.onerror=()=>{if(!fallback)recorded()};
   timer=setTimeout(()=>{if(!started)recorded()},2000);
   try{synth.speak(utterance);synth.resume()}catch{recorded()}
  };
  void playChirpExample(example.english,began,delayClose,controller.signal).then(playing=>{if(!alive){playing?.stop();return;}if(playing)chirp=playing;else startExisting()}).catch(startExisting);
  const esc=(e:KeyboardEvent)=>{if(e.key==='Escape'){clearTimeout(timer);closeRef.current()}};document.addEventListener('keydown',esc);
  return()=>{alive=false;controller.abort();clearTimeout(timer);chirp?.stop();recording?.stop();document.removeEventListener('keydown',esc);if(supported)window.speechSynthesis.cancel();utteranceRef.current=null};
 },[example.id,retry]);
 return <section className="sentence-example-panel example-auto" role="region" aria-label="카드에 맞춘 예문" data-example-id={example.id}>
  <div className="example-english" aria-label={example.english}>{example.parts.map((part,i)=><span className={'example-part role-'+part.role} key={i} data-example-card-id={part.cardId}><small>{part.kind?CATALOG[part.kind].name:EXAMPLE_ROLE_LABELS[part.role]}</small><b>{part.text}{i===example.parts.length-1?example.english.slice(-1):''}</b></span>)}</div>
  <p className="example-korean">{example.korean}</p>
  {blocked&&<button className="example-audio-retry" onClick={()=>{primeSpeech();setRetry(x=>x+1)}}>소리 켜고 듣기</button>}
 </section>;
}
