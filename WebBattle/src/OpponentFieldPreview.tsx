import {CATALOG,VARIANTS,type Card,type PublicPlayer} from '../shared/rules.js';

function CardStrip({cards}:{cards:Card[]}){
 return <div className="opponent-preview-cards">{cards.map(card=><img key={card.id} src={`/cards/${card.variant&&VARIANTS[card.variant]?.kind===card.kind?card.variant:card.kind}.webp`} alt={CATALOG[card.kind].name} title={CATALOG[card.kind].name} draggable={false}/>)}</div>;
}

export function OpponentFieldPreview({player,onClose}:{player:PublicPlayer;onClose:()=>void}){
 const history=player.playedSentences?.length?player.playedSentences:player.lastPlayed?.length?[player.lastPlayed]:[];
 return <section className="opponent-field-preview" aria-label={`${player.name}의 손패와 문장 미리보기`}>
  <div className="opponent-preview-heading"><b>{player.name}의 카드</b><button type="button" aria-label="상대 미리보기 닫기" onClick={onClose}>×</button></div>
  <div className="opponent-preview-scroll">
   <div className="opponent-preview-group"><small>손패</small><CardStrip cards={player.handPreview??[]}/></div>
   <div className="opponent-preview-group"><small>현재 문장</small>{player.draftPreview?.length?<CardStrip cards={player.draftPreview}/>:<span className="opponent-preview-empty">올린 카드 없음</span>}</div>
   {history.map((sentence,index)=><div className="opponent-preview-group" key={index}><small>문장 {index+1}</small><CardStrip cards={sentence}/></div>)}
  </div>
 </section>;
}
