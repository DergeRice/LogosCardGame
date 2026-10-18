import {CardLabel} from './CardLabel.js';
import { type ReactNode } from 'react';
import { CATALOG, type Card } from '../shared/rules.js';
import type { useCardDrag } from './useCardDrag.js';
import type {ScoreReveal} from './scoreAnimation.js';
import {PixiEmbers} from './PixiEmbers.js';
type Props={cards:Card[];disabled:boolean;committed?:boolean;committedIds?:ReadonlySet<string>;drag:ReturnType<typeof useCardDrag>;onReturn:(id:string)=>void;renderFace:(card:Card)=>ReactNode;score?:ScoreReveal|null;completed?:number;goCount?:number;continuingIds?:ReadonlySet<string>};
export function SentenceField({cards,disabled,committed=false,committedIds,drag,onReturn,renderFace,score,completed=0,goCount=0,continuingIds}:Props){
 const preview=drag.preview;
 const items:{id:string;card?:Card;slot:boolean}[]=cards.map(card=>({id:card.id,card,slot:false}));
 if(preview&&preview.index!==null){const source=cards.find(c=>c.id===preview.id);const old=items.findIndex(item=>item.id===preview.id);if(old>=0)items.splice(old,1);items.splice(preview.index,0,{id:preview.id,card:source,slot:true});}
 const counted=new Set(score?.steps.slice(0,completed).filter(s=>s.kind==='base').map(s=>s.cardId));
 const effects=new Map(score?.steps.slice(0,completed).filter(s=>s.cardId&&(s.kind==='multiply'||s.kind==='add')).map(s=>[s.cardId!,s])??[]);
 const active=score?.steps[completed-1];
 const isCommitted=(id:string)=>committed||Boolean(committedIds?.has(id));
 const isContinuing=(id:string)=>Boolean(continuingIds?.has(id));
 return <section ref={drag.board} className={`sentence-area pointer-field burn-level-${Math.min(3,Math.max(0,goCount))} ${goCount>=2?'fever-active':''} ${drag.preview?'dragging':''} ${score?'score-display':''}`} aria-label="문장 조합 영역">
  {goCount>=2&&<><div className="fever-banner" role="status"><b>FEVER ×{Math.min(3,goCount)}</b><span>{goCount>=3?'다음 득점으로 경기 종료':'전원 문장 점수 · 레이팅 배수'}</span></div><PixiEmbers level={goCount}/></>}
  {!items.length&&!preview&&<div className="empty-sentence"><span>＋</span><b>카드를 눌러 문장을 만들어 보세요</b><small>필드 카드를 누르면 손으로 · 끌어서 순서 변경</small></div>}
  {items.map(({id,card:c,slot},i)=>c?<button key={id} type="button" data-field-id={id} className={`sentence-card ${CATALOG[c.kind].tone} ${slot?'drop-preview field-drag-slot':preview?.id===id?'drag-source':''} ${counted.has(id)?'score-counted':''} ${drag.holdingId===id?'drag-holding':''} ${active?.cardId===id?'score-active score-'+active.kind:''}`} disabled={disabled||(isCommitted(id)&&!isContinuing(id))} aria-label={slot?`${i+1}번 위치 미리보기`:isContinuing(id)?`${i+1}번 이어 쓰는 ${CATALOG[c.kind].name} 카드`:isCommitted(id)?`${i+1}번 이전 문장의 ${CATALOG[c.kind].name} 카드`:`${i+1}번 ${CATALOG[c.kind].name} 카드 손패로 돌리기`} onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{if(!isContinuing(id))drag.start(e,id,isCommitted(id));}} onClick={()=>{if(!isCommitted(id)&&!isContinuing(id))drag.click(()=>onReturn(id));}} draggable={false} onDragStart={e=>e.preventDefault()}>{renderFace(c)}<CardLabel card={c}/>{slot&&<span className="drop-slot-label">여기에 놓기</span>}{counted.has(id)&&<span className="card-score-badge"><b className="calc-base">+1</b>{effects.get(id)&&<b key={effects.get(id)!.kind} className={'calc-'+effects.get(id)!.kind}>{effects.get(id)!.label}</b>}</span>}</button>:<div key={id} className="sentence-card drop-preview field-drag-slot" role="status" aria-label={`${i+1}번 위치 미리보기`}><span className="drop-slot-label">여기에 놓기</span></div>)}
 </section>;
}

