import { cardEffect,type Card,type Judgment } from '../shared/rules.js';
export const SCORE_MOTION={totalMs:2300,stepMaxMs:240,settleMs:900,holdMs:1600,scoreboardMs:850};
export type ScoreStep={kind:'base'|'multiply'|'add'|'go';cardId?:string;label:string;value:number};
export type ScoreReveal={id:string;cards:Card[];judgment:Judgment;steps:ScoreStep[];previousScore:number;started:number;duration:number};
// Presentation only: the server's accepted range and final points are authoritative.
export function scoreSteps(cards:Card[],judgment:Judgment,multiplier=1):ScoreStep[]{
 if(!judgment.valid)return [];
 const used=cards.slice(judgment.usedStartIndex,judgment.usedStartIndex+judgment.usedLength),steps:ScoreStep[]=[];let value=0;
 for(const card of used)steps.push({kind:'base',cardId:card.id,label:'+1',value:++value});
 for(const card of used){const effect=cardEffect(card);if(effect.multiply!==1){value*=effect.multiply;steps.push({kind:'multiply',cardId:card.id,label:effect.multiply<1?`÷${1/effect.multiply}`:`×${effect.multiply}`,value:Math.round(value)});}}
 for(const card of used){const effect=cardEffect(card);if(effect.add){value+=effect.add;steps.push({kind:'add',cardId:card.id,label:`+${effect.add}`,value:Math.round(value)});}}
 if(judgment.goBonus){value+=judgment.goBonus;steps.push({kind:'go',label:`GO +${judgment.goBonus}`,value:Math.round(value)});}
 else if(judgment.goMultiplier&&judgment.goMultiplier>1){value*=judgment.goMultiplier;steps.push({kind:'go',label:`GO ×${judgment.goMultiplier}`,value:Math.round(value)});}
 else if(multiplier>1){value*=multiplier;steps.push({kind:'go',label:`GO ×${multiplier}`,value:Math.round(value)});}
 // Never animate a different total if the server rules/version changed.
 if(Math.round(value)!==judgment.points)return [{kind:'base',label:'서버 확정 값',value:judgment.points}];
 return steps;
}
