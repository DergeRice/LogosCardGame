import {CardLabel} from './CardLabel.js';
import { Fragment, type ReactNode } from 'react';
import { CATALOG, type Card } from '../shared/rules.js';
import type { useCardDrag } from './useCardDrag.js';
import type {ScoreReveal} from './scoreAnimation.js';
type Props={cards:Card[];disabled:boolean;committed?:boolean;drag:ReturnType<typeof useCardDrag>;onReturn:(id:string)=>void;renderFace:(card:Card)=>ReactNode;score?:ScoreReveal|null;completed?:number;goCount?:number};
export function SentenceField({cards,disabled,committed=false,drag,onReturn,renderFace,score,completed=0,goCount=0}:Props){
 const visible=drag.preview?.index!==null&&drag.preview ? cards.filter(c=>c.id!==drag.preview!.id) : cards;
 const counted=new Set(score?.steps.slice(0,completed).filter(s=>s.kind==='base').map(s=>s.cardId));
 const effects=new Map(score?.steps.slice(0,completed).filter(s=>s.cardId&&(s.kind==='multiply'||s.kind==='add')).map(s=>[s.cardId!,s])??[]);
 const active=score?.steps[completed-1];
 return <section ref={drag.board} className={`sentence-area pointer-field burn-level-${Math.min(3,Math.max(0,goCount))} ${drag.preview?'dragging':''} ${score?'score-display':''}`} aria-label="문장 조합 영역">
  {!visible.length&&!drag.preview&&<div className="empty-sentence"><span>＋</span><b>카드를 눌러 문장을 만들어 보세요</b><small>필드 카드를 누르면 손으로 · 끌어서 순서 변경</small></div>}
  {Array.from({length:visible.length+1},(_,i)=><Fragment key={visible[i]?.id??'end'}>
   {drag.preview?.index===i&&<div className="drop-preview" role="status" aria-label={`${i+1}번 위치 미리보기`}><span>여기에 놓기</span></div>}
   {visible[i]&&<button type="button" data-field-id={visible[i].id} className={`sentence-card ${CATALOG[visible[i].kind].tone} ${drag.preview?.id===visible[i].id?'drag-source':''} ${counted.has(visible[i].id)?'score-counted':''} ${active?.cardId===visible[i].id?'score-active score-'+active.kind:''}`} disabled={disabled||committed} aria-label={committed?`${i+1}번 제출된 ${CATALOG[visible[i].kind].name} 카드`:`${i+1}번 ${CATALOG[visible[i].kind].name} 카드 손패로 돌리기`} onPointerDown={e=>{if(!committed)drag.start(e,visible[i].id);}} onClick={()=>{if(!committed)drag.click(()=>onReturn(visible[i].id));}} draggable={false} onDragStart={e=>e.preventDefault()}>{renderFace(visible[i])}<CardLabel card={visible[i]}/>{counted.has(visible[i].id)&&<span className="card-score-badge"><b className="calc-base">+1</b>{effects.get(visible[i].id)&&<b key={effects.get(visible[i].id)!.kind} className={'calc-'+effects.get(visible[i].id)!.kind}>{effects.get(visible[i].id)!.label}</b>}</span>}</button>}
  </Fragment>)}
 </section>;
}
