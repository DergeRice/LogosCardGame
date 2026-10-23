export const AD_DAILY_LIMIT=2;
export const AD_TICKET_MS=15*60_000;
export type AdBox='silver'|'gold';
export type AdTicketResponse={ticket:string;box:AdBox;expiresAt:number;serial?:number};

/** LevelPlay's daily cap follows Korean calendar days, including UTC rollover. */
export function adDay(at:number){return new Date(at+9*60*60_000).toISOString().slice(0,10);}
export function adRemaining(usage:Record<string,number>|undefined,at:number){return Math.max(0,AD_DAILY_LIMIT-(usage?.[adDay(at)]??0));}
