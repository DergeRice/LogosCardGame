import type {Difficulty} from './rules.js';
export const feverMultiplier=(go:number)=>Math.max(1,Math.min(3,Math.floor(go)));
export function matchGold(input:{go:number;finalCards?:number;rating:number;opponents:number[];score:number;scores:number[];elapsedMs:number;difficulty?:Difficulty;custom?:boolean}){
 const base=(Math.max(0,input.finalCards??15)+17)*10;
 const bonus=input.go>=3?160:input.go===2?60:0;
 return {base,adjustment:base?bonus/base:0,total:base+bonus};
}
