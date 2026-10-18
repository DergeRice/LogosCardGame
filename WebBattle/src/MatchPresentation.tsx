import {useEffect,useMemo,useState,type CSSProperties} from 'react';
import { CATALOG, RULES, type Kind, type RoomView, type PublicPlayer } from '../shared/rules.js';
import {leagueFor} from './hubModel.js';
import {useProfileImage} from './profiles.js';
import { ART } from './theme.js';
import {BASIC_SUPPLY_KINDS,BASIC_SUPPLY_COOLDOWN_MS,type BasicSupplyKind} from '../shared/basicSupply.js';
import './basic-supply.css';

export function Avatar({ kind, className = '' }: { kind: Kind; className?: string }) {
 const safeKind=CATALOG[kind]?kind:'pronoun';
 const src=useProfileImage(safeKind),[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[src]);
 if(src&&!failed)return <span className={`character-avatar ${className}`}><img src={src} onError={()=>setFailed(true)} alt={`${CATALOG[safeKind].name} 캐릭터 프로필`}/></span>;
 const c = CATALOG[safeKind];
 return <span className={`character-avatar ${className}`}><span role="img" aria-label={`${CATALOG[safeKind].name} 캐릭터 프로필`} style={{ backgroundImage: `url(${ART.sheet(c.sheet)})`, backgroundSize: `${ART.sheetWidth / ART.crop.width * 100}% ${ART.sheetHeight / ART.crop.height * 100}%`, backgroundPosition: `${ART.columns[c.col] / (ART.sheetWidth - ART.crop.width) * 100}% ${ART.rows[c.row] / (ART.sheetHeight - ART.crop.height) * 100}%` }}/></span>;
}
export function Profile({ player, mine = false }: { player: PublicPlayer; mine?: boolean }) {
 return <article className={`match-profile ${mine ? 'mine' : 'rival'}`}><Avatar kind={player.avatar}/><small>{mine ? 'YOU' : player.ai ? 'AI PLAYER' : 'PLAYER'}</small><h3>{player.name}</h3><span>{leagueFor(player.rating).label}</span></article>;
}
export function MatchPresentation({ room, now, cancel }: { room: RoomView; now: number; cancel: () => void }) {
 const me = room.players.find(p => p.id === room.you)!;
 if (room.phase === 'matching') { const humans=room.players.filter(p=>!p.ai);return <main className="match-screen"><div className="eyebrow">FINDING YOUR NEXT MATCH</div><h1>상대를 찾고 있어요<span className="matching-dots">…</span></h1><div className="matching-orbit"><Avatar kind={me.avatar}/></div><strong>{Math.max(0, Math.ceil((room.stageEndsAt - now) / 1000))}초 후 매칭 확정</strong><div className="matching-slots">{Array.from({ length: RULES.maxPlayers }, (_, i) => <span key={i}>{humans[i] ? <Avatar kind={humans[i].avatar}/> : '+'}</span>)}</div><button className="text-button" onClick={cancel}>매칭 취소</button></main>;}
 return <main className="match-screen versus-screen" key={room.matchId}><div className="eyebrow">MATCH FOUND · {room.players.length} PLAYERS</div><h1>매칭 성사!</h1><div className="versus-layout"><Profile player={me} mine/><strong className="vs-mark">VS</strong><div className="rival-profiles">{room.players.filter(p => p.id !== room.you).map((p, i) => <div key={p.id} style={{ '--arrival': `${1 + i * .35}s` } as CSSProperties}><Profile player={p}/></div>)}</div></div><p>하나의 덱. 다섯 장의 시작. 다음 최고점은 누구?</p></main>;
}
export function SharedDeck({ room, now, onApprove,onClaim,claimDisabled=false }: { room: RoomView; now: number; onApprove: () => void;onClaim?:(kind:BasicSupplyKind)=>void;claimDisabled?:boolean }) {
 const dealing=room.phase==='dealing', exhausted=room.deckCount<room.players.length,vote=room.drawVote;
 const approved=Boolean(vote?.approved.includes(room.you)),count=vote?.approved.length??0;
 const seconds=room.nextDealAt?Math.max(0,Math.ceil((room.nextDealAt-now)/1000)):0;
 const progress=room.nextDealAt&&room.dealIntervalMs?Math.min(100,Math.max(0,100*(1-(room.nextDealAt-now)/room.dealIntervalMs))):0;
 const gaugeRunning=room.phase==='battle'&&!room.decision&&!exhausted&&room.nextDealAt>now;
 // Keep the animation's keyframes and duration fixed while the one-second text clock updates.
 const fillTiming=useMemo(()=>{
  const start=room.nextDealAt&&room.dealIntervalMs?Math.min(1,Math.max(0,1-(room.nextDealAt-now)/room.dealIntervalMs)):0;
  return {'--gauge-start':start,'--gauge-duration':`${Math.max(0,room.nextDealAt-now)}ms`} as CSSProperties;
 },[room.nextDealAt,room.dealIntervalMs,gaugeRunning]);
 const canApprove=room.phase==='battle'&&!room.decision&&!exhausted&&Boolean(vote)&&!approved;
 const lastConsent=canApprove&&room.players.every(p=>p.id===room.you||vote!.approved.includes(p.id));
 const supplyAt=room.basicSupplyAt??0,supplyRemaining=Math.max(0,supplyAt-now),supplyRunning=supplyRemaining>0;
 const supplyTiming=useMemo(()=>({'--supply-start':1-Math.min(1,Math.max(0,(supplyAt-now)/BASIC_SUPPLY_COOLDOWN_MS)),'--supply-duration':`${Math.max(0,supplyAt-now)}ms`} as CSSProperties),[supplyAt,supplyRunning]);
 if(exhausted&&room.phase==='battle')return <section className="basic-supply" aria-label="덱 소진 기본 카드 받기" title="한 장을 받으면 다섯 버튼이 함께 30초 쿨타임에 들어갑니다.">{BASIC_SUPPLY_KINDS.map(kind=><button key={kind} aria-label={`${CATALOG[kind].name} 받기`} disabled={claimDisabled||Boolean(room.decision)||supplyRunning||!onClaim||(room.endsAt>0&&now>=room.endsAt)} onClick={()=>onClaim?.(kind)}><span key={supplyAt} className={`basic-supply-fill ${supplyRunning?'charging':'ready'}`} style={supplyTiming}/><span className="basic-supply-caption">{CATALOG[kind].name}<small>{supplyRunning?`${Math.ceil(supplyRemaining/1000)}초`:'+1장'}</small></span></button>)}</section>;
 return <section className={`draw-gauge compact-deck draw-request-control ${dealing?'initial-deal':''} ${exhausted?'exhausted':''}`} aria-label="카드 배분">
  <button className={`deck-charge-card deck-request-button ${canApprove?'awaiting-consent':''} ${lastConsent?'last-consent':''}`} disabled={!canApprove} onClick={onApprove} aria-label={canApprove?'카드 배분 동의':approved?'카드 배분 동의 완료':dealing?'배분 중':'카드 배분 대기'} title="전원이 동의하면 즉시 1장씩 배분"><span key={`${room.nextDealAt}-${gaugeRunning}`} className={`deck-request-fill ${gaugeRunning?'gauge-running':''}`} style={fillTiming}/><span className="deck-progress" role="progressbar" aria-label="자동 카드 배분까지" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}/><span className="deck-request-caption">{exhausted?'배분 완료':'카드 요청'}</span><span className="consent-people" aria-label={`${count}명 동의 · 전체 ${room.players.length}명`}>{room.players.map(p=><span key={p.id} className={`consent-person ${vote?.approved.includes(p.id)?'approved':''}`} aria-label={`${p.name} ${vote?.approved.includes(p.id)?'동의 완료':'동의 대기'}`} title={`${p.name} · ${vote?.approved.includes(p.id)?'동의 완료':'동의 대기'}`}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6" r="4"/><path d="M5 23v-6a7 7 0 0 1 14 0v6h-5v-5h-4v5Z"/></svg></span>)}</span>{!exhausted&&<small className="deck-seconds">{seconds}s</small>}</button>
  {room.dealSerial>0&&<div className="deal-flight" key={room.matchId+room.dealSerial}>{Array.from({length:room.players.length*(dealing?5:1)},(_,i)=><i key={i} style={{'--delay':`${i*.085}s`,'--dx':`${[-180,180,-80,80,-240,240][i%room.players.length]}px`,'--dy':`${i%2?-95:115}px`} as CSSProperties}>◇</i>)}</div>}
 </section>;
}





