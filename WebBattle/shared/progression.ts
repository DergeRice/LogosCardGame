import type {Difficulty} from './rules.js';
export const BASE_MATCH_POINTS=300;
export const GUEST_RETENTION_MS=30*24*60*60_000;
export function victoryPoints(rating:number,opponents:readonly number[]){
 const average=opponents.length?opponents.reduce((sum,r)=>sum+r,0)/opponents.length:rating;
 const ratio=rating<=0?1:average/rating;
 const base=Math.round(BASE_MATCH_POINTS*ratio);
 return {base,ratio,average,total:base};
}
export function roomRating(ratings:readonly number[]){return ratings.reduce((sum,r)=>sum+r,0)/Math.max(1,ratings.length)}
export function compatibleRatings(ratings:readonly number[],joining:number){
 return ratings.every(r=>Math.abs(r-joining)<=Math.max(50,Math.max(r,joining)*.1));
}
export function aiDifficulty(rating:number):Difficulty{return rating<975?'easy':rating<1300?'normal':'hard'}
