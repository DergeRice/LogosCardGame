import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import type {RoomView} from '../shared/rules.js';
import {goRewardMultiplier} from '../shared/matchRewards.js';
import './go-decision.css';

export const GO_ART={referee:'/battle-art/go-referee.webp',success:'/battle-art/go-success.webp'};
export function GoDecision({room,now,connected,onChoice}:{room:RoomView;now:number;connected:boolean;onChoice:(choice:'go'|'stop')=>void}){
 const dialog=useRef<HTMLElement>(null),decision=room.decision!,own=decision.playerId===room.you;
 const level=decision.playerId===room.leaderId?room.goCount+1:1;
 const name=room.players.find(p=>p.id===decision.playerId)?.name??'플레이어';
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null,shell=document.querySelector<HTMLElement>('.shell'),wasInert=shell?.inert;if(shell)shell.inert=true;dialog.current?.focus();
  const trap=(e:KeyboardEvent)=>{if(e.key!=='Tab')return;const items=Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);if(!items.length){e.preventDefault();dialog.current?.focus();return;}const i=items.indexOf(document.activeElement as HTMLButtonElement),next=e.shiftKey?(i<=0?items.length-1:i-1):(i+1)%items.length;e.preventDefault();items[next].focus();};
  addEventListener('keydown',trap);return()=>{removeEventListener('keydown',trap);if(shell)shell.inert=wasInert??false;if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[decision.id]);
 return createPortal(<div className={`decision-backdrop go-event ${own?'go-event-own':'go-event-observer'}`}><section ref={dialog} tabIndex={-1} className="go-event-dialog" role="dialog" aria-modal="true" aria-label={own?'고 스톱 선택':'게임 일시 정지'}>
  <div className="go-event-art"><img src={own?GO_ART.success:GO_ART.referee} alt={own?'득점을 축하하는 고양이와 호랑이':'일시 정지를 알리는 고양이 심판'}/></div>
  <div className="go-event-copy">
   <p className="go-event-kicker">{own?(level===3?'2고 득점 획득!!!':'득점 성공!!!'):'게임 일시 정지!'}</p>
   <h1 id="go-event-title">{own?`${level}고 도전${level===3?'!!?':'?!'}`:<>{name}님의 득점!</>}</h1>
   {own?<>
    <p className="go-event-cards">{level>=2?'나 카드 2장 획득 + 나머지 각 1장':'나 포함 모두 카드 1장 획득'}</p>
    <div className="go-event-reward"><span>승리 시 골드 · 포인트 보상</span><strong>{goRewardMultiplier(level)}배!!!</strong></div>
    <p className="go-event-benefit">{level===1?'다음 문장 +3점':level===2?'다음 문장 +6점':'다음 문장 점수 ×2'} · 고 선택 시 적용</p>
    <p className="go-event-warning">추월당하면 현재 점수 ½ · 남은 덱만큼 카드 지급</p>
   </>:<p className="go-event-wait">고 / 스톱을 선택하고 있어요.<br/>선택이 끝나면 경기가 이어집니다.</p>}
   {decision.expiresAt>0&&<p className="go-event-time">선택까지 <b>{Math.max(0,Math.ceil((decision.expiresAt-now)/1000))}초</b></p>}
   {own&&<><div className="go-actions"><button className="primary" disabled={!connected||level>3} onClick={()=>onChoice('go')}>{level}고 도전!</button><button className="secondary" disabled={!connected} onClick={()=>onChoice('stop')}>스톱! 보상 받기</button></div><small>선택 시간이 지나면 자동 스톱합니다</small></>}
  </div>
 </section></div>,document.body);
}
