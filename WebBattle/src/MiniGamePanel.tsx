import {useEffect,useMemo,useRef,useState} from 'react';
import type {MiniGameView} from '../shared/miniGame.js';
import {Avatar} from './MatchPresentation.js';
import './mini-game.css';

type Props={data:MiniGameView|null;connected:boolean;myId:string;send:(type:string,extra?:Record<string,unknown>)=>boolean};
function say(word:string){if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(word);utterance.lang='en-US';utterance.rate=.95;window.speechSynthesis.speak(utterance);}
export function MiniGamePanel({data,connected,myId,send}:Props){
 const [open,setOpen]=useState(false),[expanded,setExpanded]=useState(false),[clock,setClock]=useState(Date.now()),[picked,setPicked]=useState<'left'|'right'|null>(null);
 const expiryRequested=useRef(''),offset=useMemo(()=>(data?.serverNow??Date.now())-Date.now(),[data?.serverNow]),now=clock+offset,run=data?.run;
 const startsAt=run?.startsAt??now,countdown=run?Math.max(0,startsAt-now):0,playing=Boolean(run&&countdown===0);
 const seconds=run?Math.max(0,Math.ceil((run.endsAt-Math.max(now,startsAt))/1000)):60;
 const locked=Boolean(run&&now<run.lockedUntil);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),100);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(open&&playing&&run)say(run.card.word);},[open,playing,run?.id,run?.card.id]);
 useEffect(()=>{if(!open||!run||seconds!==0||expiryRequested.current===run.id)return;expiryRequested.current=run.id;send('miniGameStatus');},[open,run?.id,seconds,send]);
 useEffect(()=>{setPicked(null);},[run?.card.id,run?.feedback]);
 useEffect(()=>()=>{if('speechSynthesis' in window)window.speechSynthesis.cancel();},[]);
 const myRank=useMemo(()=>data?.ranking.findIndex(entry=>entry.id===myId)??-1,[data?.ranking,myId]);
 const choose=(side:'left'|'right')=>{if(!run||!playing||locked||seconds<=0||picked)return;setPicked(side);if(!send('miniGameChoose',{runId:run.id,cardId:run.card.id,side}))setPicked(null);};
 const countdownText=countdown>2500?'3':countdown>1500?'2':countdown>500?'1':'시작!';
 return <section className={`hub-page mini-page ${open?'mini-page-detail':''}`} aria-label="미니게임">
  {!open?<><header className="mini-heading"><small>MINI GAMES</small><h1>미니게임</h1></header><div className="hub-daily-mission"><strong>일일 미션</strong><span>코인 미션 준비 중</span></div><div className="mini-tiles"><button className="mini-tile mini-verb-tile" onClick={()=>{setExpanded(false);setOpen(true);send('miniGameStatus')}}><span>01</span><strong>동사 분류</strong><small>두 카테고리 · 60초</small><b>플레이 →</b></button><div className="mini-tile mini-empty-tile"><span>02</span><strong>다음 게임</strong><small>준비 중</small></div><div className="mini-tile mini-empty-tile"><span>03</span><strong>다음 게임</strong><small>준비 중</small></div></div></>:<div className="mini-detail">
   <header className="mini-detail-header"><button aria-label="미니게임 목록으로" onClick={()=>setOpen(false)}>←</button>{playing&&<div className="mini-time" aria-label={`남은 시간 ${seconds}초`}><small>남은 시간</small><strong>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</strong></div>}</header>
   {run?<div className="mini-game-stage">
    {playing&&<><div className="mini-arena"><button className="mini-side" disabled={!connected||locked||seconds<=0||Boolean(picked)} onClick={()=>choose('left')}><small>{run.left.line}라인</small><strong>{run.left.label}</strong></button><div className="mini-card-stack"><button className={`mini-word ${picked?`to-${picked}`:''}`} aria-label={`${run.card.word} 발음 듣기`} onClick={()=>say(run.card.word)}><span>{run.card.word}</span><small>↗ 다시 듣기</small></button></div><button className="mini-side" disabled={!connected||locked||seconds<=0||Boolean(picked)} onClick={()=>choose('right')}><small>{run.right.line}라인</small><strong>{run.right.label}</strong></button></div><p className="mini-feedback" aria-live="polite">{run.feedback??''}</p><div className="mini-current-score">{run.correct}개</div></>}
    {!playing&&<div className="mini-countdown" aria-live="assertive" key={countdownText}>{countdownText}</div>}
   </div>:<><div className="mini-ranking"><div className="mini-ranking-heading"><h2>시즌 랭킹</h2><small>최고 기록 {data?.best??0}개</small></div><ol>{Array.from({length:expanded?10:3},(_,index)=>{const entry=data?.ranking[index];return <li key={entry?.id??`empty-${index}`} className={entry?.id===myId?'me':''}><b>{index+1}</b>{entry?<Avatar kind="verb" profileId={entry.profileId} frameId={entry.frameId}/>:<span className="mini-empty-rank-avatar"/>}<span>{entry?.name??'—'}</span><strong>{entry?.score??'—'}</strong></li>})}</ol>{(data?.ranking.length??0)>3&&<button className="mini-ranking-more" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'접기':'더보기'}</button>}{myRank>=10&&<p>내 순위 {myRank+1}위 · {data?.ranking[myRank]?.score}개</p>}</div><div className="mini-launch"><button disabled={!connected} onClick={()=>send('miniGameStart')}>시작</button></div></>}
  </div>}
 </section>;
}
