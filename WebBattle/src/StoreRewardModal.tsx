import {useEffect,useState,useRef} from 'react';
import type {StoreResult} from '../shared/community.js';
import {BOXES} from '../shared/store.js';
import {CosmeticArt} from './CosmeticArt.js';
import {PixiLootBox} from './PixiLootBox.js';
import {playGameSfx} from './gameSfx.js';
import './store-reveal.css';
const rare=(type:string)=>['character','background','frame'].includes(type);
export function StoreRewardModal({result,onClose,preview=false}:{result:StoreResult;onClose:()=>void;preview?:boolean}){
 const direct=result.source!=='box',box=BOXES.find(b=>b.id===result.box)??BOXES[0];
 const [phase,setPhase]=useState(direct?'direct':'opening'),[revealed,setRevealed]=useState<Set<number>>(()=>new Set()),[started,setStarted]=useState(false),[page,setPage]=useState(0);
 const running=useRef(false),timers=useRef<ReturnType<typeof setTimeout>[]>([]);
 useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
 useEffect(()=>{for(const url of new Set(result.rewards.map(r=>r.image).filter((x):x is string=>Boolean(x?.startsWith('/'))))){const image=new Image();image.src=url;void image.decode().catch(()=>{})}},[result]);
 function flipAll(){if(running.current)return;running.current=true;setStarted(true);playGameSfx('score',.24);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;setRevealed(new Set(result.rewards.flatMap((r,i)=>!rare(r.type)||reduced?[i]:[])));result.rewards.forEach((r,i)=>{if(!rare(r.type)||reduced)return;timers.current.push(setTimeout(()=>{if(i<10)playGameSfx('score',.2);setRevealed(old=>new Set([...old,i]))},850+(i%10)*65))});}
 const total=result.rewards.length,complete=revealed.size===total,pages=Math.ceil(total/10);
 return <div className="community-backdrop"><section className={`community-modal store-reward-modal ${direct?'direct-reward-modal':'box-reward-modal'}`} role="dialog" aria-modal="true" aria-label={direct?'구매 완료':'상자 결과'} data-phase={phase}>
  <h2>{direct?'구매 완료':phase==='opening'?`${box.name}을 여는 중`:complete?'모두 확인했어요':started?'특별한 선물이 열리고 있어요':'어떤 선물이 들어 있을까요?'}</h2>
  {preview&&<small>무료 연출 체험 · 재화 차감과 보상 저장 없음</small>}
  {direct?<div className="direct-rewards">{result.rewards.map((r,i)=><article key={i}><CosmeticArt image={r.image} name={r.name}/><b>{r.name}</b><small>보관함에 추가됐어요</small></article>)}</div>:phase==='opening'?<PixiLootBox box={box.id} onOpened={()=>{playGameSfx('score',.3);setPhase('cards')}}/>:<><small className="loot-reveal-count">{revealed.size} / {total}</small><div className="reward-card-grid">{result.rewards.slice(page*10,page*10+10).map((r,offset)=>{const i=page*10+offset,shown=revealed.has(i),charging=started&&!shown&&rare(r.type);return <button key={i} data-reward-index={i} data-loot-type={r.type} className={`reward-flip ${shown?'is-revealed':''} ${charging?'is-charging':''}`} aria-label={shown?`${i+1}번째 보상: ${r.name}`:`${i+1}번째 보상${charging?' 공개 대기':''}`} aria-pressed={shown} disabled><span className="reward-flip-inner"><span className="reward-card-back" aria-hidden="true"><i>✦</i><b>LOGOS</b><small>{i+1}</small></span><span className="reward-card-front" aria-hidden={!shown}>{shown&&<><CosmeticArt image={r.image} name={r.name}/><b>{r.name}</b><small>{r.duplicate?`중복 · 별가루 +${r.dust}`:r.type==='dust'?'별가루 획득':'새 치장 획득'}</small></>}</span></span></button>})}</div>{pages>1&&<nav className="loot-pages" aria-label="보상 페이지"><button onClick={()=>setPage(p=>p-1)} disabled={page===0} aria-label="이전 보상">‹</button><span>{page+1} / {pages}</span><button onClick={()=>setPage(p=>p+1)} disabled={page+1===pages} aria-label="다음 보상">›</button></nav>}</>}
  <div className="store-reward-actions">{!direct&&phase==='cards'&&!started&&<button className="hub-pill" onClick={flipAll}>전체 뒤집기</button>}<button className="hub-pill" onClick={onClose}>{direct||complete?'확인':'닫기'}</button></div>
 </section></div>;
}
