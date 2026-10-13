import {CARD_POS,CATALOG,type Card,type Kind} from './rules.js';
import {LearningPosType} from './LearningLocalGrammarChecker.js';
import type {AuditEvent} from '../server/audit.js';

/** Use server-resolved faces, never request-supplied card IDs as grammar evidence. */
export function auditCards(event:AuditEvent):Card[]{
 const value=event.details.submittedCards??event.details.selectedCards;
 if(!Array.isArray(value))return [];
 return value.slice(0,15).filter((c):c is Card=>Boolean(c&&typeof c==='object'&&typeof c.id==='string'&&Object.hasOwn(CATALOG,c.kind)));
}
export function submissionKey(e:AuditEvent){return `${e.matchId}|${e.playerId}|${e.requestId||e.id}`;}
export type ObservedSentence={key:string;patternType:number;positions:string[];kinds:Kind[];cards:Card[];time:number;accepted:boolean;ai:boolean|null};
export function observedSentence(result:AuditEvent,earlier?:AuditEvent):ObservedSentence|null{
 if(result.event!=='submit_result'||result.details.valid!==true)return null;
 const cards=auditCards(result).length?auditCards(result):earlier?auditCards(earlier):[];
 const start=result.details.usedStartIndex,length=result.details.usedLength,pattern=result.details.patternType;
 if(!Number.isInteger(start)||!Number.isInteger(length)||!Number.isInteger(pattern)||Number(start)<0||Number(length)<1||Number(pattern)<1||Number(pattern)>5||Number(start)+Number(length)>cards.length)return null;
 const used=cards.slice(Number(start),Number(start)+Number(length)),positions=used.map(c=>CARD_POS[c.kind]);
 if(positions.some(p=>p===null||p===undefined))return null;
 const names=positions.map(p=>LearningPosType[p!]);
 return {key:names.join(' '),patternType:Number(pattern),positions:names,kinds:used.map(c=>c.kind),cards:used,time:result.time,accepted:result.details.accepted===true,ai:typeof result.details.actorAI==='boolean'?result.details.actorAI:null};
}
export type SentenceCombo={key:string;patternType:number;positions:string[];kinds:Kind[];count:number;scoredCount:number;aiCount:number;unknownActorCount:number;firstAt:number;lastAt:number};
export type SentenceStats={total:number;unique:number;scoredTotal:number;scoredUnique:number;missingCards:number;forms:{patternType:number;count:number;unique:number;scoredCount:number}[];combinations:SentenceCombo[];nextOffset:number|null;since:number|null};
