export const FREE_BOX_INTERVALS={silver:12*60*60_000,gold:24*60*60_000} as const;
export type FreeBox=keyof typeof FREE_BOX_INTERVALS;
export function freeBoxWait(nextAt:number|undefined,now:number){const minutes=Math.max(0,Math.ceil(((nextAt??0)-now)/60_000));return minutes?`${Math.floor(minutes/60)}시간 ${minutes%60}분 후 오픈 가능`:'무료';}
