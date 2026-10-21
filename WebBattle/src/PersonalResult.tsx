import {CurrencyIcon} from './CurrencyIcon.js';
import {TierBadge} from './TierBadge.js';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ControlIcon} from './ControlIcon.js';
import {PixiResultCelebration} from './PixiResultCelebration.js';
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
 const [peopleOpen,setPeopleOpen]=useState(false);
 const won=room.winner===room.you&&!room.forfeiterId;
 const wallet=useRef<HTMLDivElement>(null),origin=useRef<HTMLDivElement>(null);
 useEffect(()=>{const start=setTimeout(()=>{setRating(player.rating);if(won)void scheduleScoreChimes(performance.now(),620,4);},420),end=setTimeout(()=>setPhase(p=>p==='rank'?'ready':p),1750);return()=>{clearTimeout(start);clearTimeout(end)}},[player.rating,won]);
 const reward=player.coinReward??0;
 useEffect(()=>{if(phase==='credited'&&reward>0)return scheduleScoreChimes(performance.now(),1000,12)},[phase,reward]);
 function collect(){if(phase!=='ready')return;playGameSfx('score');setPhase('flight')}
 function arrive(){setBalance(player.coins??0);setPhase('credited')}
 const winner=(room.resultPlayers??room.players).find(p=>p.id===room.winner)?.name??'상대';
 return <main className={`result result-stage ${won?'result-victory':'result-defeat'} result-${phase==='rank'?'intro':phase}`} onClick={collect}>
  {won&&<PixiResultCelebration/>}
  <button className="result-people-trigger" aria-label="함께한 플레이어 보기" aria-expanded={peopleOpen} onClick={event=>{event.stopPropagation();setPeopleOpen(open=>!open)}}><ControlIcon name="friends"/><span>참가자</span></button>
  <div className="result-wallet" ref={wallet} aria-label="내 재화" aria-hidden={phase==='rank'||phase==='ready'}>
   <span className="wallet-gold"><CurrencyIcon currency="coin"/><AnimatedNumber value={balance} duration={1100} testId="result-gold-balance"/></span>
   <span className="wallet-diamonds"><CurrencyIcon currency="diamond"/>{diamonds.toLocaleString()}<small>다이아</small></span>
  </div>
  <header className="result-heading"><small>{won?'우우웅!':'끼익…'}</small><h1>{room.forfeiterId===room.you?'패배':won?'승리!':room.winner==null?'무승부':'패배'}</h1><p>{room.winner==null?(room.forfeiterId===room.you?'항복으로 경기가 종료됐어요':'함께 마무리한 한 판'):won?'멋진 승리예요!':`${winner}의 승리`}</p></header>
  <section className={`result-rank ${player.ratingDelta<0?'rating-down':'rating-up'}`} aria-label="내 랭크">
   <TierBadge tier={leagueFor(player.rating).tier}/><span>{leagueFor(player.rating).label}</span>
   <strong><AnimatedNumber value={rating} duration={1400} testId="result-rating"/></strong>
   <small>{`${player.ratingDelta>=0?'+':''}${player.ratingDelta}`} </small>
   {player.ratingShield&&<div className="rating-shield" role="status"><img src="/brand-ui/rating-shield.png" alt=""/><b>보호막!</b><span>레이팅 감소 50%</span></div>}
  </section>
  <div className="result-gold-origin" ref={origin} aria-label={`획득 코인 ${reward}`}><CurrencyIcon currency="coin"/><b>+{reward.toLocaleString()}</b></div>
  <button className="result-tap" disabled={phase!=='ready'} onClick={e=>{e.stopPropagation();collect()}}>{phase==='rank'?'티어 결과를 정리 중…':phase==='ready'?'탭하여 골드 받기':phase==='flight'?'골드를 받는 중…':'보상 받음'}</button>
  <div className="result-actions" onClick={e=>e.stopPropagation()}><button className="primary" disabled={!connected||Boolean(room.custom&&player.rematch)} onClick={retry}>다시 하기</button><button className="secondary" disabled={!connected} onClick={home}>시작화면으로</button></div>
  {room.custom&&player.rematch&&<p className="result-wait" role="status">다른 플레이어를 기다리는 중</p>}
  {peopleOpen&&<section className="result-people-panel" role="dialog" aria-label="함께한 플레이어" onClick={event=>event.stopPropagation()}><header><b>함께한 플레이어</b><button aria-label="참가자 목록 닫기" onClick={()=>setPeopleOpen(false)}>×</button></header>{children}</section>}
  {phase==='flight'&&<PixiResultGold origin={origin} target={wallet} onArrival={arrive}/>}
 </main>;
}
