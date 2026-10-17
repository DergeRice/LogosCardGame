import type {Difficulty} from './rules.js';
export const feverMultiplier=(go:number)=>Math.max(1,Math.min(3,Math.floor(go)));
export function matchGold(input:{go:number;rating:number;opponents:number[];score:number;scores:number[];elapsedMs:number;difficulty?:Difficulty;custom?:boolean}){
 const base=input.go>=3?500:input.go>=2?400:300;
 const average=input.opponents.reduce((a,b)=>a+b,0)/Math.max(1,input.opponents.length);
 const rating=Math.max(-1,Math.min(1,(average/Math.max(1,input.rating)-1)/.1));
 const score=Math.max(-1,Math.min(1,(input.score-60)/120));
 const time=Math.max(-1,Math.min(1,(input.elapsedMs-180000)/180000));
 const match=input.custom?0:input.difficulty==='easy'?-1:input.difficulty==='hard'?1:0;
 const adjustment=Math.max(-.1,Math.min(.1,.04*rating+.025*score+.015*time+.02*match));
 return {base,adjustment,total:Math.round(base*(1+adjustment))};
}
