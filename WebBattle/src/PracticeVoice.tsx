import {useEffect,useRef,useState} from 'react';
import {playSentenceExample,type VoiceCode} from './sentenceVoice.js';
import {unlockGameAudio} from './exampleAudio.js';
export function PracticeVoice({text}:{text:string}){
 const [state,setState]=useState<VoiceCode>('loading'),player=useRef<ReturnType<typeof playSentenceExample>|null>(null);
 function play(){player.current?.stop();player.current=playSentenceExample(text,()=>{},()=>{},s=>setState(s.code));void player.current.done.catch(()=>{});}
 useEffect(()=>{play();return()=>player.current?.stop()},[text]);
 return <button className="example-voice" data-voice-status={state} onClick={()=>{unlockGameAudio();play()}} disabled={state==='loading'||state==='generating'||state==='playing'}>{state==='loading'?'음성 불러오는 중…':state==='generating'?'문장 음성 준비…':state==='playing'?'문장 읽는 중':state==='missing'?'이 문장 음원 없음 · 다시 확인':state==='ended'?'다시 듣기':'눌러서 다시 듣기'}</button>;
}
