import {useEffect,useRef,useState} from 'react';
import type {FlightView} from '../shared/flightGame.js';
import {flightLaneAt,flightSpeedForStreak,flightWindow,FLIGHT_ARRIVAL_GRACE_MS,FLIGHT_ROUND_MS} from '../shared/flightGame.js';
import {Avatar} from './MatchPresentation.js';
import {FlightScene,preloadFlightArt} from './FlightScene.js';
import {playFlightAudioSequence,preloadFlightAudio,prepareFlightAudio,stopFlightAudio} from './flightAudio.js';
import {playFlightImpactSound} from './flightFeedback.js';
import {FLIGHT_VERBS} from '../server/flightWords.js';
import './flight-game.css';

type Props={data:FlightView|null;connected:boolean;myId:string;send:(type:string,extra?:Record<string,unknown>)=>boolean;onBack:()=>void};
const FLIGHT_GAME_OVER_MS=1700;
export function FlightPanel({data,connected,myId,send,onBack}:Props){
 const [clock,setClock]=useState(Date.now()),[planeX,setPlaneX]=useState(.5),[expanded,setExpanded]=useState(false),[artReady,setArtReady]=useState(false),[audioReady,setAudioReady]=useState(false),[rendererReady,setRendererReady]=useState('');
 const [answerCue,setAnswerCue]=useState<{id:number;text:string;kind:'correct'|'collision'}|null>(null);
 const [preview,setPreview]=useState<{key:string;hearts:number;score:number;at:number}|null>(null);
 const requestRef=useRef(''),arrivalRef=useRef(''),playedRef=useRef(''),cueTimer=useRef<number|undefined>(undefined),pointerRef=useRef<number|null>(null),planeRef=useRef(.5),fieldRef=useRef<HTMLDivElement>(null),sendRef=useRef(send);
 const contactRef=useRef<{key:string;correct:boolean;audio:Promise<void>}|null>(null);
 const lastRunRef=useRef<NonNullable<FlightView['run']>|null>(null),finishUntilRef=useRef(0),clockSyncRef=useRef<{runId:string;offset:number}|null>(null);
 sendRef.current=send;
 const run=data?.run,challenge=run?.challenge,verb=run?.verb;
 if(run&&clockSyncRef.current?.runId!==run.id)clockSyncRef.current={runId:run.id,offset:(data?.serverNow??Date.now())-Date.now()};
 const offset=clockSyncRef.current?.offset??0;
 if(run){lastRunRef.current=run;finishUntilRef.current=0;}
 else if(data?.lastResult&&lastRunRef.current?.hearts===1&&!finishUntilRef.current)finishUntilRef.current=Math.max(Date.now()+400,(preview?.at??Date.now())+FLIGHT_GAME_OVER_MS);
 const displayRun=run??(data?.lastResult&&clock<finishUntilRef.current?lastRunRef.current:null),displayChallenge=displayRun?.challenge,displayVerb=displayRun?.verb;
 const finishedResult=!run&&lastRunRef.current?data?.lastResult:null;
 const remaining=(challenge?.deadline??0)-(clock+offset),total=run?flightWindow(run.speed):3200;
 const roundLeft=run?Math.max(0,(run.endsAt??run.startedAt+FLIGHT_ROUND_MS)-(clock+offset)):0;
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),100);return()=>{clearInterval(timer);stopFlightAudio();clearTimeout(cueTimer.current);};},[]);
 useEffect(()=>{let active=true;void preloadFlightAudio().then(()=>{if(active)setAudioReady(true)}).catch(()=>{});void preloadFlightArt().then(()=>{if(active)setArtReady(true)}).catch(()=>{if(active)setArtReady(true)});return()=>{active=false;};},[]);
 useEffect(()=>{if(!run||!challenge?.awaitingReady||!connected||rendererReady!==run.id)return;const sendReady=()=>sendRef.current('flightGateReady',{runId:run.id,challengeId:challenge.id});sendReady();const retry=window.setInterval(sendReady,1500);return()=>clearInterval(retry);},[run?.id,challenge?.id,challenge?.awaitingReady,connected,rendererReady]);
 useEffect(()=>{if(!run||!connected)return;const until=(run.endsAt??run.startedAt+FLIGHT_ROUND_MS)-(Date.now()+offset);const timer=window.setTimeout(()=>sendRef.current('flightStatus'),Math.max(0,until));return()=>clearTimeout(timer);},[run?.id,connected,offset]);
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
  else if(run.lastResult==='collision'){playFlightImpactSound('collision');setAnswerCue({id:challenge.id,text:verb.base,kind:'collision'});cueTimer.current=window.setTimeout(()=>setAnswerCue(null),900);}
  else setAnswerCue(null);
  void playFlightAudioSequence(words);
 },[run?.id,challenge?.id]);
 useEffect(()=>{if(!challenge||!run||!connected||challenge.awaitingReady)return;const key=`${run.id}:${challenge.id}`,until=challenge.deadline-(Date.now()+offset);
  const arrival=window.setTimeout(()=>{if(arrivalRef.current===key)return;const side=flightLaneAt(planeRef.current);
   if(!sendRef.current('flightChoose',{runId:run.id,challengeId:challenge.id,side}))return;
   arrivalRef.current=key;
   const expected=FLIGHT_VERBS.find(item=>item.base===verb?.base)?.[run.stage];if(!expected)return;
   const selected=side==='left'?challenge.left:side==='right'?challenge.right:'';
   const correct=selected.toLowerCase()===expected.toLowerCase(),word=correct?expected:verb!.base;
   clearTimeout(cueTimer.current);setAnswerCue({id:challenge.id,text:word,kind:correct?'correct':'collision'});
   cueTimer.current=window.setTimeout(()=>setAnswerCue(null),850);
   setPreview({key,hearts:run.hearts-(correct?0:1),score:run.score+(correct?30:0),at:Date.now()});
   playFlightImpactSound(correct?'correct':'collision');
   contactRef.current={key,correct,audio:playFlightAudioSequence([word])};
  },Math.max(0,until));
  const recovery=window.setTimeout(()=>{if(requestRef.current===key)return;requestRef.current=key;sendRef.current('flightStatus');},Math.max(0,until+FLIGHT_ARRIVAL_GRACE_MS+100));
  return()=>{clearTimeout(arrival);clearTimeout(recovery);};
 },[run?.id,challenge?.id,challenge?.awaitingReady,connected,offset,run?.hearts,run?.score,run?.stage,verb?.base]);
 const steer=(x:number)=>{const next=Math.max(.13,Math.min(.87,x));planeRef.current=next;setPlaneX(next);};
 const steerPointer=(event:React.PointerEvent<HTMLDivElement>)=>{const bounds=event.currentTarget.getBoundingClientRect();steer((event.clientX-bounds.left)/bounds.width);};
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(!run)return;if(event.key==='ArrowLeft'||event.key==='a'){event.preventDefault();steer(.275);}if(event.key==='ArrowRight'||event.key==='d'){event.preventDefault();steer(.725);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[Boolean(run)]);
 const myRank=data?.ranking.findIndex(item=>item.id===myId)??-1;
 const shownHearts=run?(preview?.key===`${run.id}:${challenge?.id}`?preview.hearts:run.hearts):0;
 const shownScore=run?(preview?.key===`${run.id}:${challenge?.id}`?preview.score:run.score):(displayRun?.score??0);
 const showCue=Boolean(answerCue&&displayChallenge&&(answerCue.id===displayChallenge.id||answerCue.id===displayChallenge.id-1));
 const crashStartedAt=preview?.hearts===0&&(run?preview.key===`${run.id}:${challenge?.id}`:Boolean(data?.lastResult))?preview.at:!run&&data?.lastResult&&finishUntilRef.current?finishUntilRef.current-FLIGHT_GAME_OVER_MS:undefined;
 const showPlaneWord=Boolean(run&&crashStartedAt===undefined&&!(run.stage==='participle'&&preview?.key===`${run.id}:${challenge?.id}`&&preview.score>run.score));
 const contactKey=displayRun&&displayChallenge?`${displayRun.id}:${displayChallenge.id}`:null;
 const localHit=Boolean(contactKey&&preview?.key===contactKey&&preview.hearts<displayRun!.hearts&&clock-preview.at<400);
 const previousContactKey=run&&challenge?`${run.id}:${challenge.id-1}`:null;
 const serverHit=Boolean(run?.lastResult==='collision'&&contactRef.current?.key!==previousContactKey);
 const hitKey=localHit?contactKey:serverHit?previousContactKey:null;
 const impact=contactKey&&preview?.key===contactKey&&clock-preview.at<450?{at:preview.at,kind:preview.hearts<displayRun!.hearts?'collision' as const:'correct' as const}:undefined;
 const nextStreak=(run?.speedSteps??0)+1;
 const localMilestone=run&&preview?.key===`${run.id}:${challenge?.id}`&&preview.score>run.score&&nextStreak%5===0&&flightSpeedForStreak(nextStreak)>flightSpeedForStreak(nextStreak-1)?preview.at:undefined;
 const serverMilestone=run?.lastResult==='correct'&&(run.speedSteps??0)>0&&(run.speedSteps??0)%5===0&&run.speed>flightSpeedForStreak((run.speedSteps??0)-1)?run.lastActionAt-offset:undefined;
 const milestoneAt=localMilestone??serverMilestone;
 const speedUpAt=milestoneAt!==undefined&&clock-milestoneAt>=-100&&clock-milestoneAt<1000?milestoneAt:undefined;
 return <section className={`hub-page flight-page ${displayRun?'is-playing':finishedResult?'is-finished':''}`} aria-label="불규칙 동사 플라이트">
  <header className="flight-header"><button aria-label="미니게임 목록으로" onClick={onBack}>←</button><h1>불규칙 동사 플라이트</h1></header>
  {displayRun&&displayChallenge&&displayVerb?<div className="flight-play">
   <div className="flight-timer" aria-label={`남은 시간 ${Math.ceil(roundLeft/1000)}초`}><span style={{width:`${roundLeft/FLIGHT_ROUND_MS*100}%`}}/></div>
   <div className="flight-field" ref={fieldRef} role="application" tabIndex={0} data-plane-x={planeX.toFixed(3)} aria-label={`비행기 조종. 현재 ${displayVerb.base}. 왼쪽 ${displayChallenge.left}, 오른쪽 ${displayChallenge.right}. 손가락을 누른 채 좌우로 움직이거나 방향키를 사용하세요.`} onPointerDown={event=>{if(!run)return;pointerRef.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);steerPointer(event);}} onPointerMove={event=>{if(pointerRef.current===event.pointerId)steerPointer(event);}} onPointerUp={event=>{if(pointerRef.current===event.pointerId)pointerRef.current=null;}} onPointerCancel={event=>{if(pointerRef.current===event.pointerId)pointerRef.current=null;}}><FlightScene word={displayVerb.base} showWord={showPlaneWord} impact={impact} speedUpAt={speedUpAt} crashStartedAt={crashStartedAt} challenge={displayChallenge} speed={displayRun.speed} startsAt={displayChallenge.startsAt??displayChallenge.deadline-total} serverOffset={offset} planeX={planeX} onReady={()=>setRendererReady(displayRun.id)}/><div className="flight-play-hud"><strong className="flight-hearts" aria-label={`남은 하트 ${shownHearts}개`}>{Array.from({length:3},(_,i)=><span key={i} className={i<(shownHearts)?'':'spent'}>♥</span>)}</strong><strong className="flight-score" aria-label={`점수 ${shownScore}점`}>{shownScore.toLocaleString()}</strong><strong className="flight-time" aria-label={`남은 시간 ${Math.ceil(roundLeft/1000)}초`}>{Math.ceil(roundLeft/1000)}초</strong></div><span className="flight-stage">{displayRun.stage==='past'?'과거형':'과거분사'}</span>{run&&run.stage==='past'&&run.lastResult!=='collision'&&preview?.key!==`${run.id}:${challenge?.id}`&&!showCue&&<div className="flight-question" style={{opacity:Math.max(0,Math.min(1,(.35-(1-remaining/total))/.15))}}><strong>{displayVerb.base[0].toUpperCase()+displayVerb.base.slice(1)}</strong><small>{displayVerb.meaning}</small></div>}{showCue&&answerCue&&<div key={`cue-${answerCue.id}`} className={`flight-answer-cue ${answerCue.kind}`} role="status">{answerCue.text}</div>}{hitKey&&<span key={`crash-${hitKey}`} className="flight-crash" aria-hidden="true"/>}</div>
  </div>:finishedResult?<div className="flight-finished" role="dialog" aria-labelledby="flight-finished-title">
   <div className="flight-finished-clouds" aria-hidden="true"/>
   <div className="flight-finished-card">
    <span className="flight-finished-plane" aria-hidden="true"/>
    <small>FLIGHT COMPLETE</small>
    <h2 id="flight-finished-title">비행 종료</h2>
    <div className="flight-finished-stats"><span><small>점수</small><strong>{finishedResult.score.toLocaleString()}</strong></span><span><small>맞힌 게이트</small><strong>{Math.floor(finishedResult.score/30).toLocaleString()}</strong></span></div>
    <p>최고 기록 {(data?.bestScore??0).toLocaleString()}점{myRank>=0?` · 이번 시즌 ${myRank+1}위`:''}</p>
    <button className="flight-start" disabled={!connected||!artReady||!audioReady} onClick={()=>{prepareFlightAudio();send('flightStart')}}>{!artReady||!audioReady?'준비 중…':'다시 비행'}</button>
    <button className="flight-finished-back" onClick={onBack}>미니게임으로</button>
   </div>
  </div>:<div className="flight-ready">
   <div className="flight-ready-intro"><span className="flight-ready-plane" aria-hidden="true"/><h2>불규칙 동사 플라이트</h2><p>비행기를 움직여 맞는 과거형·과거분사 게이트를 통과하세요.</p></div>
   <div className="flight-ranking"><div><h2>비행 랭킹</h2><small>최고 {data?.bestScore??0}점</small></div><ol>{(data?.ranking??[]).slice(0,expanded?10:3).map((entry,index)=><li key={entry.id}><b>{index+1}</b><Avatar kind="verb" profileId={entry.profileId} frameId={entry.frameId}/><span>{entry.name}</span><strong>{entry.score.toLocaleString()}점</strong></li>)}</ol>{!data?.ranking.length&&<p>첫 비행 기록을 남겨보세요.</p>}{(data?.ranking.length??0)>3&&<button className="flight-more" onClick={()=>setExpanded(value=>!value)}>{expanded?'접기':'더보기'}</button>}{myRank>=10&&<p>내 순위 {myRank+1}위</p>}</div>
   <button className="flight-start" disabled={!connected||!artReady||!audioReady} onClick={()=>{prepareFlightAudio();send('flightStart')}}>{!artReady||!audioReady?'준비 중…':'게임 시작'}</button>
  </div>}
 </section>;
}
