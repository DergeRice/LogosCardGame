// Count first server-issued guest sessions, not IP addresses or page loads.
// The existing guest token makes reconnects and reloads reuse the same session.
export type DailyUserStats={newGuestSessions:number;newAccounts:number};
export function kstDay(at=Date.now()):string{return new Date(at+9*60*60*1000).toISOString().slice(0,10);}
export function validKstDay(value:string):boolean{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const at=Date.parse(value+'T00:00:00+09:00');return Number.isFinite(at)&&kstDay(at)===value;}
