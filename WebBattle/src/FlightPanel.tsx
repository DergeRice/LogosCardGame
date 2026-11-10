import {useEffect,useMemo,useRef,useState} from 'react';
import type {FlightLane,FlightView} from '../shared/flightGame.js';
import {flightWindow} from '../shared/flightGame.js';
import {Avatar} from './MatchPresentation.js';
import {FlightScene} from './FlightScene.js';
import {playMiniAudio,preloadMiniAudio,preloadMiniClips,prepareMiniAudio,stopMiniAudio} from './miniAudio.js';
import {unlockGameAudio} from './exampleAudio.js';
import './flight-game.css';

type Props={data:FlightView|null;connected:boolean;myId:string;send:(type:string,extra?:Record<string,unknown>)=>boolean;onBack:()=>void};
function ding(){const audio=unlockGameAudio();if(!audio)return;const tone=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime;tone.type='sine';tone.frequency.setValueAtTime(650,time);tone.frequency.exponentialRampToValueAtTime(980,time+.12);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.16,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+.24);tone.connect(gain).connect(audio.destination);tone.start(time);tone.stop(time+.25);}
function crash(){const audio=unlockGameAudio();if(!audio)return;const tone=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime;tone.type='sawtooth';tone.frequency.setValueAtTime(180,time);tone.frequency.exponentialRampToValueAtTime(65,time+.24);gain.gain.setValueAtTime(.08,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.28);tone.connect(gain).connect(audio.destination);tone.start(time);tone.stop(time+.28);}
export function FlightPanel({data,connected,myId,send,onBack}:Props){
 const [clock,setClock]=useState(Date.now()),[selected,setSelected]=useState<FlightLane|null>(null),[expanded,setExpanded]=useState(false);
 const requestRef=useRef(''),playedRef=useRef(''),soundTimer=useRef<number|undefined>(undefined),selectedAt=useRef(0);
 const offset=useMemo(()=>(data?.serverNow??Date.now())-Date.now(),[data?.serverNow]),run=data?.run,challenge=run?.challenge,verb=run?.verb;
 const left=Math.max(0,(challenge?.deadline??0)-(clock+offset)),total=run?flightWindow(run.speed):3200;
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),50);return()=>{clearInterval(timer);stopMiniAudio();clearTimeout(soundTimer.current);};},[]);
 useEffect(()=>{void preloadMiniAudio().catch(()=>{});},[]);
 useEffect(()=>{if(!challenge||!run)return;const reset=window.setTimeout(()=>setSelected(null),Math.max(0,220-(Date.now()-selectedAt.current)));if(run.lastResult==='collision')crash();if(challenge.kind==='approach'){
  const current=`${run.id}:${challenge.id}`;if(playedRef.current===current)return;playedRef.current=current;
  preloadMiniClips([verb!.base,...(run.lastWord?[run.lastWord]:[])]);
  if(run.lastResult==='correct'&&run.lastWord){ding();void playMiniAudio(run.lastWord);soundTimer.current=window.setTimeout(()=>void playMiniAudio(verb!.base),650);}else void playMiniAudio(verb!.base);
 }return()=>clearTimeout(reset);},[run?.id,challenge?.id]);
 useEffect(()=>{if(!challenge||left>0||selected)return;const key=`${run!.id}:${challenge.id}`;if(requestRef.current===key)return;requestRef.current=key;send('flightStatus');},[challenge?.id,left,selected,send]);
 const choose=(side:FlightLane)=>{if(!connected||!run||!challenge||selected||left<=0)return;prepareMiniAudio();selectedAt.current=Date.now();setSelected(side);send('flightChoose',{runId:run.id,challengeId:challenge.id,side});};
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==='ArrowLeft'||event.key==='a'){event.preventDefault();choose('left');}if(event.key==='ArrowRight'||event.key==='d'){event.preventDefault();choose('right');}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 const myRank=data?.ranking.findIndex(item=>item.id===myId)??-1;
 return <section className="hub-page flight-page" aria-label="불규칙 동사 플라이트">
  <header className="flight-header"><button aria-label="미니게임 목록으로" onClick={onBack}>←</button>{run?<strong className="flight-hearts" aria-label={`남은 하트 ${run.hearts}개`}>{Array.from({length:3},(_,i)=><span key={i} className={i<run.hearts?'':'spent'}>♥</span>)}</strong>:null}<h1>불규칙 동사 플라이트</h1></header>
  {run&&challenge&&verb?<div className="flight-play">
   <div className="flight-hud"><span><small>거리</small><b>{run.distance.toLocaleString()}m</b></span><span><small>점수</small><b>{run.score.toLocaleString()}</b></span><span><small>속도</small><b>x{run.speed.toFixed(1)}</b></span></div>
   <div className="flight-question"><small>{verb.meaning}</small><strong>{verb.base[0].toUpperCase()+verb.base.slice(1)}의 {run.stage==='past'?'과거형':'과거분사'}</strong></div>
   <div className="flight-timer" aria-label={`게이트까지 ${Math.ceil(left/1000)}초`}><span style={{width:`${Math.max(0,Math.min(100,left/total*100))}%`}}/></div>
   <div className="flight-field"><FlightScene challenge={challenge} speed={run.speed} selected={selected}/>{run.lastResult==='collision'&&<span key={challenge.id} className="flight-crash" aria-hidden="true"/>}<div className="flight-gates" role="group" aria-label={challenge.kind==='gate'?'정답 게이트 선택':'비행 경로 선택'}>{(['left','right'] as const).map(side=><button key={`${challenge.id}-${side}`} className={`flight-gate ${challenge.kind==='approach'?'approach':''} ${selected===side?'chosen':''}`} disabled={!connected||Boolean(selected)||left<=0} onClick={()=>choose(side)} aria-label={`${side==='left'?'왼쪽':'오른쪽'} ${challenge[side]}`}><span>{challenge.kind==='approach'?(challenge[side]==='코인'?'🪙':'⚠️'):challenge[side]}</span></button>)}</div></div>
   <p className="flight-hint">{challenge.kind==='approach'?'장애물을 피하고 코인을 지나가세요':'정답 게이트로 비행하세요'}</p>
  </div>:<div className="flight-ready">
   {data?.lastResult&&<div className="flight-result"><strong>비행 종료</strong><span>{data.lastResult.distance.toLocaleString()}m · {data.lastResult.score.toLocaleString()}점</span><small>획득 코인 {data.lastResult.coins}개 · 점수에 각 1점 반영</small></div>}
   <div className="flight-ranking"><div><h2>비행 랭킹</h2><small>최고 {data?.bestDistance??0}m</small></div><ol>{(data?.ranking??[]).slice(0,expanded?10:3).map((entry,index)=><li key={entry.id}><b>{index+1}</b><Avatar kind="verb" profileId={entry.profileId} frameId={entry.frameId}/><span>{entry.name}</span><strong>{entry.distance.toLocaleString()}m</strong><small>{entry.score}점</small></li>)}</ol>{!data?.ranking.length&&<p>첫 비행 기록을 남겨보세요.</p>}{(data?.ranking.length??0)>3&&<button className="flight-more" onClick={()=>setExpanded(value=>!value)}>{expanded?'접기':'더보기'}</button>}{myRank>=10&&<p>내 순위 {myRank+1}위</p>}</div>
   <button className="flight-start" disabled={!connected} onClick={()=>{prepareMiniAudio();send('flightStart')}}>{data?.lastResult?'다시 비행':'시작'}</button>
  </div>}
 </section>;
}
