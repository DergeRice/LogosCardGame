import {useEffect,useMemo,useRef,useState} from 'react';
import type {FlightView} from '../shared/flightGame.js';
import {flightLaneAt,flightWindow,FLIGHT_ARRIVAL_GRACE_MS} from '../shared/flightGame.js';
import {Avatar} from './MatchPresentation.js';
import {FlightScene} from './FlightScene.js';
import {playMiniAudio,preloadMiniAudio,preloadMiniClips,prepareMiniAudio,stopMiniAudio} from './miniAudio.js';
import {unlockGameAudio} from './exampleAudio.js';
import './flight-game.css';

type Props={data:FlightView|null;connected:boolean;myId:string;send:(type:string,extra?:Record<string,unknown>)=>boolean;onBack:()=>void};
function ding(){const audio=unlockGameAudio();if(!audio)return;const tone=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime;tone.type='sine';tone.frequency.setValueAtTime(650,time);tone.frequency.exponentialRampToValueAtTime(980,time+.12);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.16,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+.24);tone.connect(gain).connect(audio.destination);tone.start(time);tone.stop(time+.25);}
function crash(){const audio=unlockGameAudio();if(!audio)return;const tone=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime;tone.type='sawtooth';tone.frequency.setValueAtTime(180,time);tone.frequency.exponentialRampToValueAtTime(65,time+.24);gain.gain.setValueAtTime(.08,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.28);tone.connect(gain).connect(audio.destination);tone.start(time);tone.stop(time+.28);}
export function FlightPanel({data,connected,myId,send,onBack}:Props){
 const [clock,setClock]=useState(Date.now()),[planeX,setPlaneX]=useState(.5),[expanded,setExpanded]=useState(false);
 const requestRef=useRef(''),arrivalRef=useRef(''),pickupRef=useRef(''),playedRef=useRef(''),soundTimer=useRef<number|undefined>(undefined),pointerRef=useRef<number|null>(null),planeRef=useRef(.5);
 const offset=useMemo(()=>(data?.serverNow??Date.now())-Date.now(),[data?.serverNow]),run=data?.run,challenge=run?.challenge,verb=run?.verb;
 const remaining=(challenge?.deadline??0)-(clock+offset),left=Math.max(0,remaining),total=run?flightWindow(run.speed):3200;
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),30);return()=>{clearInterval(timer);stopMiniAudio();clearTimeout(soundTimer.current);};},[]);
 useEffect(()=>{void preloadMiniAudio().catch(()=>{});},[]);
 useEffect(()=>{if(!challenge||!run)return;if(run.lastResult==='collision')crash();
  const current=`${run.id}:${challenge.id}`;if(playedRef.current===current)return;playedRef.current=current;
  preloadMiniClips([verb!.base,...(run.lastWord?[run.lastWord]:[])]);
  if(run.lastResult==='correct'&&run.lastWord){ding();void playMiniAudio(run.lastWord);soundTimer.current=window.setTimeout(()=>void playMiniAudio(verb!.base),650);}else void playMiniAudio(verb!.base);
 },[run?.id,challenge?.id]);
 useEffect(()=>{if(!challenge||!run)return;const key=`${run.id}:${challenge.id}`;if(challenge.coinLane&&!run.coinResolved&&left<=total*.3+120&&remaining>0&&pickupRef.current!==key&&connected){const side=flightLaneAt(planeRef.current);if(send('flightPickup',{runId:run.id,challengeId:challenge.id,side}))pickupRef.current=key;}if(remaining<=120&&remaining>-(FLIGHT_ARRIVAL_GRACE_MS-100)&&arrivalRef.current!==key&&connected){const side=flightLaneAt(planeRef.current);if(send('flightChoose',{runId:run.id,challengeId:challenge.id,side}))arrivalRef.current=key;}if(remaining<-(FLIGHT_ARRIVAL_GRACE_MS+100)&&requestRef.current!==key){requestRef.current=key;send('flightStatus');}},[run?.id,challenge?.id,run?.coinResolved,remaining,connected,send]);
 const steer=(x:number)=>{const next=Math.max(.13,Math.min(.87,x));planeRef.current=next;setPlaneX(next);};
 const steerPointer=(event:React.PointerEvent<HTMLDivElement>)=>{const bounds=event.currentTarget.getBoundingClientRect();steer((event.clientX-bounds.left)/bounds.width);};
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(!run)return;if(event.key==='ArrowLeft'||event.key==='a'){event.preventDefault();steer(.275);}if(event.key==='ArrowRight'||event.key==='d'){event.preventDefault();steer(.725);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[Boolean(run)]);
 const myRank=data?.ranking.findIndex(item=>item.id===myId)??-1;
 return <section className="hub-page flight-page" aria-label="불규칙 동사 플라이트">
  <header className="flight-header"><button aria-label="미니게임 목록으로" onClick={onBack}>←</button>{run?<strong className="flight-hearts" aria-label={`남은 하트 ${run.hearts}개`}>{Array.from({length:3},(_,i)=><span key={i} className={i<run.hearts?'':'spent'}>♥</span>)}</strong>:null}<h1>불규칙 동사 플라이트</h1></header>
  {run&&challenge&&verb?<div className="flight-play">
   <div className="flight-hud"><span><small>거리</small><b>{run.distance.toLocaleString()}m</b></span><span><small>점수</small><b>{run.score.toLocaleString()}</b></span><span><small>속도</small><b>x{run.speed.toFixed(1)}</b></span></div>
   <div className="flight-question"><small>{verb.meaning}</small><strong>{verb.base[0].toUpperCase()+verb.base.slice(1)}의 {run.stage==='past'?'과거형':'과거분사'}</strong></div>
   <div className="flight-timer" aria-label={`게이트까지 ${Math.ceil(left/1000)}초`}><span style={{width:`${Math.max(0,Math.min(100,left/total*100))}%`}}/></div>
   <div className="flight-field" role="application" tabIndex={0} data-plane-x={planeX.toFixed(3)} aria-label={`비행기 조종. 왼쪽 ${challenge.left}, 오른쪽 ${challenge.right}. 손가락을 누른 채 좌우로 움직이거나 방향키를 사용하세요.`} onPointerDown={event=>{pointerRef.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);steerPointer(event);}} onPointerMove={event=>{if(pointerRef.current===event.pointerId)steerPointer(event);}} onPointerUp={event=>{if(pointerRef.current===event.pointerId)pointerRef.current=null;}} onPointerCancel={event=>{if(pointerRef.current===event.pointerId)pointerRef.current=null;}}><FlightScene challenge={challenge} speed={run.speed} progress={1-left/total} planeX={planeX} coinResolved={Boolean(run.coinResolved)}/>{run.lastResult==='collision'&&<span key={challenge.id} className="flight-crash" aria-hidden="true"/>}</div>
  </div>:<div className="flight-ready">
   {data?.lastResult&&<div className="flight-result"><strong>비행 종료</strong><span>{data.lastResult.distance.toLocaleString()}m · {data.lastResult.score.toLocaleString()}점</span><small>획득 코인 {data.lastResult.coins}개 · 점수에 각 1점 반영</small></div>}
   <div className="flight-ranking"><div><h2>비행 랭킹</h2><small>최고 {data?.bestDistance??0}m</small></div><ol>{(data?.ranking??[]).slice(0,expanded?10:3).map((entry,index)=><li key={entry.id}><b>{index+1}</b><Avatar kind="verb" profileId={entry.profileId} frameId={entry.frameId}/><span>{entry.name}</span><strong>{entry.distance.toLocaleString()}m</strong><small>{entry.score}점</small></li>)}</ol>{!data?.ranking.length&&<p>첫 비행 기록을 남겨보세요.</p>}{(data?.ranking.length??0)>3&&<button className="flight-more" onClick={()=>setExpanded(value=>!value)}>{expanded?'접기':'더보기'}</button>}{myRank>=10&&<p>내 순위 {myRank+1}위</p>}</div>
   <button className="flight-start" disabled={!connected} onClick={()=>{prepareMiniAudio();send('flightStart')}}>{data?.lastResult?'다시 비행':'시작'}</button>
  </div>}
 </section>;
}
