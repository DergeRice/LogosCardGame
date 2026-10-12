import {randomUUID,timingSafeEqual} from 'node:crypto';
export type AuditEvent={id:string;time:number;level:'info'|'warn'|'error';event:string;action:string;player:string;playerId:string;room:string;matchId:string;requestId:string;details:Record<string,unknown>;status?:string;note?:string};
const fields=['type','requestId','matchId','handVersion','cardId','cards','targetId','offerId','wantedId','stealId','stealSource','choice','approve','reason','decisionId','voteId','exchangeId','event','code','build','connected','pending','phase','selected','events','inspectMode','viewingOpponent','scoreRunning','file','line','column','durationMs','points','patternType','valid','accepted','usedStartIndex','usedLength'];
const redact=(value:string)=>value.replace(/(?:ghp_|github_pat_|Bearer\s+)\S+/gi,'[redacted]').replace(/[a-f0-9]{48,}/gi,'[redacted]').replace(/(password|authToken|token|authorization)["']?\s*[:=]\s*["']?[^"',\s}]+/gi,'$1=[redacted]');
export function safeDetails(input:Record<string,unknown>):Record<string,unknown>{
 const out:Record<string,unknown>={};
 for(const key of fields){const v=input[key];if(typeof v==='string')out[key]=redact(v).slice(0,200);else if(typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))out[key]=v;else if(Array.isArray(v))out[key]=v.filter(x=>typeof x==='string').slice(0,15).map(x=>redact(x).slice(0,80));}
 return out;
}
export function makeAudit(event:string,level:AuditEvent['level'],context:Partial<AuditEvent>,details:Record<string,unknown>):AuditEvent{return{id:randomUUID(),time:Date.now(),level,event:event.slice(0,60),action:String(details.type??context.action??event).slice(0,50),player:context.player??'',playerId:context.playerId??'',room:context.room??'',matchId:context.matchId??'',requestId:String(details.requestId??context.requestId??'').slice(0,80),details,...context};}
export function adminAuthorized(header:string|null,secret:string|undefined){if(!secret||secret.length<24||!header?.startsWith('Bearer '))return false;const a=Buffer.from(header.slice(7)),b=Buffer.from(secret);return a.length===b.length&&timingSafeEqual(a,b);}
export const AUDIT_RETENTION_MS=7*24*60*60*1000;
export const AUDIT_MAX_ROWS=5000;






