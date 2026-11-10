import {useEffect,useMemo,useRef,useState} from 'react';
import type {FlightView} from '../shared/flightGame.js';
import {flightLaneAt,flightWindow,FLIGHT_ARRIVAL_GRACE_MS} from '../shared/flightGame.js';
import {Avatar} from './MatchPresentation.js';
import {FlightScene,preloadFlightArt} from './FlightScene.js';
import {playFlightAudioSequence,preloadFlightAudio,prepareFlightAudio,stopFlightAudio} from './flightAudio.js';
import {unlockGameAudio} from './exampleAudio.js';
import {FLIGHT_VERBS} from '../server/flightWords.js';
import './flight-game.css';

type Props={data:FlightView|null;connected:boolean;myId:string;send:(type:string,extra?:Record<string,unknown>)=>boolean;onBack:()=>void};
function crash(){const audio=unlockGameAudio();if(!audio)return;const tone=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime;tone.type='sawtooth';tone.frequency.setValueAtTime(180,time);tone.frequency.exponentialRampToValueAtTime(65,time+.24);gain.gain.setValueAtTime(.08,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.28);tone.connect(gain).connect(audio.destination);tone.start(time);tone.stop(time+.28);}
export function FlightPanel({data,connected,myId,send,onBack}:Props){
 const [clock,setClock]=useState(Date.now()),[planeX,setPlaneX]=useState(.5),[expanded,setExpanded]=useState(false),[artReady,setArtReady]=useState(false),[audioReady,setAudioReady]=useState(false);
 const [answerCue,setAnswerCue]=useState<{id:number;text:string;kind:'correct'|'collision'}|null>(null);
 const [preview,setPreview]=useState<{key:string;hearts:number;score:number}|null>(null);
 const requestRef=useRef(''),arrivalRef=useRef(''),playedRef=useRef(''),cueTimer=useRef<number|undefined>(undefined),pointerRef=useRef<number|null>(null),planeRef=useRef(.5),fieldRef=useRef<HTMLDivElement>(null),sendRef=useRef(send);
 const contactRef=useRef<{key:string;correct:boolean;audio:Promise<void>}|null>(null);
 const lastRunRef=useRef<NonNullable<FlightView['run']>|null>(null),finishUntilRef=useRef(0);
 sendRef.current=send;
 const offset=useMemo(()=>(data?.serverNow??Date.now())-Date.now(),[data?.serverNow]),run=data?.run,challenge=run?.challenge,verb=run?.verb;
 if(run){lastRunRef.current=run;finishUntilRef.current=0;}
 else if(data?.lastResult&&lastRunRef.current&&!finishUntilRef.current)finishUntilRef.current=Date.now()+1050;
 const displayRun=run??(data?.lastResult&&clock<finishUntilRef.current?lastRunRef.current:null),displayChallenge=displayRun?.challenge,displayVerb=displayRun?.verb;
 const remaining=(challenge?.deadline??0)-(clock+offset),left=Math.max(0,remaining),total=run?flightWindow(run.speed):3200;
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),100);return()=>{clearInterval(timer);stopFlightAudio();clearTimeout(cueTimer.current);};},[]);
 useEffect(()=>{let active=true;void preloadFlightAudio().then(()=>{if(active)setAudioReady(true)}).catch(()=>{});void preloadFlightArt().then(()=>{if(active)setArtReady(true)}).catch(()=>{if(active)setArtReady(true)});return()=>{active=false;};},[]);
 useEffect(()=>{if(!challenge||!run||!verb)return;
  const current=`${run.id}:${challenge.id}`;if(playedRef.current===current)return;playedRef.current=current;
  const contact=contactRef.current;
  if(contact?.key===`${run.id}:${challenge.id-1}`&&contact.correct===(run.lastResult==='correct')){
   setPreview(null);
   if(contact.correct&&run.stage==='past')void contact.audio.then(()=>playFlightAudioSequence([verb.base]));
   return;
  }
  clearTimeout(cueTimer.current);
  const nextBase=run.lastResult==='correct'&&run.stage==='past';
  const words=run.lastResult==='correct'&&run.lastWord?[run.lastWord,...(nextBase?[verb.base]:[])]:[verb.base];
  if(run.lastResult==='correct'&&run.lastWord){setAnswerCue({id:challenge.id,text:run.lastWord,kind:'correct'});cueTimer.current=window.setTimeout(()=>setAnswerCue(null),900);}
  else if(run.lastResult==='collision'){crash();setAnswerCue({id:challenge.id,text:verb.base,kind:'collision'});cueTimer.current=window.setTimeout(()=>setAnswerCue(null),900);}
  else setAnswerCue(null);
  void playFlightAudioSequence(words);
 },[run?.id,challenge?.id]);
 useEffect(()=>{if(!challenge||!run||!connected)return;const key=`${run.id}:${challenge.id}`,until=challenge.deadline-(Date.now()+offset);
  const arrival=window.setTimeout(()=>{if(arrivalRef.current===key)return;const w=fieldRef.current?.clientWidth??390,h=fieldRef.current?.clientHeight??600,planeSize=Math.min(90,Math.max(44,Math.min(w*.22,h*.15)));const side=flightLaneAt(planeRef.current,planeSize/w);
   if(!sendRef.current('flightChoose',{runId:run.id,challengeId:challenge.id,side}))return;
   arrivalRef.current=key;
   const expected=FLIGHT_VERBS.find(item=>item.base===verb?.base)?.[run.stage];if(!expected)return;
   const selected=side==='left'?challenge.left:side==='right'?challenge.right:'';
   const correct=selected.toLowerCase()===expected.toLowerCase(),word=correct?expected:verb!.base;
   clearTimeout(cueTimer.current);setAnswerCue({id:challenge.id,text:word,kind:correct?'correct':'collision'});
   cueTimer.current=window.setTimeout(()=>setAnswerCue(null),850);
   setPreview({key,hearts:run.hearts-(correct?0:1),score:run.score+(correct?30:0)});
   if(!correct)crash();
   contactRef.current={key,correct,audio:playFlightAudioSequence([word])};
  },Math.max(0,until));
  const recovery=window.setTimeout(()=>{if(requestRef.current===key)return;requestRef.current=key;sendRef.current('flightStatus');},Math.max(0,until+FLIGHT_ARRIVAL_GRACE_MS+100));
  return()=>{clearTimeout(arrival);clearTimeout(recovery);};
 },[run?.id,challenge?.id,connected,offset]);
 const steer=(x:number)=>{const next=Math.max(.13,Math.min(.87,x));planeRef.current=next;setPlaneX(next);};
 const steerPointer=(event:React.PointerEvent<HTMLDivElement>)=>{const bounds=event.currentTarget.getBoundingClientRect();steer((event.clientX-bounds.left)/bounds.width);};
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(!run)return;if(event.key==='ArrowLeft'||event.key==='a'){event.preventDefault();steer(.275);}if(event.key==='ArrowRight'||event.key==='d'){event.preventDefault();steer(.725);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[Boolean(run)]);
 const myRank=data?.ranking.findIndex(item=>item.id===myId)??-1;
 const shownHearts=run?(preview?.key===`${run.id}:${challenge?.id}`?preview.hearts:run.hearts):0;
 const shownScore=run?(preview?.key===`${run.id}:${challenge?.id}`?preview.score:run.score):(displayRun?.score??0);
 const showCue=Boolean(answerCue&&displayChallenge&&(answerCue.id===displayChallenge.id||answerCue.id===displayChallenge.id-1));
 return <section className={`hub-page flight-page ${displayRun?'is-playing':data?.lastResult?'is-finished':''}`} aria-label="불규칙 동사 플라이트">
  <header className="flight-header"><button aria-label="미니게임 목록으로" onClick={onBack}>←</button><h1>불규칙 동사 플라이트</h1></header>
  {displayRun&&displayChallenge&&displayVerb?<div className="flight-play">
   <div className="flight-timer" aria-label={`게이트까지 ${Math.ceil(left/1000)}초`}><span style={{width:`${Math.max(0,Math.min(100,left/total*100))}%`}}/></div>
   <div className="flight-field" ref={fieldRef} role="application" tabIndex={0} data-plane-x={planeX.toFixed(3)} aria-label={`비행기 조종. 왼쪽 ${displayChallenge.left}, 오른쪽 ${displayChallenge.right}. 손가락을 누른 채 좌우로 움직이거나 방향키를 사용하세요.`} onPointerDown={event=>{if(!run)return;pointerRef.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);steerPointer(event);}} onPointerMove={event=>{if(pointerRef.current===event.pointerId)steerPointer(event);}} onPointerUp={event=>{if(pointerRef.current===event.pointerId)pointerRef.current=null;}} onPointerCancel={event=>{if(pointerRef.current===event.pointerId)pointerRef.current=null;}}><FlightScene challenge={displayChallenge} speed={displayRun.speed} progress={1-remaining/total} startsAt={displayChallenge.startsAt??displayChallenge.deadline-total} serverOffset={offset} planeX={planeX}/><div className="flight-play-hud"><strong className="flight-hearts" aria-label={`남은 하트 ${shownHearts}개`}>{Array.from({length:3},(_,i)=><span key={i} className={i<(shownHearts)?'':'spent'}>♥</span>)}</strong><strong className="flight-score" aria-label={`점수 ${shownScore}점`}>{shownScore.toLocaleString()}</strong></div><span className="flight-stage">{displayRun.stage==='past'?'과거형':'과거분사'}</span>{run&&!showCue&&<div className="flight-question" style={{opacity:Math.max(0,Math.min(1,(.35-(1-remaining/total))/.15))}}><strong>{displayVerb.base[0].toUpperCase()+displayVerb.base.slice(1)}</strong><small>{displayVerb.meaning}</small></div>}{showCue&&answerCue&&<div key={`cue-${answerCue.id}`} className={`flight-answer-cue ${answerCue.kind}`} role="status">{answerCue.text}</div>}{run?.lastResult==='collision'&&<span key={`crash-${displayChallenge.id}`} className="flight-crash" aria-hidden="true"/>}</div>
  </div>:data?.lastResult?<div className="flight-finished" role="dialog" aria-labelledby="flight-finished-title">
   <div className="flight-finished-clouds" aria-hidden="true"/>
   <div className="flight-finished-card">
    <span className="flight-finished-plane" aria-hidden="true"/>
    <small>FLIGHT COMPLETE</small>
    <h2 id="flight-finished-title">비행 종료</h2>
    <div className="flight-finished-stats"><span><small>점수</small><strong>{data.lastResult.score.toLocaleString()}</strong></span><span><small>비행 거리</small><strong>{data.lastResult.distance.toLocaleString()}<em>m</em></strong></span></div>
    <p>최고 기록 {data.bestScore.toLocaleString()}점{myRank>=0?` · 이번 시즌 ${myRank+1}위`:''}</p>
    <button className="flight-start" disabled={!connected||!artReady||!audioReady} onClick={()=>{prepareFlightAudio();send('flightStart')}}>{!artReady||!audioReady?'준비 중…':'다시 비행'}</button>
    <button className="flight-finished-back" onClick={onBack}>미니게임으로</button>
   </div>
  </div>:<div className="flight-ready">
   <div className="flight-ranking"><div><h2>비행 랭킹</h2><small>최고 {data?.bestDistance??0}m</small></div><ol>{(data?.ranking??[]).slice(0,expanded?10:3).map((entry,index)=><li key={entry.id}><b>{index+1}</b><Avatar kind="verb" profileId={entry.profileId} frameId={entry.frameId}/><span>{entry.name}</span><strong>{entry.distance.toLocaleString()}m</strong><small>{entry.score}점</small></li>)}</ol>{!data?.ranking.length&&<p>첫 비행 기록을 남겨보세요.</p>}{(data?.ranking.length??0)>3&&<button className="flight-more" onClick={()=>setExpanded(value=>!value)}>{expanded?'접기':'더보기'}</button>}{myRank>=10&&<p>내 순위 {myRank+1}위</p>}</div>
   <button className="flight-start" disabled={!connected||!artReady||!audioReady} onClick={()=>{prepareFlightAudio();send('flightStart')}}>{!artReady||!audioReady?'준비 중…':'시작'}</button>
  </div>}
 </section>;
}
