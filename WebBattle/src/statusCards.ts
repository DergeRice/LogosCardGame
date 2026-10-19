import {cardEffect,type Card} from '../shared/rules.js';
const mainParts=new Set(['verb','be','do','modal','pronoun','proper','count','mass','article','indefinite','possessive','preposition','to-infinitive']);
export function statusCardPriority(card:Card){if(['rob','exchange','protect'].includes(card.kind))return 0;if(card.kind==='nothing')return 4;const e=cardEffect(card);if(e.multiply>1||e.add>0)return 1;return mainParts.has(card.kind)?2:3;}
/** Sort summary only; preserve actual hand/field order and stable order within each group. */
export function sortStatusCards(cards:Card[]){return cards.map((card,index)=>({card,index})).sort((a,b)=>statusCardPriority(a.card)-statusCardPriority(b.card)||a.index-b.index).map(x=>x.card)}
