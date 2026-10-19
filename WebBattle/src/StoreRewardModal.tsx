import {useEffect,useState,useRef} from 'react';
import type {StoreResult} from '../shared/community.js';
import {BOXES} from '../shared/store.js';
import {CosmeticArt} from './CosmeticArt.js';
import {PixiLootBox} from './PixiLootBox.js';
import {playGameSfx} from './gameSfx.js';
import './store-reveal.css';
export function StoreRewardModal({result,onClose}:{result:StoreResult;onClose:()=>void}){
 const direct=result.source!=='box',box=BOXES.find(b=>b.id===result.box)??BOXES[0];
 const cards=useRef<HTMLDivElement>(null);
 const [phase,setPhase]=useState(direct?'direct':'opening'),[revealed,setRevealed]=useState(0);
 useEffect(()=>{for(const url of new Set(result.rewards.map(r=>r.image).filter((x):x is string=>Boolean(x?.startsWith('/'))))){const image=new Image();image.src=url;void image.decode().catch(()=>{})}},[result]);
 useEffect(()=>{if(revealed>0){const next=cards.current?.querySelector<HTMLButtonElement>(`[data-reward-index="${revealed}"]`);next?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});next?.focus({preventScroll:true})}},[revealed]);
 function flip(index:number){if(index!==revealed)return;playGameSfx('score',.24);setRevealed(n=>n+1)}
 return <div className="community-backdrop"><section className={`community-modal store-reward-modal ${direct?'direct-reward-modal':'box-reward-modal'}`} role="dialog" aria-modal="true" aria-label={direct?'구매 완료':'상자 결과'} data-phase={phase}>
  <h2>{direct?'구매 완료':phase==='opening'?`${box.name}을 여는 중`:revealed===result.rewards.length?'모두 확인했어요':'카드를 하나씩 뒤집어 보세요'}</h2>
  {direct?<div className="direct-rewards">{result.rewards.map((r,i)=><article key={i}><CosmeticArt image={r.image} name={r.name}/><b>{r.name}</b><small>보관함에 추가됐어요</small></article>)}</div>:phase==='opening'?<PixiLootBox box={box.id} onOpened={()=>{playGameSfx('score',.3);setPhase('cards')}}/>:<><small className="loot-reveal-count">{revealed} / {result.rewards.length}</small><div ref={cards} className="reward-card-grid">{result.rewards.map((r,i)=><button key={i} data-reward-index={i} className={`reward-flip ${i<revealed?'is-revealed':''}`} aria-label={i<revealed?`${i+1}번째 보상: ${r.name}`:`${i+1}번째 보상 뒤집기`} aria-pressed={i<revealed} disabled={i!==revealed} onClick={()=>flip(i)}><span className="reward-flip-inner"><span className="reward-card-back" aria-hidden="true"><i>✦</i><b>LOGOS</b><small>{i+1}</small></span><span className="reward-card-front" aria-hidden={i>=revealed}>{i<revealed&&<><CosmeticArt image={r.image} name={r.name}/><b>{r.name}</b><small>{r.duplicate?`중복 · 별가루 +${r.dust}`:r.type==='dust'?'별가루 획득':'새 치장 획득'}</small></>}</span></span></button>)}</div></>}
  <div className="store-reward-actions"><button className="hub-pill" onClick={onClose}>{direct||revealed===result.rewards.length?'확인':'닫기'}</button></div>
 </section></div>;
}
