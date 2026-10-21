import {createHash,randomUUID} from 'node:crypto';
import type {Game} from './game.js';
type Player=ReturnType<Game['newPlayer']>;
export function deleteGameAccount(game:Game,p:Player,msg:Record<string,unknown>){
 const fail=(message:string)=>game.send(p.socket,{type:'accountDeletionResult',ok:false,message});
 const auth=typeof msg.authToken==='string'?game.accountSessions.get(createHash('sha256').update(msg.authToken).digest('hex')):undefined;
 if(!p.accountId||!auth||auth.accountId!==p.accountId||auth.expiresAt<=Date.now())return fail('로그인한 계정을 확인할 수 없어요. 다시 로그인해 주세요.');
 if(msg.confirmation!=='탈퇴'||msg.acknowledge!==true)return fail('삭제 안내를 확인하고 탈퇴를 입력해 주세요.');
 const owned=[...game.sessions.values()].filter(other=>other.accountId===p.accountId),id=p.accountId,ids=new Set([id,...owned.map(other=>other.id)]);
 if(owned.some(other=>other.room&&game.rooms.get(other.room)?.phase!=='result'))return fail('현재 방에서 나온 뒤 탈퇴해 주세요.');
 if(![...game.accounts.values()].some(account=>account.id===id))return fail('계정을 찾을 수 없어요.');
 game.purgePlayerAudit?.([...ids]);game.clearAuthReturns([...ids]);
 for(const room of game.rooms.values())if(room.players.some(other=>ids.has(other.id))||(room.resultPlayers??[]).some(other=>ids.has(other.socialId??'')||ids.has(other.id))){
  const anonymous=new Map<string,string>();
  room.resultPlayers=(room.resultPlayers??game.view(room,p).players).map(player=>{if(!ids.has(player.id)&&!ids.has(player.socialId??''))return player;const alias='deleted-'+randomUUID();anonymous.set(player.id,alias);return {...player,id:alias,socialId:undefined,name:'탈퇴한 플레이어',profileId:undefined,characterId:undefined,frameId:undefined};});
  if(room.winner&&anonymous.has(room.winner))room.winner=anonymous.get(room.winner);
  if(room.leaderId&&ids.has(room.leaderId))room.leaderId=undefined;
  if(room.hostId&&ids.has(room.hostId))room.hostId=room.players.find(other=>!ids.has(other.id)&&!other.ai)?.id;
  if(room.forfeiterId&&anonymous.has(room.forfeiterId))room.forfeiterId=anonymous.get(room.forfeiterId);
  room.players=room.players.filter(other=>!ids.has(other.id));room.log=[];
  if(!room.players.some(other=>!other.ai))game.rooms.delete(room.code);else game.broadcast(room);
 }
 for(const [key,account]of game.accounts)if(account.id===id)game.accounts.delete(key);
 for(const [key,session]of game.accountSessions)if(session.accountId===id)game.accountSessions.delete(key);
 for(const key of ids)game.community.records.delete(key);
 for(const record of game.community.records.values()){record.friends=record.friends.filter(key=>!ids.has(key));record.incoming=record.incoming.filter(key=>!ids.has(key));}
 for(const [key,invite]of game.community.invites)if(ids.has(invite.to)||ids.has(invite.from.id))game.community.invites.delete(key);
 game.audits=game.audits.filter(event=>!ids.has(event.playerId));for(const key of ids)game.telemetryAt.delete(key);
 for(const player of owned){player.deleted=true;player.room=undefined;game.sessions.delete(player.token);game.send(player.socket,{type:'accountDeleted'});player.socket?.close(4004,'Account deleted');}
 game.community.publish();game.publishRoomList();
}
