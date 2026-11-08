const TWO_WEEKS=14*24*60*60*1000;
const FIRST_RESET=Date.parse('2026-11-15T00:00:00+09:00');

export type Season={id:string;startAt:number;endAt:number};
export function seasonAt(now=Date.now()):Season{
 const offset=Math.max(-1,Math.floor((now-FIRST_RESET)/TWO_WEEKS));
 const startAt=FIRST_RESET+offset*TWO_WEEKS;
 return {id:new Date(startAt+9*60*60*1000).toISOString().slice(0,10),startAt,endAt:startAt+TWO_WEEKS};
}
export function nextSeason(id:string):Season{return seasonAt(Date.parse(`${id}T00:00:00+09:00`)+TWO_WEEKS);}
export function seasonStartingRating(previous:number):number{return previous<1000?900:Math.max(1000,Math.round(previous*0.4));}
