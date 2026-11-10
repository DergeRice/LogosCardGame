import {useEffect,useMemo,useRef,useState} from 'react';
import type {FlightView} from '../shared/flightGame.js';
import {flightLaneAt,flightWindow,FLIGHT_ARRIVAL_GRACE_MS} from '../shared/flightGame.js';
import {Avatar} from './MatchPresentation.js';
import {FlightScene,preloadFlightArt} from './FlightScene.js';
import {playMiniAudio,preloadMiniAudio,preloadMiniClips,prepareMiniAudio,stopMiniAudio} from './miniAudio.js';
import {unlockGameAudio} from './exampleAudio.js';
import './flight-game.css';

type Props={data:FlightView|null;connected:boolean;myId:string;send:(type:string,extra?:Record<string,unknown>)=>boolean;onBack:()=>void};
function ding(){const audio=unlockGameAudio();if(!audio)return;const tone=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime;tone.type='sine';tone.frequency.setValueAtTime(650,time);tone.frequency.exponentialRampToValueAtTime(980,time+.12);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.16,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+.24);tone.connect(gain).connect(audio.destination);tone.start(time);tone.stop(time+.25);}
function crash(){const audio=unlockGameAudio();if(!audio)return;const tone=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime;tone.type='sawtooth';tone.frequency.setValueAtTime(180,time);tone.frequency.exponentialRampToValueAtTime(65,time+.24);gain.gain.setValueAtTime(.08,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.28);tone.connect(gain).connect(audio.destination);tone.start(time);tone.stop(time+.28);}
export function FlightPanel({data,connected,myId,send,onBack}:Props){
 const [clock,setClock]=useState(Date.now()),[planeX,setPlaneX]=useState(.5),[expanded,setExpanded]=useState(false),[artReady,setArtReady]=useState(false);
 const [impact,setImpact]=useState<{serial:number;text:string}|null>(null);
 const requestRef=useRef(''),arrivalRef=useRef(''),playedRef=useRef(''),soundTimer=useRef<number|undefined>(undefined),pointerRef=useRef<number|null>(null),planeRef=useRef(.5);
 const previousRef=useRef({id:data?.run?.id??'',score:data?.run?.score??0,hearts:data?.run?.hearts??3}),impactTimer=useRef<number|undefined>(undefined);
 const offset=useMemo(()=>(data?.serverNow??Date.now())-Date.now(),[data?.serverNow]),run=data?.run,challenge=run?.challenge,verb=run?.verb;
 const remaining=(challenge?.deadline??0)-(clock+offset),left=Math.max(0,remaining),total=run?flightWindow(run.speed):3200;
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),30);return()=>{clearInterval(timer);stopMiniAudio();clearTimeout(soundTimer.current);clearTimeout(impactTimer.current);};},[]);
 useEffect(()=>{let active=true;void preloadMiniAudio().catch(()=>{});void preloadFlightArt().then(()=>{if(active)setArtReady(true)}).catch(()=>{if(active)setArtReady(true)});return()=>{active=false;};},[]);
 useEffect(()=>{if(!challenge||!run)return;if(run.lastResult==='collision')crash();
  const current=`${run.id}:${challenge.id}`;if(playedRef.current===current)return;playedRef.current=current;
  preloadMiniClips([verb!.base,...(run.lastWord?[run.lastWord]:[])]);
  if(run.lastResult==='correct'&&run.lastWord){ding();void playMiniAudio(run.lastWord);soundTimer.current=window.setTimeout(()=>void playMiniAudio(verb!.base),650);}else void playMiniAudio(verb!.base);
 },[run?.id,challenge?.id]);
 useEffect(()=>{if(!run)return;const before=previousRef.current;if(before.id===run.id&&run.score>before.score){setImpact(current=>({serial:(current?.serial??0)+1,text:`+${run.score-before.score}`}));clearTimeout(impactTimer.current);impactTimer.current=window.setTimeout(()=>setImpact(null),700);}previousRef.current={id:run.id,score:run.score,hearts:run.hearts};},[run?.id,run?.score,run?.hearts]);
 useEffect(()=>{if(!challenge||!run)return;const key=`${run.id}:${challenge.id}`;if(remaining<=0&&remaining>-(FLIGHT_ARRIVAL_GRACE_MS-100)&&arrivalRef.current!==key&&connected){const side=flightLaneAt(planeRef.current);if(send('flightChoose',{runId:run.id,challengeId:challenge.id,side}))arrivalRef.current=key;}if(remaining<-(FLIGHT_ARRIVAL_GRACE_MS+100)&&requestRef.current!==key){requestRef.current=key;send('flightStatus');}},[run?.id,challenge?.id,remaining,connected,send]);
 const steer=(x:number)=>{const next=Math.max(.13,Math.min(.87,x));planeRef.current=next;setPlaneX(next);};
 const steerPointer=(event:React.PointerEvent<HTMLDivElement>)=>{const bounds=event.currentTarget.getBoundingClientRect();steer((event.clientX-bounds.left)/bounds.width);};
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(!run)return;if(event.key==='ArrowLeft'||event.key==='a'){event.preventDefault();steer(.275);}if(event.key==='ArrowRight'||event.key==='d'){event.preventDefault();steer(.725);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[Boolean(run)]);
 const myRank=data?.ranking.findIndex(item=>item.id===myId)??-1;
 return <section className={`hub-page flight-page ${run?'is-playing':''}`} aria-label="불규칙 동사 플라이트">
  <header className="flight-header"><button aria-label="미니게임 목록으로" onClick={onBack}>←</button><h1>불규칙 동사 플라이트</h1></header>
  {run&&challenge&&verb?<div className="flight-play">
   <div className="flight-timer" aria-label={`게이트까지 ${Math.ceil(left/1000)}초`}><span style={{width:`${Math.max(0,Math.min(100,left/total*100))}%`}}/></div>
   <div className="flight-field" role="application" tabIndex={0} data-plane-x={planeX.toFixed(3)} aria-label={`비행기 조종. 왼쪽 ${challenge.left}, 오른쪽 ${challenge.right}. 손가락을 누른 채 좌우로 움직이거나 방향키를 사용하세요.`} onPointerDown={event=>{pointerRef.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);steerPointer(event);}} onPointerMove={event=>{if(pointerRef.current===event.pointerId)steerPointer(event);}} onPointerUp={event=>{if(pointerRef.current===event.pointerId)pointerRef.current=null;}} onPointerCancel={event=>{if(pointerRef.current===event.pointerId)pointerRef.current=null;}}><FlightScene challenge={challenge} speed={run.speed} progress={1-remaining/total} planeX={planeX}/><div className="flight-play-hud"><strong className="flight-hearts" aria-label={`남은 하트 ${run.hearts}개`}>{Array.from({length:3},(_,i)=><span key={i} className={i<run.hearts?'':'spent'}>♥</span>)}</strong><strong className="flight-score" aria-label={`점수 ${run.score}점`}>{run.score.toLocaleString()}</strong></div><span className="flight-stage">{run.stage==='past'?'과거형':'과거분사'}</span><div className="flight-question" style={{opacity:Math.max(0,Math.min(1,(.35-(1-remaining/total))/.15))}}><strong>{verb.base[0].toUpperCase()+verb.base.slice(1)}</strong><small>{verb.meaning}</small></div>{run.lastResult==='collision'&&<span key={challenge.id} className="flight-crash" aria-hidden="true"/>}</div>
   {impact&&<span key={impact.serial} className="flight-impact score" aria-live="polite">{impact.text}</span>}
  </div>:<div className="flight-ready">
   {data?.lastResult&&<div className="flight-result"><strong>비행 종료</strong><span>{data.lastResult.distance.toLocaleString()}m · {data.lastResult.score.toLocaleString()}점</span></div>}
   <div className="flight-ranking"><div><h2>비행 랭킹</h2><small>최고 {data?.bestDistance??0}m</small></div><ol>{(data?.ranking??[]).slice(0,expanded?10:3).map((entry,index)=><li key={entry.id}><b>{index+1}</b><Avatar kind="verb" profileId={entry.profileId} frameId={entry.frameId}/><span>{entry.name}</span><strong>{entry.distance.toLocaleString()}m</strong><small>{entry.score}점</small></li>)}</ol>{!data?.ranking.length&&<p>첫 비행 기록을 남겨보세요.</p>}{(data?.ranking.length??0)>3&&<button className="flight-more" onClick={()=>setExpanded(value=>!value)}>{expanded?'접기':'더보기'}</button>}{myRank>=10&&<p>내 순위 {myRank+1}위</p>}</div>
   <button className="flight-start" disabled={!connected||!artReady} onClick={()=>{prepareMiniAudio();send('flightStart')}}>{!artReady?'준비 중…':data?.lastResult?'다시 비행':'시작'}</button>
  </div>}
 </section>;
}
