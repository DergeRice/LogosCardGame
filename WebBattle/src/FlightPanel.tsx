import {useEffect,useRef,useState} from 'react';
import type {FlightView} from '../shared/flightGame.js';
import {flightLaneAt,FLIGHT_ROUND_MS} from '../shared/flightGame.js';
import {advanceLocalFlight,startLocalFlight,type LocalFlightRun} from '../shared/flightLocal.js';
import {FLIGHT_VERBS} from '../server/flightWords.js';
import {Avatar} from './MatchPresentation.js';
import {FlightScene,preloadFlightArt} from './FlightScene.js';
import {playFlightAudioSequence,preloadFlightAudio,prepareFlightAudio,stopFlightAudio} from './flightAudio.js';
import {playFlightImpactSound} from './flightFeedback.js';
import {MiniGameTitleArt} from './MiniGameTitleArt.js';
import './flight-game.css';

type Props={data:FlightView|null;connected:boolean;myId:string;send:(type:string,extra?:Record<string,unknown>)=>boolean;onBack:()=>void};
export function FlightPanel({data,connected,myId,send,onBack}:Props){
 const [clock,setClock]=useState(Date.now()),[planeX,setPlaneX]=useState(.5),[ready,setReady]=useState(false);
 const [run,setRun]=useState<LocalFlightRun|null>(null),[finished,setFinished]=useState<{id:string;score:number}|null>(null);
 const [cue,setCue]=useState<{id:number;text:string;kind:'correct'|'collision';at:number}|null>(null),[speedUpAt,setSpeedUpAt]=useState<number>();
 const runRef=useRef<LocalFlightRun|null>(null),planeRef=useRef(.5),pointerRef=useRef<number|null>(null),sendRef=useRef(send),connectedRef=useRef(connected),pending=useRef<{runId:string;steps:LocalFlightRun['steps']}|null>(null),submitted=useRef(new Set<string>());
 sendRef.current=send;connectedRef.current=connected;
 useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),50);return()=>{clearInterval(timer);stopFlightAudio();};},[]);
 useEffect(()=>{let active=true;Promise.all([preloadFlightArt(),preloadFlightAudio()]).then(()=>{if(active)setReady(true)}).catch(()=>{if(active)setReady(true)});return()=>{active=false;};},[]);
 useEffect(()=>{if(connected&&pending.current&&sendRef.current('flightSubmit',pending.current))pending.current=null;},[connected]);
 const finish=(value:LocalFlightRun)=>{if(submitted.current.has(value.id))return;submitted.current.add(value.id);runRef.current=null;setRun(null);setFinished({id:value.id,score:value.score});pending.current={runId:value.id,steps:value.steps};if(connectedRef.current&&sendRef.current('flightSubmit',pending.current))pending.current=null;};
 const start=()=>{prepareFlightAudio();const next=startLocalFlight();runRef.current=next;setRun(next);setFinished(null);setCue(null);setSpeedUpAt(undefined);planeRef.current=.5;setPlaneX(.5);void playFlightAudioSequence([FLIGHT_VERBS[next.verbIndex].base]);};
 useEffect(()=>{if(!run)return;const now=Date.now();if(now>=run.endsAt){finish(run);return;}
  if(run.gameOverAt!==undefined){const timer=window.setTimeout(()=>finish(run),Math.max(0,run.gameOverAt+1700-now));return()=>clearTimeout(timer);}
  const id=run.challenge.id,timer=window.setTimeout(()=>{const current=runRef.current;if(!current||current.id!==run.id||current.challenge.id!==id||Date.now()>=current.endsAt)return;
   const at=Date.now(),result=advanceLocalFlight(current,flightLaneAt(planeRef.current),at);runRef.current=result.run;setRun(result.run);setCue({id,text:result.word,kind:result.correct?'correct':'collision',at});
   if(result.speedUp)setSpeedUpAt(at);playFlightImpactSound(result.correct?'correct':'collision');
   const words=result.correct&&current.stage==='participle'?[result.word,FLIGHT_VERBS[result.run.verbIndex].base]:[result.word];void playFlightAudioSequence(words);
  },Math.max(0,run.challenge.deadline-now));
  const end=window.setTimeout(()=>{const latest=runRef.current;if(latest?.id===run.id)finish(latest);},Math.max(0,run.endsAt-now));return()=>{clearTimeout(timer);clearTimeout(end);};
 },[run?.id,run?.challenge.id,run?.gameOverAt]);
 const steer=(x:number)=>{const next=Math.max(.13,Math.min(.87,x));planeRef.current=next;setPlaneX(next);};
 useEffect(()=>{const handler=(event:KeyboardEvent)=>{if(!runRef.current)return;if(event.key==='ArrowLeft'||event.key==='a'){event.preventDefault();steer(.275);}if(event.key==='ArrowRight'||event.key==='d'){event.preventDefault();steer(.725);}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[]);
 const challenge=run?.challenge,verb=run?FLIGHT_VERBS[run.verbIndex]:null,rank=data?.ranking.findIndex(item=>item.id===myId)??-1,remaining=run?Math.max(0,run.endsAt-clock):0;
 const gateRemaining=challenge?challenge.deadline-clock:0,gateTotal=challenge?challenge.deadline-(challenge.startsAt??clock):1;
 return <section className={`hub-page flight-page ${run?'is-playing':finished?'is-finished':''}`} aria-label="불규칙 동사 플라이트">
  <header className="flight-header"><button aria-label="미니게임 목록으로" onClick={onBack}>←</button><h1>불규칙 동사 플라이트</h1>{run&&<strong className="flight-score" aria-label={`점수 ${run.score}점`}>{run.score.toLocaleString()}</strong>}</header>
  {run&&challenge&&verb?<div className="flight-play"><div className="flight-timer" aria-label={`남은 시간 ${Math.ceil(remaining/1000)}초`}><span style={{width:`${remaining/FLIGHT_ROUND_MS*100}%`}}/></div>
   <div className="flight-field" role="application" tabIndex={0} data-plane-x={planeX.toFixed(3)} aria-label={`비행기 조종. ${verb.base}의 ${run.stage==='past'?'과거형':'과거분사'}. 왼쪽 ${challenge.left}, 오른쪽 ${challenge.right}.`} onPointerDown={event=>{pointerRef.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);const box=event.currentTarget.getBoundingClientRect();steer((event.clientX-box.left)/box.width);}} onPointerMove={event=>{if(pointerRef.current!==event.pointerId)return;const box=event.currentTarget.getBoundingClientRect();steer((event.clientX-box.left)/box.width);}} onPointerUp={event=>{if(pointerRef.current===event.pointerId)pointerRef.current=null;}} onPointerCancel={event=>{if(pointerRef.current===event.pointerId)pointerRef.current=null;}}>
    <FlightScene word={verb.base} showWord={run.gameOverAt===undefined} impact={cue&&clock-cue.at<400?{at:cue.at,kind:cue.kind}:undefined} speedUpAt={speedUpAt&&clock-speedUpAt<1000?speedUpAt:undefined} crashStartedAt={run.gameOverAt} challenge={challenge} speed={run.speed} startsAt={challenge.startsAt??clock} serverOffset={0} planeX={planeX} onReady={()=>{}}/>
    <div className="flight-play-hud"><strong className="flight-hearts" aria-label={`남은 하트 ${run.hearts}개`}>{Array.from({length:3},(_,i)=><span key={i} className={i<run.hearts?'':'spent'}>♥</span>)}</strong></div>
    {run.stage==='past'&&run.lastResult!=='collision'&&gateRemaining>gateTotal*.65&&<div className="flight-question"><strong>{verb.base[0].toUpperCase()+verb.base.slice(1)}</strong><small>{verb.meaning}</small></div>}
    {cue&&clock-cue.at<750&&<div key={`cue-${cue.id}`} className={`flight-answer-cue ${cue.kind}`} role="status">{cue.text}</div>}{cue?.kind==='collision'&&clock-cue.at<400&&<span key={`crash-${cue.id}`} className="flight-crash" aria-hidden="true"/>}
   </div></div>:finished?<div className="flight-finished" role="dialog" aria-labelledby="flight-finished-title"><div className="flight-finished-clouds" aria-hidden="true"/><div className="flight-finished-card"><span className="flight-finished-plane" aria-hidden="true"/><small>FLIGHT COMPLETE</small><h2 id="flight-finished-title">비행 종료</h2><div className="flight-finished-stats"><span><small>점수</small><strong>{finished.score.toLocaleString()}</strong></span><span><small>맞힌 게이트</small><strong>{Math.floor(finished.score/30).toLocaleString()}</strong></span></div><p>최고 기록 {Math.max(data?.bestScore??0,finished.score).toLocaleString()}점</p><button className="flight-start" onClick={start}>다시 비행</button><button className="flight-finished-back" onClick={onBack}>미니게임으로</button></div></div>:<div className="flight-ready"><button className="flight-ready-intro flight-title-button" aria-label="불규칙 동사 플라이트 게임 시작" disabled={!ready} onClick={start}><MiniGameTitleArt game="flight" placement="ranking"/></button><div className="flight-ranking"><div><h2>비행 랭킹</h2><small>최고 {data?.bestScore??0}점</small></div><ol>{data?.ranking.slice(0,10).map((entry,index)=><li key={entry.id}><b>{index+1}</b><Avatar kind="verb" profileId={entry.profileId} frameId={entry.frameId}/><span>{entry.name}</span><strong>{entry.score.toLocaleString()}점</strong></li>)}</ol>{rank>=10&&<p>내 순위 {rank+1}위</p>}</div><button className="flight-start" disabled={!ready} onClick={start}>{ready?'게임 시작':'준비 중…'}</button></div>}
 </section>;
}
