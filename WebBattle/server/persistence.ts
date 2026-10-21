import {MATCH_COUNTDOWN_MS} from '../shared/matchCountdown.js';
import {migrateProfiles} from '../shared/store.js';
import type {CommunityRecord,CommunityInvite} from './community.js';
import {judgeCards} from '../shared/rules.js';
import {GUEST_RETENTION_MS} from '../shared/progression.js';
import {cardEffect} from '../shared/rules.js';
import { randomUUID } from 'node:crypto';
import { Game } from './game.js';
import {thinkMs} from './ai.js';
type Player=ReturnType<Game['newPlayer']>;
type Room=Game['rooms'] extends Map<string,infer R>?R:never;
type StoredPlayer=Omit<Player,'socket'|'seen'|'nextAI'|'reaction'|'reactionAt'|'lastAction'> & {seen:string[]};
type StoredRoom=Omit<Room,'players'|'log'> & {players:string[]};
// Guest expiry can be extended by at most 15 minutes after restart. Never expire
// a guest early just to avoid persisting every ordinary activity timestamp.
export const ACTIVITY_CHECKPOINT_MS=15*60_000;

// One row per player/room: no live sockets or browser-accessible session secrets.
export function snapshot(game:Game):Map<string,string>{
 const records=new Map<string,string>(),players=new Map<string,Player>();
 for(const p of game.sessions.values())players.set(p.id,p);
 for(const r of game.rooms.values()){
  for(const p of r.players)players.set(p.id,p);
  const {log,...state}=r;
  records.set('room:'+r.code,JSON.stringify({...state,players:r.players.map(p=>p.id)} satisfies StoredRoom));
 }
 for(const p of players.values()){
  const {socket,seen,nextAI,reaction,reactionAt,lastAction,...rest}=p;
  records.set('player:'+p.id,JSON.stringify({...rest,touchedAt:Math.ceil(p.touchedAt/ACTIVITY_CHECKPOINT_MS)*ACTIVITY_CHECKPOINT_MS,seen:[...seen]} satisfies StoredPlayer));
 }
 for(const [key,account] of game.accounts)records.set('account:'+key,JSON.stringify(account));
 for(const [hash,session] of game.accountSessions)records.set('auth:'+hash,JSON.stringify(session));
 for(const [id,invite]of game.community.invites)if(invite.expiresAt>Date.now())records.set('invite:'+id,JSON.stringify(invite));
 for(const [id,r]of game.community.records)records.set('community:'+id,JSON.stringify(r));
 return records;
}
export function restore(game:Game,records:Map<string,string>):Map<string,Player>{
 game.community.records.clear();game.community.invites.clear();game.rooms.clear();game.sessions.clear();game.accounts.clear();game.accountSessions.clear();const players=new Map<string,Player>();
 for(const [key,json] of records){
  if(key.startsWith('invite:')){const invite=JSON.parse(json) as CommunityInvite;if(invite.expiresAt>Date.now())game.community.invites.set(key.slice(7),invite);}
  if(key.startsWith('community:')){const record=JSON.parse(json) as CommunityRecord;migrateProfiles(record.store,record.id);game.community.records.set(key.slice(10),record);}
  if(key.startsWith('account:'))game.accounts.set(key.slice(8),JSON.parse(json));
  if(key.startsWith('auth:'))game.accountSessions.set(key.slice(5),JSON.parse(json));
 }
 for(const [key,json] of records)if(key.startsWith('player:')){
  const p=JSON.parse(json) as StoredPlayer;
  // Ignore old runtime-only fields too; legacy rows migrate on the next commit.
  const player:Player={...p,seen:new Set(p.seen),nextAI:p.ai?Date.now()+thinkMs(p.ai):0,reaction:undefined,reactionAt:Date.now(),lastAction:undefined};
  const keep=(c:typeof p.hand[number])=>c.kind!=='to-infinitive'&&cardEffect(c).add!==-2;
  const hand=player.hand.filter(keep);
  if(hand.length!==player.hand.length){player.hand=hand;player.handVersion++;player.draftIds=(player.draftIds??[]).filter(id=>hand.some(c=>c.id===id));}
  const before=(player.playedSentences??[]).flat().length+(player.lastPlayed??[]).length;
  player.lastPlayed=player.lastPlayed?.filter(keep);player.playedSentences=player.playedSentences?.map(s=>s.filter(keep)).filter(s=>s.length);
  if(before!==(player.playedSentences??[]).flat().length+(player.lastPlayed??[]).length)player.fieldVersion=(player.fieldVersion??0)+1;
  // Seed the credit ledger for already-running rooms before unlocking their field.
  player.scoreClaims??=(player.playedSentences??(player.lastPlayed?[player.lastPlayed]:[])).map(cards=>({ids:cards.map(c=>c.id),points:judgeCards(cards).points}));
  players.set(player.id,player);if(!player.ai)game.sessions.set(player.token,player);
 }
 for(const [key,json] of records)if(key.startsWith('room:')){
  const r=JSON.parse(json) as StoredRoom;
  // Older cloud rooms stored requester based draw votes and had no automatic deadline.
  // Start a fresh shared vote without disturbing hands, scores or the current match.
  if(r.phase==='battle'&&r.deck.length>=r.players.length&&
    ((r.drawVote as typeof r.drawVote&{requesterId?:string}|undefined)?.requesterId||!r.drawVote||r.nextDealAt<=0)){
   r.drawVote={id:randomUUID(),approved:r.players.filter(id=>players.get(id)?.ai)};
   r.nextDealAt=Date.now()+game.dealMs;
  }
  if(r.phase==='battle'&&r.nextDealAt>Date.now()+game.dealMs)r.nextDealAt=Date.now()+game.dealMs;
  if(game.durationMs===0&&['reveal','dealing','battle'].includes(r.phase)){if(!r.finalRound&&r.countdownStartedAt===undefined)r.endsAt=0;r.expiresAt=0;}
  if(r.decision&&!players.get(r.decision.playerId)?.ai&&r.decision.expiresAt<=0)r.decision.expiresAt=(r.decision.startedAt||Date.now())+game.humanDecisionMs;
  if((r.rulesVersion??0)<4&&['battle','dealing'].includes(r.phase)){
   const oldCount=r.goCount,leader=players.get(r.leaderId??'');if(leader)leader.goHits=Math.min(3,oldCount);
   r.goTarget=oldCount?Math.min(3,oldCount+1):undefined;
   if(r.decision){const scorer=players.get(r.decision.playerId);if(scorer){const same=r.leaderId===scorer.id;scorer.goHits=Math.min(3,same?oldCount+1:1);r.decision.previousLeaderId=same?undefined:r.leaderId;r.leaderId=scorer.id;r.goCount=scorer.goHits;if(!same)r.goTarget=undefined;}}
   r.rulesVersion=4;
  }
  // Rooms created before hit records were persisted still need the best single
  // accepted score, not the cumulative scoreboard total, after a worker update.
  r.highHitScore??=Math.max(0,...r.players.flatMap(id=>{
   const player=players.get(id);
   return [...(player?.scoreClaims??[]).map(claim=>claim.points),player?.judgment?.awardedPoints??0];
  }).filter(points=>points>=20));
  if((r.countdownVersion??0)<1&&r.phase==='battle'){
   const exhausted=r.deck.length<r.players.length,hasGo=r.players.some(id=>(players.get(id)?.goHits??0)>0);
   if(r.finalRound||exhausted||hasGo){r.countdownStartedAt=Date.now();r.endsAt=r.endsAt>0?Math.min(r.endsAt,Date.now()+MATCH_COUNTDOWN_MS):Date.now()+MATCH_COUNTDOWN_MS;if(exhausted){r.finalRound=true;r.nextDealAt=0;r.drawVote=undefined;}}
   r.countdownVersion=1;
  }
  r.deck=r.deck.filter(c=>c.kind!=='to-infinitive'&&cardEffect(c).add!==-2);
  r.discard=r.discard.filter(c=>c.kind!=='to-infinitive'&&cardEffect(c).add!==-2);
  if(r.exchange){const owners=[players.get(r.exchange.fromId),players.get(r.exchange.toId)];if(owners.some((p,i)=>!p||![...p.hand,...(p.playedSentences??[]).flat(),...(p.lastPlayed??[])].some(c=>c.id===(i?r.exchange!.wantedId:r.exchange!.offerId))))r.exchange=undefined;}
  game.rooms.set(r.code,{...r,log:[],players:r.players.map(id=>players.get(id)!).filter(Boolean)});
 }
 return players;
}
// Schedule only actual game deadlines; no always-running polling loop in the cloud.
export function nextDeadline(game:Game):number|null{
 const deadlines:number[]=[...game.community.invites.values()].map(i=>i.expiresAt);
 for(const r of game.rooms.values()){
  if(r.expiresAt>0)deadlines.push(r.expiresAt);
  if(['reveal','dealing'].includes(r.phase)||(r.phase==='matching'&&r.players.some(p=>!p.ai&&p.socket?.readyState===1)))deadlines.push(r.stageEndsAt);
  if(['lobby','matching','reveal','dealing','battle'].includes(r.phase))for(const p of r.players)if(!p.ai&&p.disconnectedAt)deadlines.push(p.disconnectedAt+game.reconnectMs);
  if(r.phase==='battle'){
   if((r.finalRound||r.countdownStartedAt!==undefined)&&r.endsAt>0)deadlines.push(r.endsAt);
   if(r.exchange)deadlines.push(r.exchange.expiresAt);
   if(r.nextDealAt>0&&!r.decision)deadlines.push(r.nextDealAt);
   if(!r.decision&&r.drawVote?.aiApproveAt)for(const [id,at] of Object.entries(r.drawVote.aiApproveAt))if(!r.drawVote.approved.includes(id))deadlines.push(at);
   if(r.decision){if(r.decision.expiresAt>0)deadlines.push(r.decision.expiresAt);if(r.players.find(p=>p.id===r.decision!.playerId)?.ai)deadlines.push(r.decision.startedAt+1801);}
   else{if(r.endsAt>0)deadlines.push(r.endsAt);for(const p of r.players)if(p.ai)deadlines.push(p.nextAI);}
  }
 }
 for(const p of game.sessions.values())if(!p.room&&!p.socket)deadlines.push(p.touchedAt+GUEST_RETENTION_MS+1);
 return deadlines.length?Math.max(Date.now()+50,Math.min(...deadlines)):null;
}


