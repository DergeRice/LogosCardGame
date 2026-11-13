import {useEffect,useMemo,useRef,useState} from 'react';
import type {MiniGameView} from '../shared/miniGame.js';
import type {FlightView} from '../shared/flightGame.js';
import {FlightPanel} from './FlightPanel.js';
import {Avatar} from './MatchPresentation.js';
import {playMiniAudio,preloadMiniAudio,preloadMiniClips,prepareMiniAudio,stopMiniAudio} from './miniAudio.js';
import {predictMiniRun,type MiniPendingPick} from './miniPrediction.js';
import {MiniComboBurst} from './MiniComboBurst.js';
import {MiniGameTitleArt} from './MiniGameTitleArt.js';
import './mini-game.css';

type Props={data:MiniGameView|null;flight:FlightView|null;connected:boolean;myId:string;send:(type:string,extra?:Record<string,unknown>)=>boolean};
type FlyingCard={serial:number;word:string;side:'left'|'right'};
export function MiniGamePanel({data,flight,connected,myId,send}:Props){
 const [open,setOpen]=useState(false),[clock,setClock]=useState(Date.now()),[pending,setPending]=useState<MiniPendingPick[]>([]);
 const [flightOpen,setFlightOpen]=useState(false);
 const [flying,setFlying]=useState<FlyingCard[]>([]),[comboBurst,setComboBurst]=useState({serial:0,value:0});
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
 useEffect(()=>{setFlying([]);setComboBurst({serial:0,value:0});},[run?.id]);
 useEffect(()=>()=>stopMiniAudio(),[]);
 const myRank=useMemo(()=>data?.ranking.findIndex(entry=>entry.id===myId)??-1,[data?.ranking,myId]);
 const choose=(side:'left'|'right')=>{if(!run||!shown?.card||!playing||locked||seconds<=0)return;const nextSeq=Math.max(seqRef.current,run.lastClientSeq??0)+1;seqRef.current=nextSeq;const pick:MiniPendingPick={runId:run.id,seq:nextSeq,cardId:shown.card.id,side,at:Date.now()+offset};if(!send('miniGameChoose',{runId:run.id,cardId:pick.cardId,side,seq:nextSeq}))return;const predicted=predictMiniRun(run,[...pending,pick]);setPending(old=>[...old,pick]);setFlying(old=>[...old.slice(-5),{serial:nextSeq,word:shown.card!.word,side}]);window.setTimeout(()=>setFlying(old=>old.filter(card=>card.serial!==nextSeq)),240);if(predicted.combo>=3&&predicted.combo>shown.combo)setComboBurst(old=>({serial:old.serial+1,value:predicted.combo}));};
 const countdownText=countdown>2500?'3':countdown>1500?'2':countdown>500?'1':'시작!';
 if(flightOpen)return <FlightPanel data={flight} connected={connected} myId={myId} send={send} onBack={()=>setFlightOpen(false)}/>;
 return <section className={`hub-page mini-page ${open?'mini-page-detail':''}`} aria-label="미니게임">
  {!open?<><header className="mini-heading"><small>MINI GAMES</small><h1>미니게임</h1></header><div className="hub-daily-mission"><strong>일일 미션</strong><span>코인 미션 준비 중</span></div><div className="mini-tiles"><button className="mini-tile mini-art-tile mini-verb-tile" aria-label="동사 분류 열기" onClick={()=>{setOpen(true);send('miniGameStatus')}}><MiniGameTitleArt game="verb" placement="entry"/></button><button className="mini-tile mini-art-tile mini-flight-tile" aria-label="불규칙 동사 플라이트 열기" onClick={()=>{setFlightOpen(true);send('flightStatus')}}><MiniGameTitleArt game="flight" placement="entry"/></button><div className="mini-tile mini-empty-tile"><span>03</span><strong>다음 게임</strong><small>준비 중</small></div></div></>:<div className="mini-detail">
   <header className="mini-detail-header"><button aria-label="미니게임 목록으로" onClick={()=>setOpen(false)}>←</button>{playing&&<div className="mini-time" aria-label={`남은 시간 ${seconds}초`}><small>남은 시간</small><strong>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</strong></div>}</header>
   {run&&shown?<div className="mini-game-stage">
    {playing&&<><div className="mini-combo-stage" role="status" aria-live="polite"><MiniComboBurst serial={comboBurst.serial}/>{shown.combo>=3&&<strong key={comboBurst.serial} className="mini-combo">Combo x{shown.combo}</strong>}</div><div className="mini-arena"><div className="mini-card-stack">{shown.upcoming.slice(0,2).reverse().map((card,index)=><div className={`mini-next-card mini-next-${index}`} key={card.id} aria-hidden="true"><span>{card.word}</span></div>)}{shown.card?<button key={shown.card.id} className="mini-word mini-word-enter" aria-label={`${shown.card.word} 발음 듣기`} onClick={()=>void playMiniAudio(shown.card!.word)}><span>{shown.card.word}</span><small>↗ 다시 듣기</small></button>:<div className="mini-word mini-between-pairs">다음 세트</div>}{flying.map(card=><div key={card.serial} className={`mini-flying-card mini-fly-${card.side}`} aria-hidden="true"><span>{card.word}</span></div>)}{locked&&shown.missedWord&&<div className="mini-wrong-card" aria-label={`오답 ${shown.missedWord}`}><span>{shown.missedWord}</span></div>}</div><div className="mini-sides"><button className="mini-side" disabled={!connected||locked||seconds<=0||!shown.card} onClick={()=>choose('left')}><strong>{run.left.label}</strong></button><button className="mini-side" disabled={!connected||locked||seconds<=0||!shown.card} onClick={()=>choose('right')}><strong>{run.right.label}</strong></button></div></div><p className="mini-feedback" aria-live="polite">{locked?shown.feedback??'':''}</p><div className="mini-current-score">{shown.correct}개</div></>}
    {!playing&&<div className="mini-countdown" aria-live="assertive"><div className="mini-countdown-pair"><span>{run.left.label}</span><b>VS</b><span>{run.right.label}</span></div><strong className="mini-countdown-number" key={countdownText}>{countdownText}</strong></div>}
   </div>:<><button className="mini-detail-title" aria-label="동사 분류 시작" disabled={!connected} onClick={()=>{prepareMiniAudio();send('miniGameStart')}}><MiniGameTitleArt game="verb" placement="ranking"/></button><div className="mini-ranking"><div className="mini-ranking-heading"><h2>시즌 랭킹</h2><small>최고 기록 {data?.best??0}개</small></div><ol>{data?.ranking.slice(0,10).map((entry,index)=><li key={entry.id} className={entry.id===myId?'me':''}><b>{index+1}</b><Avatar kind="verb" profileId={entry.profileId} frameId={entry.frameId}/><span>{entry.name}</span><strong>{entry.score}</strong></li>)}</ol>{myRank>=10&&<p>내 순위 {myRank+1}위 · {data?.ranking[myRank]?.score}개</p>}</div><div className="mini-launch"><button disabled={!connected} onClick={()=>{prepareMiniAudio();send('miniGameStart')}}>시작</button></div></>}
  </div>}
 </section>;
}
