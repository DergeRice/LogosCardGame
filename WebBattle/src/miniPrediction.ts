import {VERB_CATEGORIES,type MiniGameView} from '../shared/miniGame.js';

type Run=NonNullable<MiniGameView['run']>;
export type MiniPendingPick={runId:string;seq:number;cardId:number;side:'left'|'right';at:number};

/** Show the next card on tap while WebSocket acknowledgements are in flight. */
export function predictMiniRun(run:Run,pending:readonly MiniPendingPick[]){
 const cards=[...run.cards];
 let correct=run.correct,wrong=run.wrong,combo=run.combo??0,lockedUntil=run.lockedUntil;
 let feedback=run.feedback,missedWord=run.missedWord;
 for(const pick of pending){
  if(pick.runId!==run.id||pick.seq<=(run.lastClientSeq??0))continue;
  const card=cards[0];if(!card||card.id!==pick.cardId||pick.at<lockedUntil)break;
  const category=VERB_CATEGORIES.find(item=>item.id===(pick.side==='left'?run.left.id:run.right.id));
  if(!category)break;
  const valid=category.words.some(word=>word.toLowerCase()===card.word.toLowerCase());
  cards.shift();
  if(valid){correct++;combo++;feedback=undefined;missedWord=undefined;}
  else{wrong++;combo=0;lockedUntil=pick.at+1000;missedWord=card.word;const actual=VERB_CATEGORIES.find(item=>item.id===card.categoryId);feedback=`${card.word}은 ${actual?.description??'해당 분류'} 카드예요.`;}
 }
 return {...run,cards,card:cards[0]??null,upcoming:cards.slice(1,3),correct,wrong,combo,lockedUntil,feedback,missedWord};
}
