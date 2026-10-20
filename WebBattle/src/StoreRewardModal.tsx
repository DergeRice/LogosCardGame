import {createPortal} from 'react-dom';
import {useMemo} from 'react';
import {orderedLoot,revealPlan,lootTier,LOOT_TIERS} from '../shared/lootReveal.js';
import {PixiRewardEffects} from './PixiRewardEffects.js';
import {DUST_IMAGE} from '../shared/art.js';
import {useEffect,useState,useRef} from 'react';
import type {StoreResult} from '../shared/community.js';
import {BOXES} from '../shared/store.js';
import {CosmeticArt} from './CosmeticArt.js';
import {PixiLootBox} from './PixiLootBox.js';
import {playGameSfx} from './gameSfx.js';
import './store-reveal.css';

export function StoreRewardModal({result,onClose}:{result:StoreResult;onClose:()=>void;preview?:boolean}){
 const direct=result.source!=='box',box=BOXES.find(b=>b.id===result.box)??BOXES[0];
 const [phase,setPhase]=useState(direct?'direct':'opening'),[revealed,setRevealed]=useState<Set<number>>(()=>new Set()),[started,setStarted]=useState(false),[page,setPage]=useState(0);
 const ordered=useMemo(()=>orderedLoot(result.rewards).map(p=>p.reward),[result]),batch=useMemo(()=>ordered.slice(page*10,page*10+10),[ordered,page]),grid=useRef<HTMLDivElement>(null),[startedAt,setStartedAt]=useState(0);
 const running=useRef(false),timers=useRef<ReturnType<typeof setTimeout>[]>([]);
 useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
 useEffect(()=>{for(const url of new Set(result.rewards.map(r=>r.image).filter((x):x is string=>Boolean(x?.startsWith('/'))))){const image=new Image();image.src=url;void image.decode().catch(()=>{})}},[result]);
 function flipAll(){if(running.current)return;running.current=true;setStarted(true);setStartedAt(performance.now());playGameSfx('score',.24);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;for(const p of revealPlan(batch)){const i=page*10+p.index;timers.current.push(setTimeout(()=>{if(!document.hidden)playGameSfx('score',.2);setRevealed(old=>new Set([...old,i]));},reduced?0:p.reveal));}}
 function nextBatch(){if(!batch.every((_,i)=>revealed.has(page*10+i)))return;running.current=false;setStarted(false);setStartedAt(0);setPage(p=>p+1);setPhase('opening');}
 const total=result.rewards.length,complete=revealed.size===total,pages=Math.ceil(total/10),batchComplete=batch.every((_,i)=>revealed.has(page*10+i)),localRevealed=new Set(batch.flatMap((_,i)=>revealed.has(page*10+i)?[i]:[]));
 return createPortal(<div className="community-backdrop"><section className={`community-modal store-reward-modal ${direct?'direct-reward-modal':'box-reward-modal'}`} role="dialog" aria-modal="true" aria-label={direct?'구매 완료':'상자 결과'} data-phase={phase}>
  <h2>{direct?'구매 완료':phase==='opening'?`${box.name}을 여는 중`:complete?'상자 결과':started?'공개 중':'상자 결과'}</h2>
  {direct?<div className="direct-rewards">{result.rewards.map((r,i)=><article key={i}><CosmeticArt image={r.type==='dust'?DUST_IMAGE:r.image} name={r.name}/>{r.type==='dust'?<b>{r.dust??0}</b>:direct&&r.type!=='frame'?<b>{r.name}</b>:null}<small>보관함에 추가됐어요</small></article>)}</div>:phase==='opening'?<PixiLootBox box={box.id} onOpened={()=>{playGameSfx('score',.3);setPhase('cards')}}/>:<><small className="loot-reveal-count">{revealed.size} / {total}</small><div className="reward-grid-stage"><div ref={grid} className="reward-card-grid">{batch.map((r,offset)=>{const i=page*10+offset,shown=revealed.has(i),charging=started&&!shown;return <button key={i} data-reward-index={i} data-loot-type={r.type} data-loot-tier={lootTier(r.type)} data-halo={lootTier(r.type)>=2} className={`reward-flip ${shown?'is-revealed':''} ${charging?'is-charging':''}`} aria-label={shown?`${i+1}번째 보상: ${r.name}`:`${i+1}번째 보상${charging?' 공개 대기':''}`} aria-pressed={shown} disabled><span className="reward-flip-inner"><span className="reward-card-back" aria-hidden="true"><i>✦</i><b>{LOOT_TIERS[lootTier(r.type)].name}</b><small>{i+1}</small></span><span className="reward-card-front" aria-hidden={!shown}>{shown&&<><CosmeticArt image={r.type==='dust'?DUST_IMAGE:r.image} name={r.name}/>{r.type==='dust'?<b>{r.dust??0}</b>:direct&&r.type!=='frame'?<b>{r.name}</b>:null}<small>{r.duplicate?`중복 · 별가루 +${r.dust}`:r.type==='dust'?'별가루 획득':'새 치장 획득'}</small></>}</span></span></button>})}</div><PixiRewardEffects key={page} grid={grid} rewards={batch} startedAt={startedAt} revealed={localRevealed}/></div>{pages>1&&<nav className="loot-pages" aria-label="보상 묶음"><span>{page+1} / {pages} · 이번 {batch.length}개</span>{page+1<pages&&<button disabled={!batchComplete} onClick={nextBatch}>다음 {Math.min(10,total-(page+1)*10)}개 열기</button>}</nav>}</>}
  <div className="store-reward-actions">{!direct&&phase==='cards'&&!started&&<button className="hub-pill" onClick={flipAll}>전체 뒤집기</button>}<button className="hub-pill" onClick={onClose}>{direct||complete?'확인':'닫기'}</button></div>
 </section></div>,document.querySelector('.game-hub')??document.body);
}
