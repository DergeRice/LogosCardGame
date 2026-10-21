import type {Difficulty} from '../shared/rules.js';
export function aiStopChance({score,rivals,handCount,deckAvailable,goCount,difficulty}:{score:number;rivals:number[];handCount:number;deckAvailable:boolean;goCount:number;difficulty:Difficulty}){
 const lead=score-Math.max(0,...rivals);
 return Math.min(95,Math.max(10,(goCount<=1?30:48)+(difficulty==='easy'?15:difficulty==='hard'?-10:0)+(lead<=8?15:lead>=25?-10:0)+(handCount<3?20:0)+(!deckAvailable?15:0)));
}
export function aiGoChoice(state:Parameters<typeof aiStopChance>[0],roll:number):'go'|'stop'{return state.goCount>=3?'stop':state.goCount===2?'go':roll<aiStopChance(state)?'stop':'go';}
