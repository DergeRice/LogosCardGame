import {CurrencyIcon} from './CurrencyIcon.js';
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import type {RoomView} from '../shared/rules.js';
import {goRewardMultiplier} from '../shared/matchRewards.js';
import './go-decision.css';

export const GO_ART={referee:'/battle-art/go-referee.webp',success:'/battle-art/go-success.webp'};
export function GoDecision({room,now,connected,onChoice}:{room:RoomView;now:number;connected:boolean;onChoice:(choice:'go'|'stop')=>void}){
 const dialog=useRef<HTMLElement>(null),decision=room.decision!,own=decision.playerId===room.you;
 const achieved=Math.max(1,room.players.find(p=>p.id===decision.playerId)?.goHits??(decision.playerId===room.leaderId?room.goCount:1)),level=achieved+1,complete=achieved>=3;
 const name=room.players.find(p=>p.id===decision.playerId)?.name??'플레이어';
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null,shell=document.querySelector<HTMLElement>('.shell'),wasInert=shell?.inert;if(shell)shell.inert=true;dialog.current?.focus();
  const trap=(e:KeyboardEvent)=>{if(e.key!=='Tab')return;const items=Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);if(!items.length){e.preventDefault();dialog.current?.focus();return;}const i=items.indexOf(document.activeElement as HTMLButtonElement),next=e.shiftKey?(i<=0?items.length-1:i-1):(i+1)%items.length;e.preventDefault();items[next].focus();};
  addEventListener('keydown',trap);return()=>{removeEventListener('keydown',trap);if(shell)shell.inert=wasInert??false;if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[decision.id]);
 return createPortal(<div className={`decision-backdrop go-event ${own?'go-event-own':'go-event-observer'}`}><section ref={dialog} tabIndex={-1} className="go-event-dialog" role="dialog" aria-modal="true" aria-label={own?'고 스톱 선택':'게임 일시 정지'}>
  <div className="go-event-art"><img src={own?GO_ART.success:GO_ART.referee} alt={own?'득점을 축하하는 고양이와 호랑이':'일시 정지를 알리는 고양이 심판'}/></div>
  <div className="go-event-copy">
   <p className="go-event-kicker">{own?`${achieved}GO! 득점 성공`:'게임 일시 정지!'}</p>
   <h1 id="go-event-title">{own?(complete?'3GO 성공!':`${level}GO 도전하시겠습니까?`):`${name}님의 ${achieved}GO 득점!`}</h1>
   {own&&<>
    {!complete&&<p className="go-event-cards">전체 1장, <b>나만 2장 드로우!</b></p>}
    <p className="go-event-reward"><span>{complete?'3GO 승리 보상':`${level}GO 도전 승리 시`}</span><span className="go-event-reward-amount"><span className="go-gold"><CurrencyIcon currency="coin"/> 골드</span> · <span className="go-points">랭킹 포인트</span> <strong>{goRewardMultiplier(complete?achieved:level)}배!</strong></span></p>
    <p className="go-event-risk">고를 선택한 뒤 점수를 추월당하면 점수가 ÷2 됩니다.</p>
   </>}
   {decision.expiresAt>0&&<p className="go-event-time">{Math.max(0,Math.ceil((decision.expiresAt-now)/1000))}초</p>}
   {own&&<div className="go-actions">{!complete&&<button className="primary" disabled={!connected} onClick={()=>onChoice('go')}>{level}GO 도전</button>}<button className="secondary" disabled={!connected} onClick={()=>onChoice('stop')}>{complete?'보상 받기':'스톱'}</button></div>}
  </div>
 </section></div>,document.body);
}
