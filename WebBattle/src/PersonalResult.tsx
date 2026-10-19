import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {PublicPlayer,RoomView} from '../shared/rules.js';
import {leagueFor} from './hubModel.js';
import {AnimatedNumber} from './ScorePresentation.js';
import {scheduleScoreChimes,playGameSfx} from './gameSfx.js';
import {PixiResultGold} from './PixiResultGold.js';
import './result-presentation.css';

/** Rewards were already settled by the server; animation never grants currency. */
export function PersonalResult({player,room,diamonds=0,connected,retry,home,children}:{player:PublicPlayer;room:RoomView;diamonds?:number;connected:boolean;retry:()=>void;home:()=>void;children?:ReactNode}){
 const before=player.rating-player.ratingDelta;
 const [rating,setRating]=useState(before),[phase,setPhase]=useState<'rank'|'ready'|'flight'|'credited'>('rank');
 const [balance,setBalance]=useState(Math.max(0,(player.coins??0)-(player.coinReward??0)));
 const wallet=useRef<HTMLDivElement>(null),origin=useRef<HTMLDivElement>(null);
 useEffect(()=>{const start=setTimeout(()=>setRating(player.rating),180),end=setTimeout(()=>setPhase(p=>p==='rank'?'ready':p),1700);return()=>{clearTimeout(start);clearTimeout(end)}},[player.rating]);
 const reward=player.coinReward??0;
 useEffect(()=>{if(phase==='credited'&&reward>0)return scheduleScoreChimes(performance.now(),1000,12)},[phase,reward]);
 function collect(){if(phase==='rank'||phase==='ready')playGameSfx('score');setPhase(p=>p==='rank'||p==='ready'?'flight':p)}
 function arrive(){setBalance(player.coins??0);setPhase('credited')}
 const winner=(room.resultPlayers??room.players).find(p=>p.id===room.winner)?.name??'상대';
 return <main className={`result result-stage result-${phase==='rank'?'intro':phase}`} onClick={collect}>
  <div className="result-wallet" ref={wallet} aria-label="내 재화" aria-hidden={phase==='rank'||phase==='ready'}>
   <span className="wallet-gold"><i aria-hidden="true">●</i><AnimatedNumber value={balance} duration={1100} testId="result-gold-balance"/><small>골드</small></span>
   <span className="wallet-diamonds"><i aria-hidden="true">◆</i>{diamonds.toLocaleString()}<small>다이아</small></span>
  </div>
  <header className="result-heading"><h1>{room.winner===room.you?'승리':room.winner==null?'무승부':'패배'}</h1><p>{room.winner==null?'함께 마무리한 한 판':`${winner}의 승리!`}</p></header>
  <section className={`result-rank ${player.ratingDelta<0?'rating-down':'rating-up'}`} aria-label="내 랭크">
   <span>{leagueFor(player.rating).label}</span>
   <strong><AnimatedNumber value={rating} duration={1400} testId="result-rating"/></strong>
   <small>{`${player.ratingDelta>=0?'+':''}${player.ratingDelta}`} </small>
  </section>
  <div className="result-gold-origin" ref={origin} aria-label={`획득 골드 ${reward}`}><i aria-hidden="true">●</i><b>+{reward.toLocaleString()}</b><span>골드</span></div>
  <button className="result-tap" disabled={phase==='flight'||phase==='credited'} onClick={e=>{e.stopPropagation();collect()}}>{phase==='credited'?'보상 받음':phase==='flight'?'':'탭하여 보상 받기'}</button>
  <div className="result-actions" onClick={e=>e.stopPropagation()}><button className="primary" disabled={!connected||Boolean(room.custom&&player.rematch)} onClick={retry}>다시 하기</button><button className="secondary" disabled={!connected} onClick={home}>시작화면으로</button></div>
  {room.custom&&player.rematch&&<p className="result-wait" role="status">다른 플레이어를 기다리는 중</p>}
  <div className="result-companions" onClick={e=>e.stopPropagation()}>{children}</div>
  {phase==='flight'&&<PixiResultGold origin={origin} target={wallet} onArrival={arrive}/>}
 </main>;
}
