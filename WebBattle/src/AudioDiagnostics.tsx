import {useEffect,useRef,useState} from 'react';
import {playSentenceExample,type VoiceStatus} from './sentenceVoice.js';
import {unlockGameAudio} from './exampleAudio.js';
export function AudioDiagnostics(){
 const [state,setState]=useState<VoiceStatus|null>(null),[text,setText]=useState('A teacher can work.'),active=useRef<ReturnType<typeof playSentenceExample>|null>(null);
 useEffect(()=>()=>active.current?.stop(),[]);
 function play(){active.current?.stop();unlockGameAudio();active.current=playSentenceExample(text,()=>{},()=>{},setState);void active.current.done.catch(()=>{});}
 return <main className="audio-diagnostics"><a href="/">← 게임으로</a><h1>문장 음성 검사</h1><p>볼륨을 올리고 문장 재생을 눌러 주세요. 재생 완료는 파일과 브라우저의 처리 결과입니다. 스피커에서 실제 들리는지도 확인해 주세요.</p><label>검사할 문장<select value={text} onChange={e=>setText(e.target.value)}><option>I can enjoy music near a useful friend.</option><option>I work.</option><option>I can work near our friends.</option><option>I can work near our friend.</option><option>A teacher can work.</option><option>I can not be happy.</option></select></label><label>직접 검사할 문장<input aria-label="직접 검사할 문장" maxLength={500} value={text} onChange={e=>setText(e.target.value)}/></label><button onClick={play}>문장 재생</button><p role="status">{state?.code??'대기'}</p>{state&&<dl>{Object.entries(state).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl>}<p>{navigator.userAgent}</p><p>화면을 잠갔다 돌아온 뒤에도 다시 재생해 보세요.</p></main>;
}
