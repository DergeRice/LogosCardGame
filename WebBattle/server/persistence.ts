import {cardEffect} from '../shared/rules.js';
import { randomUUID } from 'node:crypto';
import { Game } from './game.js';
type Player=ReturnType<Game['newPlayer']>;
type Room=Game['rooms'] extends Map<string,infer R>?R:never;
type StoredPlayer=Omit<Player,'socket'|'seen'> & {seen:string[]};
type StoredRoom=Omit<Room,'players'> & {players:string[]};

// One row per player/room: no live sockets or browser-accessible session secrets.
export function snapshot(game:Game):Map<string,string>{
 const records=new Map<string,string>(),players=new Map<string,Player>();
 for(const p of game.sessions.values())players.set(p.id,p);
 for(const r of game.rooms.values()){
  for(const p of r.players)players.set(p.id,p);
  records.set('room:'+r.code,JSON.stringify({...r,players:r.players.map(p=>p.id)} satisfies StoredRoom));
 }
 for(const p of players.values()){
  const {socket,seen,...rest}=p;
  records.set('player:'+p.id,JSON.stringify({...rest,seen:[...seen]} satisfies StoredPlayer));
 }
 for(const [key,account] of game.accounts)records.set('account:'+key,JSON.stringify(account));
 for(const [hash,session] of game.accountSessions)records.set('auth:'+hash,JSON.stringify(session));
 return records;
}
export function restore(game:Game,records:Map<string,string>):Map<string,Player>{
 game.rooms.clear();game.sessions.clear();game.accounts.clear();game.accountSessions.clear();const players=new Map<string,Player>();
 for(const [key,json] of records){
  if(key.startsWith('account:'))game.accounts.set(key.slice(8),JSON.parse(json));
  if(key.startsWith('auth:'))game.accountSessions.set(key.slice(5),JSON.parse(json));
 }
 for(const [key,json] of records)if(key.startsWith('player:')){
  const p=JSON.parse(json) as StoredPlayer,player={...p,seen:new Set(p.seen)};
  const keep=(c:typeof p.hand[number])=>cardEffect(c).add!==-2;
  const hand=player.hand.filter(keep);
  if(hand.length!==player.hand.length){player.hand=hand;player.handVersion++;player.draftIds=(player.draftIds??[]).filter(id=>hand.some(c=>c.id===id));}
  const before=(player.playedSentences??[]).flat().length+(player.lastPlayed??[]).length;
  player.lastPlayed=player.lastPlayed?.filter(keep);player.playedSentences=player.playedSentences?.map(s=>s.filter(keep)).filter(s=>s.length);
  if(before!==(player.playedSentences??[]).flat().length+(player.lastPlayed??[]).length)player.fieldVersion=(player.fieldVersion??0)+1;
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
  if(game.durationMs===0&&['reveal','dealing','battle'].includes(r.phase)){if(!r.finalRound)r.endsAt=0;r.expiresAt=0;}
  if(r.decision&&!players.get(r.decision.playerId)?.ai)r.decision.expiresAt=0;
  r.deck=r.deck.filter(c=>cardEffect(c).add!==-2);
  r.discard=r.discard.filter(c=>cardEffect(c).add!==-2);
  if(r.exchange){const owners=[players.get(r.exchange.fromId),players.get(r.exchange.toId)];if(owners.some((p,i)=>!p||![...p.hand,...(p.playedSentences??[]).flat(),...(p.lastPlayed??[])].some(c=>c.id===(i?r.exchange!.wantedId:r.exchange!.offerId))))r.exchange=undefined;}
  game.rooms.set(r.code,{...r,players:r.players.map(id=>players.get(id)!).filter(Boolean)});
 }
 return players;
}
// Schedule only actual game deadlines; no always-running polling loop in the cloud.
export function nextDeadline(game:Game):number|null{
 const deadlines:number[]=[];
 for(const r of game.rooms.values()){
  if(r.expiresAt>0)deadlines.push(r.expiresAt);
  if(['reveal','dealing'].includes(r.phase)||(r.phase==='matching'&&r.players.some(p=>!p.ai&&p.socket?.readyState===1)))deadlines.push(r.stageEndsAt);
  if(['matching','reveal','dealing','battle'].includes(r.phase))for(const p of r.players)if(!p.ai&&p.disconnectedAt)deadlines.push(p.disconnectedAt+game.reconnectMs);
  if(r.phase==='battle'){
   if(r.finalRound&&r.endsAt>0)deadlines.push(r.endsAt);
   if(r.exchange)deadlines.push(r.exchange.expiresAt);
   if(r.nextDealAt>0&&!r.decision)deadlines.push(r.nextDealAt);
   if(!r.decision&&r.drawVote?.aiApproveAt)for(const [id,at] of Object.entries(r.drawVote.aiApproveAt))if(!r.drawVote.approved.includes(id))deadlines.push(at);
   if(r.decision){if(r.decision.expiresAt>0)deadlines.push(r.decision.expiresAt);if(r.players.find(p=>p.id===r.decision!.playerId)?.ai)deadlines.push(r.decision.startedAt+1801);}
   else{if(r.endsAt>0)deadlines.push(r.endsAt);for(const p of r.players)if(p.ai)deadlines.push(p.nextAI);}
  }
 }
 for(const p of game.sessions.values())if(!p.room&&!p.socket)deadlines.push(p.touchedAt+3600001);
 return deadlines.length?Math.max(Date.now()+50,Math.min(...deadlines)):null;
}


