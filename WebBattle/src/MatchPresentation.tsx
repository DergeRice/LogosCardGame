import {useEffect,useState,type CSSProperties} from 'react';
import { CATALOG, RULES, type Kind, type RoomView, type PublicPlayer } from '../shared/rules.js';
import {useProfileImage} from './profiles.js';
import { ART } from './theme.js';

export function Avatar({ kind, className = '' }: { kind: Kind; className?: string }) {
 const safeKind=CATALOG[kind]?kind:'pronoun';
 const src=useProfileImage(safeKind),[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[src]);
 if(src&&!failed)return <span className={`character-avatar ${className}`}><img src={src} onError={()=>setFailed(true)} alt={`${CATALOG[safeKind].name} 캐릭터 프로필`}/></span>;
 const c = CATALOG[safeKind];
 return <span className={`character-avatar ${className}`}><span role="img" aria-label={`${CATALOG[safeKind].name} 캐릭터 프로필`} style={{ backgroundImage: `url(${ART.sheet(c.sheet)})`, backgroundSize: `${ART.sheetWidth / ART.crop.width * 100}% ${ART.sheetHeight / ART.crop.height * 100}%`, backgroundPosition: `${ART.columns[c.col] / (ART.sheetWidth - ART.crop.width) * 100}% ${ART.rows[c.row] / (ART.sheetHeight - ART.crop.height) * 100}%` }}/></span>;
}
export function Profile({ player, mine = false }: { player: PublicPlayer; mine?: boolean }) {
 return <article className={`match-profile ${mine ? 'mine' : 'rival'}`}><Avatar kind={player.avatar}/><small>{mine ? 'YOU' : player.ai ? 'AI PLAYER' : 'PLAYER'}</small><h3>{player.name}</h3><span>RATING {player.rating}</span></article>;
}
export function MatchPresentation({ room, now, cancel }: { room: RoomView; now: number; cancel: () => void }) {
 const me = room.players.find(p => p.id === room.you)!;
 if (room.phase === 'matching') { const humans=room.players.filter(p=>!p.ai);return <main className="match-screen"><div className="eyebrow">FINDING YOUR NEXT MATCH</div><h1>상대를 찾고 있어요<span className="matching-dots">…</span></h1><div className="matching-orbit"><Avatar kind={me.avatar}/></div><strong>{Math.max(0, Math.ceil((room.stageEndsAt - now) / 1000))}초 후 매칭 확정</strong><div className="matching-slots">{Array.from({ length: RULES.maxPlayers }, (_, i) => <span key={i}>{humans[i] ? <Avatar kind={humans[i].avatar}/> : '+'}</span>)}</div><p>기본 4인 · 빈자리는 AI · 최대 6인</p><button className="text-button" onClick={cancel}>매칭 취소</button></main>;}
 return <main className="match-screen versus-screen" key={room.matchId}><div className="eyebrow">MATCH FOUND · {room.players.length} PLAYERS</div><h1>매칭 성사!</h1><div className="versus-layout"><Profile player={me} mine/><strong className="vs-mark">VS</strong><div className="rival-profiles">{room.players.filter(p => p.id !== room.you).map((p, i) => <div key={p.id} style={{ '--arrival': `${1 + i * .35}s` } as CSSProperties}><Profile player={p}/></div>)}</div></div><p>하나의 덱. 다섯 장의 시작. 다음 최고점은 누구?</p></main>;
}
export function SharedDeck({ room, now, onApprove, onExtra }: { room: RoomView; now: number; onApprove: () => void; onExtra: () => void }) {
 const dealing=room.phase==='dealing', exhausted=room.deckCount<room.players.length,vote=room.drawVote;
 const approved=Boolean(vote?.approved.includes(room.you)),count=vote?.approved.length??0;
 const seconds=room.nextDealAt?Math.max(0,Math.ceil((room.nextDealAt-now)/1000)):0;
 const progress=room.nextDealAt&&room.dealIntervalMs?Math.min(100,Math.max(0,100*(1-(room.nextDealAt-now)/room.dealIntervalMs))):0;
 const canApprove=room.phase==='battle'&&!room.decision&&!exhausted&&Boolean(vote)&&!approved;
 const lastConsent=canApprove&&room.players.every(p=>p.id===room.you||vote!.approved.includes(p.id));
 const canExtra=room.phase==='battle'&&!room.decision&&!exhausted&&room.goCount>0&&room.leaderId===room.you;
 return <section className={`draw-gauge compact-deck draw-request-control ${dealing?'initial-deal':''} ${exhausted?'exhausted':''}`} aria-label="카드 배분">
  <button className={`deck-charge-card deck-request-button ${canApprove?'awaiting-consent':''} ${lastConsent?'last-consent':''}`} disabled={!canApprove} onClick={onApprove} aria-label={canApprove?'카드 배분 동의':approved?'카드 배분 동의 완료':dealing?'배분 중':'카드 배분 대기'} title="전원이 동의하면 즉시 1장씩 배분"><span className="deck-request-fill" style={{width:`${progress}%`}}/><span className="deck-progress" role="progressbar" aria-label="자동 카드 배분까지" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}/><strong>{count}/{room.players.length}</strong><span className="deck-request-caption">카드 요청 {exhausted?'':`${seconds}s`}</span></button>
  {canExtra&&<button className="leader-deal-button" onClick={onExtra}>카드 더 뿌리기</button>}
  {room.dealSerial>0&&<div className="deal-flight" key={room.matchId+room.dealSerial}>{Array.from({length:room.players.length*(dealing?5:1)},(_,i)=><i key={i} style={{'--delay':`${i*.085}s`,'--dx':`${[-180,180,-80,80,-240,240][i%room.players.length]}px`,'--dy':`${i%2?-95:115}px`} as CSSProperties}>◇</i>)}</div>}
 </section>;
}




