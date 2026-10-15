import {useState,type CSSProperties} from 'react';
import {HandFan} from './HandFan.js';
import {CardLabel} from './CardLabel.js';
import {CATALOG,RULES,judgeCards,type Card,type Kind,type Judgment} from '../shared/rules.js';
import {cardSentenceExample} from '../shared/card-sentence-example.js';
import {BUILD_VERSION} from './buildVersion.js';
import {NineSlicePanel} from './BrandSprites.js';

const supplies:Kind[]=['pronoun','proper','count','mass','article','indefinite','possessive','verb','be','do','modal','not','adjective','adverb','frequency','preposition','very','to-infinitive'];
const card=(kind:Kind):Card=>({id:crypto.randomUUID(),kind});

export function PracticeMode(){
 const [hand,setHand]=useState<Card[]>([]),[field,setField]=useState<Card[]>([]),[judgment,setJudgment]=useState<Judgment|null>(null);
 const update=(next:Card[])=>{setField(next);setJudgment(null)};
 const addToHand=(kind:Kind)=>setHand(current=>[...current,card(kind)]);
 const moveToField=(picked:Card)=>{if(field.length>=RULES.maxSelected)return;setHand(current=>current.filter(card=>card.id!==picked.id));update([...field,picked]);};
 const returnToHand=(picked:Card)=>{setHand(current=>[...current,picked]);update(field.filter(card=>card.id!==picked.id));};
 const example=judgment?.valid?cardSentenceExample(field,judgment).example:null;
 return <div className="shell practice-shell"><small className="build-version">{BUILD_VERSION}</small><a className="practice-battle-back" href="/">← 홈</a><main className="battle practice-battle" aria-label="연습 모드">
  <section className="practice-supply" aria-label="문법 카드 공급대">{supplies.map(kind=><button key={kind} className={`practice-supply-card ${CATALOG[kind].tone}`} onClick={()=>addToHand(kind)} aria-label={`${CATALOG[kind].name} 카드 손패에 추가`}>{CATALOG[kind].name}</button>)}</section>
  <div className="table-feedback-row practice-feedback-row feedback-active"><div className="table-feedback-slot">{judgment&&<div className={`judgment ${judgment.valid?'valid':'invalid'}`} role="status"><strong>{judgment.valid?`${judgment.label} · ${judgment.usedLength}장 인정`:'다시 조합해 보세요'}</strong><small>{judgment.reason}</small></div>}</div></div>
  <div className="field-feedback-wrap"><NineSlicePanel className="field-panel-skin"/><button className="return-all-icon" aria-label="모두 되돌리기" disabled={!field.length} onClick={()=>{setHand(current=>[...current,...field]);update([])}}>↶</button><div className="sentence-actions"><button className="primary submit" disabled={!field.length} onClick={()=>setJudgment(judgeCards(field))}>문장 확인</button></div><div className="sentence-area practice-sentence-area" aria-label="문장 조합 영역">{field.length?field.map((picked,index)=><button className={`sentence-card ${judgment?.valid&&index>=judgment.usedStartIndex&&index<judgment.usedStartIndex+judgment.usedLength?'recognized':''}`} key={picked.id} onClick={()=>returnToHand(picked)} aria-label={`${CATALOG[picked.kind].name} 손패로 되돌리기`}><img className="illustration" src={`/cards/${picked.kind}.webp`} alt={`${CATALOG[picked.kind].name} 카드`} draggable={false}/><CardLabel card={picked}/></button>):<div className="empty-sentence"><span>+</span><b>손패 카드를 눌러 문장을 만들어요</b><small>필드 카드는 다시 누르면 손패로 돌아갑니다.</small></div>}</div>{example&&<div className="practice-example"><b>{example.english}</b><span>{example.korean}</span></div>}</div>
  <div className="battle-hand-zone practice-hand-zone"><HandFan cards={hand} renderCard={(picked:Card,style?:CSSProperties)=><button className={`game-card ${CATALOG[picked.kind].tone}`} style={style} key={picked.id} data-card-id={picked.id} onClick={()=>moveToField(picked)} aria-label={`${CATALOG[picked.kind].name} 필드에 놓기`}><img className="illustration" src={`/cards/${picked.kind}.webp`} alt={`${CATALOG[picked.kind].name} 카드`} draggable={false}/><CardLabel card={picked}/></button>}/>{!hand.length&&<p className="practice-hand-empty">위에서 필요한 카드를 골라 주세요</p>}</div>
 </main></div>;
}
