import {useState} from 'react';
import {CATALOG,RULES,judgeCards,type Card,type Kind,type Judgment} from '../shared/rules.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';
import {BUILD_VERSION} from './buildVersion.js';
import {NineSlicePanel} from './BrandSprites.js';

const supplies:Kind[]=['article','indefinite','do','modal','frequency','pronoun','verb','be','count'];
const card=(kind:Kind):Card=>({id:crypto.randomUUID(),kind});

export function PracticeMode(){
 const [hand,setHand]=useState<Card[]>([]),[field,setField]=useState<Card[]>([]),[judgment,setJudgment]=useState<Judgment|null>(null);
 const update=(next:Card[])=>{setField(next);setJudgment(null)};
 const addToHand=(kind:Kind)=>setHand(current=>[...current,card(kind)]);
 const moveToField=(picked:Card)=>{if(field.length>=RULES.maxSelected)return;setHand(current=>current.filter(card=>card.id!==picked.id));update([...field,picked]);};
 const returnToHand=(picked:Card)=>{setHand(current=>[...current,picked]);update(field.filter(card=>card.id!==picked.id));};
 const example=judgment?.valid?cardSentenceExample(field,judgment).example:null;
 return <div className="shell practice-shell"><small className="build-version">{BUILD_VERSION}</small><a className="practice-battle-back" href="/">← 홈</a><main className="battle practice-battle" aria-label="연습 모드">
  <section className="table-scoreboard practice-supply" aria-label="문법 카드 공급대">{supplies.map(kind=><button key={kind} className={`practice-supply-card ${CATALOG[kind].tone}`} onClick={()=>addToHand(kind)} aria-label={`${CATALOG[kind].name} 카드 손패에 추가`}><img src={`/cards/${kind}.webp`} alt=""/><span><b>{CATALOG[kind].name}</b><small>{CATALOG[kind].example}</small></span><i>+</i></button>)}</section>
  <div className="round-strip"><span><b>연습 모드</b> · 카드 공급 버튼을 눌러 손패에 넣으세요</span><span>{field.length}/{RULES.maxSelected}장</span></div>
  <div className="table-feedback-row practice-feedback-row"><div className="table-feedback-slot">{judgment&&<div className={`judgment score-only-judgment ${judgment.valid?'valid':'invalid'}`} role="status"><strong>{judgment.valid?`${judgment.label} · ${judgment.usedLength}장 인정`:'다시 조합해 보세요'}</strong><small>{judgment.reason}</small></div>}</div></div>
  <div className="field-feedback-wrap"><NineSlicePanel className="field-panel-skin"/><div className="sentence-actions"><button className="primary submit" disabled={!field.length} onClick={()=>setJudgment(judgeCards(field))}>문장 확인</button></div><div className="sentence-area practice-sentence-area">{field.length?field.map((picked,index)=><button className={`sentence-card ${judgment?.valid&&index>=judgment.usedStartIndex&&index<judgment.usedStartIndex+judgment.usedLength?'recognized':''}`} key={picked.id} onClick={()=>returnToHand(picked)} aria-label={`${CATALOG[picked.kind].name} 손패로 되돌리기`}><img className="illustration" src={`/cards/${picked.kind}.webp`} alt=""/><b>{CATALOG[picked.kind].name}</b><small>눌러서 손패로</small></button>):<div className="empty-sentence"><span>+</span><b>손패 카드를 눌러 문장을 만들어요</b><small>필드 카드는 다시 누르면 손패로 돌아갑니다.</small></div>}</div>{example&&<div className="practice-example"><b>{example.english}</b><span>{example.korean}</span></div>}</div>
  <div className="battle-hand-zone practice-hand-zone"><div className="hand-container"><div className="hand hand-spread" aria-label="내 손패">{hand.length?hand.map(picked=><button className={`game-card ${CATALOG[picked.kind].tone}`} key={picked.id} onClick={()=>moveToField(picked)} aria-label={`${CATALOG[picked.kind].name} 필드에 놓기`}><img className="illustration" src={`/cards/${picked.kind}.webp`} alt=""/><b>{CATALOG[picked.kind].name}</b><small>눌러서 필드에 놓기</small></button>):<p className="practice-hand-empty">위 카드 공급대에서 필요한 문법 카드를 골라 주세요.</p>}</div></div></div>
 </main></div>;
}
