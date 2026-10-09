import type {Card,PublicPlayer} from './rules.js';
export function canTransferCard(card:Card):boolean{return !['rob','exchange','protect'].includes(card.kind)}
export function uniqueCards(cards:Card[]):Card[]{return [...new Map(cards.map(card=>[card.id,card])).values()]}
export function fieldCards(player:Pick<PublicPlayer,'lastPlayed'|'playedSentences'>):Card[]{return uniqueCards([...(player.playedSentences??[]).flat(),...(player.lastPlayed??[])])}
export function playerCards(player:PublicPlayer,handFallback:Card[]=[]):Card[]{return uniqueCards([...(player.handPreview??handFallback),...(player.draftPreview??[]),...fieldCards(player)])}
