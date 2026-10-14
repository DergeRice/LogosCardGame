import {CATALOG,VARIANTS,type Card,type PublicPlayer} from '../shared/rules.js';
import {playerCards} from '../shared/cardViews.js';
function CardGrid({cards}:{cards:Card[]}){
 return <div className="opponent-preview-cards">{cards.map(card=><img key={card.id} src={`/cards/${card.variant&&VARIANTS[card.variant]?.kind===card.kind?card.variant:card.kind}.webp`} alt={CATALOG[card.kind].name} title={CATALOG[card.kind].name} draggable={false}/>)}</div>;
}
export function OpponentFieldPreview({player,onClose}:{player:PublicPlayer;onClose:()=>void}){
 const cards=playerCards(player);
 return <div className="opponent-preview-backdrop" onClick={onClose}>
  <section className="opponent-field-preview" role="dialog" aria-modal="true" aria-label={`${player.name}의 전체 카드`} onClick={event=>event.stopPropagation()}>
   <div className="opponent-preview-heading"><div><b>{player.name}의 전체 카드</b><small>손패와 필드 카드 {cards.length}장</small></div><button type="button" aria-label="상대 미리보기 닫기" onClick={onClose}>×</button></div>
   {cards.length?<div className="opponent-preview-scroll"><CardGrid cards={cards}/></div>:<span className="opponent-preview-empty">보이는 카드가 없어요</span>}
  </section>
 </div>;
}
