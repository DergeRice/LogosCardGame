import {useEffect,useMemo,useRef,useState} from 'react';
import type {MiniGameView} from '../shared/miniGame.js';
import {Avatar} from './MatchPresentation.js';
import {playMiniAudio,preloadMiniAudio,preloadMiniClips,prepareMiniAudio,stopMiniAudio} from './miniAudio.js';
import {predictMiniRun,type MiniPendingPick} from './miniPrediction.js';
import './mini-game.css';

type Props={data:MiniGameView|null;connected:boolean;myId:string;send:(type:string,extra?:Record<string,unknown>)=>boolean};
export function MiniGamePanel({data,connected,myId,send}:Props){
 const [open,setOpen]=useState(false),[expanded,setExpanded]=useState(false),[clock,setClock]=useState(Date.now()),[pending,setPending]=useState<MiniPendingPick[]>([]);
 const expiryRequested=useRef(''),seqRef=useRef(0),offset=useMemo(()=>(data?.serverNow??Date.now())-Date.now(),[data?.serverNow]),now=clock+offset,run=data?.run,shown=run?predictMiniRun(run,pending):null;
 const startsAt=run?.startsAt??now,countdown=run?Math.max(0,startsAt-now):0,playing=Boolean(run&&countdown===0);
 const seconds=run?Math.max(0,Math.ceil((run.endsAt-Math.max(now,startsAt))/1000)):60;
 const locked=Boolean(shown&&now<shown.lockedUntil);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),100);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(open)void preloadMiniAudio().catch(()=>{});},[open]);
 useEffect(()=>{if(open&&run)preloadMiniClips(run.audioWords??[run.card.word,...(run.upcoming??[]).map(card=>card.word)]);},[open,run?.id,run?.card.id]);
 useEffect(()=>{if(locked)stopMiniAudio();},[locked]);
 useEffect(()=>{if(open&&playing&&shown?.card&&!locked)void playMiniAudio(shown.card.word);},[open,playing,locked,run?.id,shown?.card?.id]);
 useEffect(()=>{if(!open||!run||seconds!==0||expiryRequested.current===run.id)return;expiryRequested.current=run.id;send('miniGameStatus');},[open,run?.id,seconds,send]);
 useEffect(()=>{setPending(old=>old.filter(pick=>pick.runId===run?.id&&pick.seq>(run?.lastClientSeq??0)));},[run?.id,run?.lastClientSeq]);
 useEffect(()=>()=>stopMiniAudio(),[]);
 const myRank=useMemo(()=>data?.ranking.findIndex(entry=>entry.id===myId)??-1,[data?.ranking,myId]);
 const choose=(side:'left'|'right')=>{if(!run||!shown?.card||!playing||locked||seconds<=0)return;const nextSeq=Math.max(seqRef.current,run.lastClientSeq??0)+1;seqRef.current=nextSeq;const pick:MiniPendingPick={runId:run.id,seq:nextSeq,cardId:shown.card.id,side,at:Date.now()+offset};if(send('miniGameChoose',{runId:run.id,cardId:pick.cardId,side,seq:nextSeq}))setPending(old=>[...old,pick]);};
 const countdownText=countdown>2500?'3':countdown>1500?'2':countdown>500?'1':'시작!';
 return <section className={`hub-page mini-page ${open?'mini-page-detail':''}`} aria-label="미니게임">
  {!open?<><header className="mini-heading"><small>MINI GAMES</small><h1>미니게임</h1></header><div className="hub-daily-mission"><strong>일일 미션</strong><span>코인 미션 준비 중</span></div><div className="mini-tiles"><button className="mini-tile mini-verb-tile" onClick={()=>{setExpanded(false);setOpen(true);send('miniGameStatus')}}><span>01</span><strong>동사 분류</strong><small>두 카테고리 · 60초</small><b>플레이 →</b></button><div className="mini-tile mini-empty-tile"><span>02</span><strong>다음 게임</strong><small>준비 중</small></div><div className="mini-tile mini-empty-tile"><span>03</span><strong>다음 게임</strong><small>준비 중</small></div></div></>:<div className="mini-detail">
   <header className="mini-detail-header"><button aria-label="미니게임 목록으로" onClick={()=>setOpen(false)}>←</button>{playing&&<div className="mini-time" aria-label={`남은 시간 ${seconds}초`}><small>남은 시간</small><strong>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</strong></div>}</header>
   {run&&shown?<div className="mini-game-stage">
    {playing&&<><div className="mini-arena"><div className="mini-card-stack">{shown.upcoming.slice(0,2).reverse().map((card,index)=><div className={`mini-next-card mini-next-${index}`} key={card.id} aria-hidden="true"><span>{card.word}</span></div>)}{shown.card?<button key={shown.card.id} className="mini-word" aria-label={`${shown.card.word} 발음 듣기`} onClick={()=>void playMiniAudio(shown.card!.word)}>{shown.combo>=3&&<span className="mini-combo" role="status">Combo x{shown.combo}</span>}<span>{shown.card.word}</span><small>↗ 다시 듣기</small></button>:<div className="mini-word mini-between-pairs">다음 세트</div>}{locked&&shown.missedWord&&<div className="mini-wrong-card" aria-label={`오답 ${shown.missedWord}`}><span>{shown.missedWord}</span></div>}</div><div className="mini-sides"><button className="mini-side" disabled={!connected||locked||seconds<=0||!shown.card} onClick={()=>choose('left')}><strong>{run.left.label}</strong></button><button className="mini-side" disabled={!connected||locked||seconds<=0||!shown.card} onClick={()=>choose('right')}><strong>{run.right.label}</strong></button></div></div><p className="mini-feedback" aria-live="polite">{locked?shown.feedback??'':''}</p><div className="mini-current-score">{shown.correct}개</div></>}
    {!playing&&<div className="mini-countdown" aria-live="assertive"><div className="mini-countdown-pair"><span>{run.left.label}</span><b>VS</b><span>{run.right.label}</span></div><strong className="mini-countdown-number" key={countdownText}>{countdownText}</strong></div>}
   </div>:<><div className="mini-ranking"><div className="mini-ranking-heading"><h2>시즌 랭킹</h2><small>최고 기록 {data?.best??0}개</small></div><ol>{Array.from({length:expanded?10:3},(_,index)=>{const entry=data?.ranking[index];return <li key={entry?.id??`empty-${index}`} className={entry?.id===myId?'me':''}><b>{index+1}</b>{entry?<Avatar kind="verb" profileId={entry.profileId} frameId={entry.frameId}/>:<span className="mini-empty-rank-avatar"/>}<span>{entry?.name??'—'}</span><strong>{entry?.score??'—'}</strong></li>})}</ol>{(data?.ranking.length??0)>3&&<button className="mini-ranking-more" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'접기':'더보기'}</button>}{myRank>=10&&<p>내 순위 {myRank+1}위 · {data?.ranking[myRank]?.score}개</p>}</div><div className="mini-launch"><button disabled={!connected} onClick={()=>{prepareMiniAudio();send('miniGameStart')}}>시작</button></div></>}
  </div>}
 </section>;
}
