import {useEffect,useMemo,useRef,useState} from 'react';
import type {MiniGameView} from '../shared/miniGame.js';
import {Avatar} from './MatchPresentation.js';
import './mini-game.css';

type Props={data:MiniGameView|null;connected:boolean;myId:string;send:(type:string,extra?:Record<string,unknown>)=>boolean};
function say(text:string,lang:string){if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=lang;utterance.rate=lang==='en-US'?.95:1.05;window.speechSynthesis.speak(utterance);}
export function MiniGamePanel({data,connected,myId,send}:Props){
 const [open,setOpen]=useState(false),[clock,setClock]=useState(Date.now()),[picked,setPicked]=useState<'left'|'right'|null>(null);
 const expiryRequested=useRef(''),offset=useMemo(()=>(data?.serverNow??Date.now())-Date.now(),[data?.serverNow]),now=clock+offset,run=data?.run;
 const seconds=Math.max(0,Math.ceil(((run?.endsAt??now)-now)/1000));
 const locked=Boolean(run&&now<run.lockedUntil);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),100);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(open&&run)say(run.card.word,'en-US');},[open,run?.id,run?.card.id]);
 useEffect(()=>{if(!open||!run||seconds!==0||expiryRequested.current===run.id)return;expiryRequested.current=run.id;send('miniGameStatus');},[open,run?.id,seconds,send]);
 useEffect(()=>{setPicked(null);},[run?.card.id,run?.feedback]);
 useEffect(()=>()=>{if('speechSynthesis' in window)window.speechSynthesis.cancel();},[]);
 const myRank=useMemo(()=>data?.ranking.findIndex(r=>r.id===myId)??-1,[data?.ranking,myId]);
 const choose=(side:'left'|'right')=>{if(!run||locked||seconds<=0||picked)return;setPicked(side);if(!send('miniGameChoose',{runId:run.id,cardId:run.card.id,side}))setPicked(null);};
 return <section className="hub-page mini-page" aria-label="미니게임">
  <header className="mini-heading"><div><small>MINI GAMES</small><h1>미니게임</h1></div>{open&&<button className="hub-pill" onClick={()=>setOpen(false)}>목록</button>}</header>
  {!open?<div className="mini-tiles"><button className="mini-tile mini-verb-tile" onClick={()=>{setOpen(true);send('miniGameStatus')}}><span>01</span><strong>동사 분류</strong><small>두 카테고리 · 60초</small><b>플레이 →</b></button><div className="mini-tile mini-empty-tile"><span>02</span><strong>다음 게임</strong><small>준비 중</small></div><div className="mini-tile mini-empty-tile"><span>03</span><strong>다음 게임</strong><small>준비 중</small></div></div>:<div className="mini-detail">
   <div className="mini-scoreboard"><div><small>남은 시간</small><strong>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</strong></div><div><small>이번 기록</small><strong>{run?.correct??0}</strong></div><div><small>시즌 최고</small><strong>{data?.best??0}</strong></div></div>
   {run?<><div className="mini-timer"><span style={{width:`${Math.max(0,Math.min(100,((run.endsAt-now)/60000)*100))}%`}}/></div><div className="mini-arena"><button className="mini-side" disabled={!connected||locked||seconds<=0||Boolean(picked)} onClick={()=>choose('left')}><small>{run.left.line}라인</small><strong>{run.left.label}</strong></button><button className={`mini-word ${picked?`to-${picked}`:''}`} aria-label={`${run.card.word} 발음 듣기`} onClick={()=>say(run.card.word,'en-US')}><span>{run.card.word}</span><small>눌러서 다시 듣기</small></button><button className="mini-side" disabled={!connected||locked||seconds<=0||Boolean(picked)} onClick={()=>choose('right')}><small>{run.right.line}라인</small><strong>{run.right.label}</strong></button></div><p className="mini-feedback" aria-live="polite">{run.feedback??(locked?'잠시 후 다시 선택하세요.':'')}</p></>:<div className="mini-start"><p>1분 동안 단어를 빠르게 분류해 보세요. 단어를 누르면 발음을 다시 들을 수 있어요.</p><button disabled={!connected} onClick={()=>send('miniGameStart')}>60초 시작</button></div>}
   <div className="mini-ranking"><div><h2>시즌 랭킹</h2><small>{data?.season??''} 시작 · {data?new Date(data.seasonEndsAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric'}):''} 초기화</small></div><p>이번 시즌 최고 분류 수로 순위를 정합니다. 다음 시즌에는 모두 0부터 시작해요.</p><ol>{data?.ranking.slice(0,20).map((entry,index)=><li key={entry.id} className={entry.id===myId?'me':''}><b>{index+1}</b><Avatar kind="verb" profileId={entry.profileId} frameId={entry.frameId}/><span>{entry.name}</span><strong>{entry.score}</strong></li>)}</ol>{!data?.ranking.length&&<p>아직 기록이 없어요.</p>}{myRank>=20&&<p>내 순위 {myRank+1}위 · {data?.ranking[myRank]?.score}개</p>}</div>
  </div>}
 </section>;
}
