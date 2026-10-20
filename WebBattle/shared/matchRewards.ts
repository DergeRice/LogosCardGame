import type {Difficulty} from './rules.js';
export const feverMultiplier=(go:number)=>Math.max(1,Math.min(3,Math.floor(go)));
export const goRewardMultiplier=(go:number)=>go>=3?15:go===2?5:1;
export const goPointReward=(go:number)=>50*goRewardMultiplier(go);
export function matchGold(input:{go:number;finalCards?:number;rating:number;opponents:number[];score:number;scores:number[];elapsedMs:number;difficulty?:Difficulty;custom?:boolean}){
 const base=(Math.max(0,input.finalCards??15)+17)*10;
 const multiplier=goRewardMultiplier(input.go);
 return {base,adjustment:multiplier-1,total:base*multiplier};
}
