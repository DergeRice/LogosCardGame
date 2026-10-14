import {victoryPoints,compatibleRatings,roomRating,aiDifficulty,GUEST_RETENTION_MS} from '../shared/progression.js';
import {BUILD_VERSION} from '../src/buildVersion.js';
import {makeAudit,safeDetails,type AuditEvent} from './audit.js';
import {fieldCards,canTransferCard} from '../shared/cardViews.js';
import { randomInt, randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export interface GameSocket { readonly readyState: number; readonly bufferedAmount: number; send(data: string): void; close(code?: number, reason?: string): void; terminate(): void; }
type WebSocket = GameSocket;
import { judgeCards, DECK_FACES, RULES, REACTIONS, EXCHANGE_REPLIES, type Card, type Kind, type Difficulty, type Judgment, type RoomView, type RoomListing, type Decision, type ExchangeRequest, type Reaction, type DrawVote, type RobNotice } from '../shared/rules.js';
import { chooseMove, thinkMs } from './ai.js';

type Player = { accountId?:string; robNotices?:RobNotice[]; id: string; calledGo?:boolean; token: string; name: string; avatar: Kind; rating: number; ratingDelta: number; points: number; reward: number; baseReward?:number; opponentRating?:number; rewardRatio?:number; resumeNotice?:string; socket?: WebSocket; room?: string; hand: Card[]; handVersion: number; fieldVersion: number; draftIds?:string[]; score: number; ready: boolean; rematch: boolean; ai?: Difficulty; disconnectedAt?: number; seen: Set<string>; actionAt: number; exchangeAt: number; nextAI: number; judgment?: Judgment; lastPlayed?: Card[]; playedSentences?: Card[][]; lastAction?: { id: string; text: string }; reaction?: {id:string;emoji:Reaction;at:number}; reactionAt?:number; touchedAt: number };
export type Account = {id:string;username:string;salt:string;passwordHash:string;rating:number;points:number;failedLogins:number;lockedUntil:number};
export type AccountSession = {accountId:string;expiresAt:number};
type Room = { code: string; phase: RoomView['phase']; custom?:boolean; name?:string; hostId?:string; matchId: string; players: Player[]; deck: Card[]; discard: Card[]; dealCursor: number; stageEndsAt: number; nextDealAt: number; dealSerial: number; goCount: number; highScore: number; leaderId?:string; drawVote?:DrawVote; nextDrawRequestAt?:number; testMode?: boolean; decision?: Decision; exchange?: ExchangeRequest; endsAt: number; finalRound?:boolean; expiresAt: number; winner?: string | null; reason?: string; log: { id: string; text: string }[] };
type Options = { auditSink?:(event:AuditEvent)=>void; durationMs?: number; reconnectMs?: number; lobbyMs?: number; resultMs?: number; matchingMs?: number; revealMs?: number; dealingMs?: number; dealMs?: number; decisionMs?: number; humanDecisionMs?:number; minimumPlayers?: number };
const avatars: Kind[] = ['pronoun', 'verb', 'adjective', 'count'];
function shuffle<T>(items: T[]): T[] { for (let i = items.length - 1; i > 0; i--) { const j = randomInt(i + 1); [items[i], items[j]] = [items[j], items[i]]; } return items; }
export class Game {
 auditSink?: (event:AuditEvent)=>void; audits:AuditEvent[]=[]; telemetryAt=new Map<string,number>();
 minimumPlayers = RULES.minPlayers;
 rooms = new Map<string, Room>(); sessions = new Map<string, Player>();
 accounts = new Map<string,Account>(); accountSessions = new Map<string,AccountSession>();
 durationMs: number; reconnectMs: number; lobbyMs: number; resultMs: number; matchingMs: number; revealMs: number; dealingMs: number; dealMs: number; decisionMs: number; humanDecisionMs:number;
 constructor(options: Options = {}) { this.auditSink=options.auditSink; this.minimumPlayers = options.minimumPlayers ?? RULES.minPlayers; this.durationMs = options.durationMs ?? RULES.matchSeconds * 1000; this.reconnectMs = options.reconnectMs ?? RULES.reconnectSeconds * 1000; this.lobbyMs = options.lobbyMs ?? 15 * 60_000; this.resultMs = options.resultMs ?? 30 * 60_000; this.matchingMs = options.matchingMs ?? RULES.matchingMs; this.revealMs = options.revealMs ?? RULES.revealMs; this.dealingMs = options.dealingMs ?? RULES.dealingMs; this.dealMs = options.dealMs ?? RULES.dealMs; this.decisionMs = options.decisionMs ?? RULES.decisionMs;this.humanDecisionMs=options.humanDecisionMs??RULES.humanDecisionSeconds*1000; }
 send(socket: WebSocket | undefined, payload: unknown) { if (socket?.readyState === 1) { if (socket.bufferedAmount > 256_000) socket.terminate(); else socket.send(JSON.stringify(payload)); } }
 audit(p:Player|undefined,event:string,level:AuditEvent['level']='info',details:Record<string,unknown>={},overrideRoom?:Room,submittedCards?:readonly Card[]){
  const r=overrideRoom??(p?.room?this.rooms.get(p.room):undefined);
  const record=makeAudit(event,level,{player:p?.name??'',playerId:p?.id??'',room:r?.code??p?.room??'',matchId:r?.matchId??''},safeDetails(details));
  record.details={...record.details,serverBuild:BUILD_VERSION,serverPhase:r?.phase,submittedCards:submittedCards?.map(c=>({...c})),...(p?{actorAI:Boolean(p.ai),serverPhase:r?.phase,serverHandVersion:p.handVersion,cooldownMs:Math.max(0,p.actionAt-Date.now()),decision:r?.decision?.playerId,selectedCards:Array.isArray(details.cards)?details.cards.slice(0,15).map(id=>p.hand.find(c=>c.id===id)).filter(Boolean):undefined}:{})};
  if(this.auditSink)this.auditSink(record);else{this.audits.push(record);if(this.audits.length>5000)this.audits.shift();}
 }
 fail(p: Player, message: string, requestId?: string) { this.audit(p,'rejected','warn',{reason:message,requestId});this.send(p.socket, { type: 'error', message, requestId });const r=p.room&&this.rooms.get(p.room);if(requestId&&r)this.send(p.socket,{type:'state',room:this.view(r,p)}); }
 newPlayer(name: string): Player { return { id: randomUUID(), token: Array.from(randomBytes(32),x=>x.toString(16).padStart(2,'0')).join(''), name, avatar: avatars[randomInt(avatars.length)], rating: 1000, ratingDelta: 0, points: 0, reward: 0, hand: [], handVersion: 0, fieldVersion: 0, draftIds:[], score: 0, ready: true, rematch: false, seen: new Set(), actionAt: 0, exchangeAt: 0, nextAI: 0, touchedAt: Date.now() }; }
 hello(socket: WebSocket, token: unknown, name: unknown, authToken?:unknown): Player {
  this.tick();
  const auth=typeof authToken==='string'?this.accountSessions.get(createHash('sha256').update(authToken).digest('hex')):undefined;
  const account=auth&&auth.expiresAt>Date.now()?[...this.accounts.values()].find(a=>a.id===auth.accountId):undefined;
  let p=account?[...this.sessions.values()].find(session=>session.accountId===account.id):typeof token === 'string' ? this.sessions.get(token) : undefined;
  if(p?.accountId&&!account)p=undefined;
  const expired = Boolean(token && !p);
  if(account&&!p){p=this.newPlayer(account.username);p.accountId=account.id;p.rating=account.rating;p.points=account.points;this.sessions.set(p.token,p);}
  if (!p) { if (this.sessions.size >= 2000) throw Error('서버가 붐빕니다. 잠시 후 다시 시도하세요.'); const cleaned = typeof name === 'string' ? name.trim().replace(/[\u0000-\u001f\u007f]/g, '') : ''; if (!cleaned || cleaned.length > 16) throw Error('닉네임은 1~16자로 입력해 주세요.'); p = this.newPlayer(cleaned); this.sessions.set(p.token, p); }
  if (p.socket && p.socket !== socket) p.socket.close(4001, '다른 창에서 세션을 사용 중입니다.');
  p.socket = socket; p.disconnectedAt = undefined; p.touchedAt = Date.now();
  this.send(socket, { type: 'session', token: p.token, id: p.id, name: p.name, avatar: p.avatar, rating: p.rating, points: p.points, account:p.accountId?{username:p.name}:null });
  this.sendRoomList(socket);
  const room = p.room && this.rooms.get(p.room);
  if (room) { if (room.phase === 'result' && !room.finalRound && this.allRematch(room)) this.reveal(room); else this.broadcast(room); }
  else {this.send(socket, { type: 'home', rating: p.rating, points: p.points, message: p.resumeNotice??(expired ? '세션이 만료되어 새 게스트로 연결했어요. 임시 레이팅도 초기화됩니다.' : undefined) });p.resumeNotice=undefined;}
  return p;
 }
 authenticate(p:Player,msg:Record<string,unknown>){
  if(p.room)return this.fail(p,'계정 변경은 대전이 끝난 뒤 해주세요.');
  const username=typeof msg.username==='string'?msg.username.trim().normalize('NFC'):'';
  const password=typeof msg.password==='string'?msg.password:'';
  if(!/^[\p{L}\p{N}_-]{3,16}$/u.test(username)||password.length<10||password.length>128)return this.fail(p,'아이디는 3~16자, 비밀번호는 10~128자로 입력해 주세요.');
  const key=username.toLocaleLowerCase('en-US');let account=this.accounts.get(key);
  if(msg.type==='register'){
   if(p.accountId)return this.fail(p,'이미 계정에 로그인했어요.');
   if(account)return this.fail(p,'이미 사용 중인 아이디예요.');
   const salt=Buffer.from(randomBytes(16)).toString('hex');account={id:randomUUID(),username,salt,passwordHash:Buffer.from(scryptSync(password,salt,32)).toString('hex'),rating:p.rating,points:p.points,failedLogins:0,lockedUntil:0};this.accounts.set(key,account);
  }else{
   if(!account)return this.fail(p,'아이디 또는 비밀번호가 맞지 않아요.');
   if(account.lockedUntil>Date.now())return this.fail(p,'로그인 시도가 많아요. 잠시 후 다시 시도해 주세요.');
   const actual=scryptSync(password,account.salt,32),expected=Buffer.from(account.passwordHash,'hex');
   if(expected.length!==actual.length||!timingSafeEqual(actual,expected)){
    account.failedLogins++;if(account.failedLogins>=5){account.lockedUntil=Date.now()+15*60_000;account.failedLogins=0;}
    return this.fail(p,'아이디 또는 비밀번호가 맞지 않아요.');
   }
   account.failedLogins=0;account.lockedUntil=0;
   const accountId=account.id;
   const previous=[...this.sessions.values()].find(other=>other!==p&&other.accountId===accountId);
   if(previous?.room)return this.fail(p,'이 계정은 다른 대전에서 사용 중이에요.');
   if(previous){previous.socket?.close(4001,'다른 창에서 계정에 로그인했습니다.');this.sessions.delete(previous.token);}
   if(p.accountId&&p.accountId!==account.id)return this.fail(p,'현재 계정에서 로그아웃한 뒤 다시 로그인해 주세요.');
   p.rating=account.rating;p.points=account.points;
  }
  p.accountId=account.id;p.name=account.username;
  const authToken=Buffer.from(randomBytes(32)).toString('hex');this.accountSessions.set(createHash('sha256').update(authToken).digest('hex'),{accountId:account.id,expiresAt:Date.now()+30*24*60*60_000});
  this.send(p.socket,{type:'auth',username:account.username,authToken,rating:p.rating,points:p.points});
  this.send(p.socket,{type:'session',token:p.token,id:p.id,name:p.name,avatar:p.avatar,rating:p.rating,points:p.points,account:{username:p.name}});
 }
 logout(p:Player){
  if(!p.accountId)return;
  if(p.room)return this.fail(p,'대전이 끝난 뒤 로그아웃해 주세요.');
  for(const [hash,session] of this.accountSessions)if(session.accountId===p.accountId)this.accountSessions.delete(hash);
  this.send(p.socket,{type:'auth',username:null,authToken:null});
  p.socket?.close(4000,'로그아웃');
 }
 disconnected(p: Player, socket: WebSocket) { if (p.socket !== socket) return; p.socket = undefined; p.disconnectedAt = Date.now(); const r = p.room && this.rooms.get(p.room); if (r) this.broadcast(r); }
 view(r: Room, p: Player): RoomView {
  const state:RoomView={ code: r.code, phase: r.phase, custom:r.custom, name:r.name, hostId:r.hostId, matchId: r.matchId, players: r.players.map(x => ({ id: x.id, name: x.name, avatar: x.avatar, rating: x.rating, ratingDelta: x.ratingDelta, points: x.points, reward: x.reward, baseReward:x.baseReward, opponentRating:x.opponentRating,rewardRatio:x.rewardRatio, calledGo:Boolean(x.calledGo), score: x.score, ready: x.ready, rematch: x.rematch, connected: Boolean(x.ai || x.socket?.readyState === 1), handCount: x.hand.length, ai: Boolean(x.ai), disconnectedAt: x.disconnectedAt, lastPlayed:x.lastPlayed, playedSentences:x.playedSentences, lastAction:x.lastAction, reaction:x.reaction&&Date.now()-x.reaction.at<3000?x.reaction:undefined })), hand: ['battle', 'dealing'].includes(r.phase) ? p.hand : [], handVersion: p.handVersion, fieldVersion:p.fieldVersion??0, you: p.id, robNotices:p.robNotices, endsAt: r.endsAt, finalRound:r.finalRound, stageEndsAt: r.stageEndsAt, nextDealAt: r.nextDealAt, dealSerial: r.dealSerial, deckCount: r.deck.length, deckTotal: DECK_FACES.length, usedCards: r.discard, dealIntervalMs: this.dealMs, goCount: r.goCount, multiplier: 1, highScore: r.highScore, leaderId:r.leaderId, drawVote:r.drawVote, testMode:r.testMode, decision: r.decision, exchange:r.exchange?{id:r.exchange.id,fromId:r.exchange.fromId,toId:r.exchange.toId,expiresAt:r.exchange.expiresAt,offer:r.exchange.toId===p.id?(()=>{const owner=r.players.find(x=>x.id===r.exchange!.fromId);return owner&&[...owner.hand,...fieldCards(owner)].find(c=>c.id===r.exchange!.offerId)})():undefined,wanted:r.exchange.toId===p.id||r.exchange.fromId===p.id?(()=>{const owner=r.players.find(x=>x.id===r.exchange!.toId);return owner&&[...owner.hand,...fieldCards(owner)].find(c=>c.id===r.exchange!.wantedId)})():undefined}:undefined,serverNow: Date.now(), actionAt: p.actionAt, exchangeAt: p.exchangeAt, reconnectMs: this.reconnectMs, durationMs: this.durationMs, winner: r.winner, reason: r.reason, log: r.log, judgment: p.judgment, expiresAt: r.expiresAt };
  if(r.phase==='battle'||r.phase==='dealing')state.players.forEach((player,index)=>{const source=r.players[index],draft=new Set(source.draftIds??[]);player.handPreview=source.hand.filter(c=>!draft.has(c.id));player.draftPreview=(source.draftIds??[]).map(id=>source.hand.find(c=>c.id===id)).filter((c):c is Card=>Boolean(c));});
  return state;
 }
 broadcast(r: Room) { for (const p of r.players) if (!p.ai) this.send(p.socket, { type: 'state', room: this.view(r, p) }); }
 log(r: Room, text: string, actor?: Player) { const id=randomUUID(); r.log.unshift({ id, text }); r.log.length = Math.min(r.log.length, 8); if(actor)actor.lastAction={id,text};this.audit(actor,'game_event','info',{reason:text},r); }
 resetPlayer(p: Player) { p.robNotices=[]; p.hand = []; p.handVersion++; p.fieldVersion=0;p.draftIds=[]; p.score = 0; p.calledGo=false; p.ready = true; p.rematch = false; p.judgment = undefined; p.lastPlayed=undefined; p.playedSentences=[]; p.lastAction=undefined; p.reaction=undefined; p.reactionAt=0; p.ratingDelta = 0; p.reward = 0; p.baseReward=0;p.opponentRating=undefined;p.rewardRatio=undefined; p.seen.clear(); }
 roomList():RoomListing[]{return [...this.rooms.values()].filter(r=>r.custom&&r.phase==='lobby').map(r=>({code:r.code,name:r.name??`${r.players[0]?.name??'플레이어'}님의 방`,hostName:r.players.find(p=>p.id===r.hostId)?.name??'',humans:r.players.filter(p=>!p.ai).length,aiCount:r.players.filter(p=>p.ai).length,maxPlayers:RULES.maxPlayers}));}
 sendRoomList(socket:WebSocket|undefined){this.send(socket,{type:'roomList',rooms:this.roomList()});}
 publishRoomList(){const payload={type:'roomList',rooms:this.roomList()};for(const p of this.sessions.values())if(!p.ai)this.send(p.socket,payload);}
 createRoom(p:Player){
  if(p.room)return this.fail(p,'먼저 현재 방에서 나가 주세요.');
  if(this.rooms.size>=500)return this.fail(p,'방이 모두 사용 중입니다. 잠시 후 다시 시도하세요.');
  let code:string;do{code=String(randomInt(100000,1000000));}while(this.rooms.has(code));
  this.resetPlayer(p);p.room=code;
  const r:Room={code,custom:true,name:`${p.name}님의 방`,hostId:p.id,phase:'lobby',matchId:randomUUID(),players:[p],deck:[],discard:[],dealCursor:0,stageEndsAt:0,nextDealAt:0,dealSerial:0,goCount:0,highScore:0,endsAt:0,expiresAt:0,log:[]};
  this.rooms.set(code,r);this.broadcast(r);this.publishRoomList();
 }
 joinRoom(p:Player,code:unknown){
  if(p.room)return this.fail(p,'먼저 현재 방에서 나가 주세요.');
  const r=typeof code==='string'?this.rooms.get(code):undefined;
  if(!r?.custom||r.phase!=='lobby')return this.fail(p,'입장할 수 없는 방이에요.');
  if(r.players.length>=RULES.maxPlayers)return this.fail(p,'방이 가득 찼어요.');
  this.resetPlayer(p);p.room=r.code;r.players.push(p);this.broadcast(r);this.publishRoomList();
 }
 lobbyRoom(p:Player){const r=p.room?this.rooms.get(p.room):undefined;return r?.custom&&r.phase==='lobby'?r:undefined;}
 renameRoom(p:Player,name:unknown){
  const r=this.lobbyRoom(p);if(!r||r.hostId!==p.id)return this.fail(p,'방장만 방 이름을 바꿀 수 있어요.');
  const clean=typeof name==='string'?name.trim().normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,''):'';
  if(!clean||clean.length>30)return this.fail(p,'방 이름은 1~30자로 입력해 주세요.');
  r.name=clean;this.broadcast(r);this.publishRoomList();
 }
 addRoomAI(p:Player){
  const r=this.lobbyRoom(p);if(!r||r.hostId!==p.id)return this.fail(p,'방장만 AI를 추가할 수 있어요.');
  if(r.players.length>=RULES.maxPlayers)return this.fail(p,'최대 6명까지 입장할 수 있어요.');
  const bot=this.newPlayer(`로고스 AI ${r.players.filter(x=>x.ai).length+1}`);bot.token='';bot.ai='normal';bot.room=r.code;bot.avatar=avatars[r.players.length%avatars.length];r.players.push(bot);this.broadcast(r);this.publishRoomList();
 }
 removeRoomAI(p:Player,id:unknown){
  const r=this.lobbyRoom(p);if(!r||r.hostId!==p.id)return this.fail(p,'방장만 AI를 제거할 수 있어요.');
  const bot=r.players.find(x=>x.id===id&&x.ai);if(!bot)return this.fail(p,'제거할 AI가 없어요.');
  bot.room=undefined;r.players=r.players.filter(x=>x!==bot);this.broadcast(r);this.publishRoomList();
 }
 startRoom(p:Player){
  const r=this.lobbyRoom(p);if(!r||r.hostId!==p.id)return this.fail(p,'방장만 게임을 시작할 수 있어요.');
  if(r.players.some(x=>!x.ai&&x.socket?.readyState!==1))return this.fail(p,'연결이 끊긴 플레이어가 있어요. 잠시 기다려 주세요.');
  this.reveal(r);this.publishRoomList();
 }
 quick(p: Player) {
  if (p.room) return this.fail(p, '이미 매칭 중이거나 대전 중이에요.');
  const open = [...this.rooms.values()].find(r => r.phase === 'matching' && r.players.filter(x => !x.ai).length < RULES.maxPlayers && compatibleRatings(r.players.filter(x=>!x.ai).map(x=>x.rating),p.rating) && r.players.some(x => !x.ai && x.socket?.readyState === 1));
  if (open) { open.players = open.players.filter(x => !x.ai); this.resetPlayer(p); p.room = open.code; open.players.push(p); if (open.players.length === RULES.maxPlayers) this.reveal(open); else this.broadcast(open); return; }
  if (this.rooms.size >= 500) return this.fail(p, '방이 모두 사용 중입니다. 잠시 후 다시 시도하세요.');
  let code: string; do { code = String(randomInt(100000, 1000000)); } while (this.rooms.has(code));
  this.resetPlayer(p); p.room = code;
  const r: Room = { code, phase: 'matching', matchId: randomUUID(), players: [p], deck: [], discard: [], dealCursor: 0, stageEndsAt: Date.now() + this.matchingMs, nextDealAt: 0, dealSerial: 0, goCount: 0, highScore: 0, endsAt: 0, expiresAt: Date.now() + this.lobbyMs, log: [] };
  this.rooms.set(code, r); this.broadcast(r);
 }
 reveal(r: Room) {
  while(!r.custom&&r.players.length<this.minimumPlayers){
   const bot=this.newPlayer(`로고스 AI ${r.players.filter(p=>p.ai).length+1}`);
   bot.token='';bot.ai='normal';bot.room=r.code;bot.avatar=avatars[r.players.length%avatars.length];r.players.push(bot);
  }
  const center=roomRating(r.players.filter(x=>!x.ai).map(x=>x.rating)),bots=r.players.filter(x=>x.ai);bots.forEach((bot,i)=>{const offset=(bots.length===1?0:bots.length===2?[-.05,.05][i]:[-.08,0,.08][i%3])+randomInt(-10,11)/1000;bot.rating=Math.max(0,Math.round(center*(1+offset)));bot.ai=aiDifficulty(bot.rating);});
  r.phase = 'reveal'; r.matchId = randomUUID(); r.stageEndsAt = Date.now() + this.revealMs; r.endsAt = 0; r.finalRound=false; r.goCount = 0; r.highScore = 0; r.leaderId=undefined; r.drawVote=undefined; r.nextDrawRequestAt=0; r.testMode = false; r.decision = undefined; r.exchange=undefined; r.winner = undefined; r.reason = undefined; r.dealSerial = 0; r.log = []; r.discard = [];
  r.deck = shuffle(DECK_FACES.map(face=>({...face,id:randomUUID()}))); r.dealCursor=randomInt(r.players.length);
  for (const p of r.players) this.resetPlayer(p);
  r.expiresAt = this.durationMs > 0 ? Date.now() + this.revealMs + this.dealingMs + this.durationMs + this.resultMs + 60_000 : 0;
  this.log(r, `${r.players.length}인 매칭 성사! 하나의 덱에서 카드를 나눕니다.`); this.broadcast(r);
 }
 deal(r: Room, count: number) {
  if (!r.deck.length) return;
  // A single physical copy per face. Used cards never return to this match's deck.
  const changed=new Set<Player>();
  for(let n=0;n<count*r.players.length&&r.deck.length;n++){
   const p=r.players[r.dealCursor%r.players.length];r.dealCursor=(r.dealCursor+1)%r.players.length;
   p.hand.push(r.deck.pop()!);changed.add(p);
  }
  for(const p of changed)p.handVersion++;r.dealSerial++;
 }
 begin(r: Room) { const now = Date.now(); r.phase = 'battle'; r.endsAt = this.durationMs > 0 ? now + this.durationMs : 0; r.nextDealAt = now + this.dealMs; r.drawVote=this.newDrawVote(r); for (const p of r.players) { p.actionAt = now; p.nextAI = now + thinkMs(p.ai ?? 'normal'); } this.log(r, '대전 시작 · 30초마다 전원 1장, 전원이 먼저 동의하면 즉시 배분'); this.broadcast(r); }
 finish(r: Room, reason: string, forfeiter?: string) {
  if (!['battle', 'dealing', 'reveal'].includes(r.phase)) return;
  r.phase = 'result'; r.decision = undefined;r.drawVote=undefined;r.exchange=undefined; r.reason = reason; r.expiresAt = Date.now()+this.resultMs;
  const eligible = r.players.filter(p => p.id !== forfeiter), top = Math.max(...eligible.map(p => p.score)); const leaders = eligible.filter(p => p.score === top); r.winner = leaders.length === 1 ? leaders[0].id : null;
  const ratings = new Map(r.players.map(p => [p.id, p.rating]));
   for (const p of r.players) {
    if(r.testMode){p.ratingDelta=0;p.reward=0;p.baseReward=0;continue;}
   let delta = 0; for (const other of r.players) if (other !== p) { const actual = p.id === forfeiter ? 0 : other.id === forfeiter ? 1 : p.score === other.score ? .5 : p.score > other.score ? 1 : 0; const expected = 1 / (1 + 10 ** ((ratings.get(other.id)! - ratings.get(p.id)!) / 400)); delta += actual - expected; }
   p.ratingDelta = Math.round(24 * delta / Math.max(1, r.players.length - 1)); p.rating = Math.max(0, p.rating + p.ratingDelta); p.ratingDelta=p.rating-(ratings.get(p.id)??p.rating); const reward=victoryPoints(ratings.get(p.id)!,r.players.filter(other=>other!==p).map(other=>ratings.get(other.id)!),Boolean(p.calledGo));p.baseReward=r.winner===p.id&&p.id!==forfeiter?reward.base:0;p.opponentRating=reward.average;p.rewardRatio=reward.ratio;p.reward=r.winner===p.id&&p.id!==forfeiter?reward.total:0;p.points+=p.reward;
   if(p.accountId){const account=[...this.accounts.values()].find(a=>a.id===p.accountId);if(account){account.rating=p.rating;account.points=p.points;}}
  }
  this.log(r, reason); this.broadcast(r);
 }
 cancel(r:Room,reason:string){
  if(!['matching','reveal','dealing','battle'].includes(r.phase))return;
  this.rooms.delete(r.code);
  for(const p of r.players){p.room=undefined;if(p.ai)continue;p.resumeNotice=reason;this.send(p.socket,{type:'home',rating:p.rating,points:p.points,message:reason});if(p.socket?.readyState===1)p.resumeNotice=undefined;}
 }
 debugSpecials(p:Player,msg:Record<string,unknown>){
  const r=p.room&&this.rooms.get(p.room),id=String(msg.requestId??'');
  if(!r||r.phase!=='battle'||msg.matchId!==r.matchId||p.ai||r.players.some(x=>x!==p&&!x.ai))return this.fail(p,'특수카드 치트는 AI 대전에서만 사용할 수 있어요.',id);
  if(!/^[\w-]{1,80}$/.test(id))return this.fail(p,'올바르지 않은 요청 번호예요.',id);
  if(p.seen.has(id)){this.send(p.socket,{type:'ack',requestId:id,duplicate:true});return;}
  p.seen.add(id);if(p.seen.size>256)p.seen.delete(p.seen.values().next().value!);
  const kinds:Kind[]=['get2','get3','rob','exchange','protect'];
  let moved=0;
  for(const kind of kinds){
   if(p.hand.some(c=>c.kind===kind))continue;
   let card:Card|undefined;
   const deckAt=r.deck.findIndex(c=>c.kind===kind);
   if(deckAt>=0)card=r.deck.splice(deckAt,1)[0];
   if(!card)for(const other of r.players){if(other===p)continue;const at=other.hand.findIndex(c=>c.kind===kind);if(at>=0){card=other.hand.splice(at,1)[0];other.handVersion++;break;}}
   if(!card){const at=r.discard.findIndex(c=>c.kind===kind);if(at>=0)card=r.discard.splice(at,1)[0];}
   if(card){p.hand.push(card);moved++;}
  }
  r.testMode=true;r.exchange=undefined;
  if(moved){p.handVersion++;r.dealSerial++;}
  this.log(r,`${p.name} 님이 테스트용 특수카드 ${moved}장을 받았어요. 이 판은 레이팅과 포인트에 반영되지 않습니다.`);
  this.send(p.socket,{type:'ack',requestId:id});this.broadcast(r);
 }
 allRematch(r: Room) { return r.players.length >= 2 && r.players.every(p => p.rematch && (p.ai || p.socket?.readyState === 1)); }
 leave(p: Player) {
  const r = p.room ? this.rooms.get(p.room) : undefined;
  if(r?.custom&&r.phase==='lobby'){
   r.players=r.players.filter(x=>x!==p);
   p.room=undefined;
   if(!r.players.some(x=>!x.ai)){for(const bot of r.players)bot.room=undefined;this.rooms.delete(r.code);}
   else{if(r.hostId===p.id)r.hostId=r.players.find(x=>!x.ai)!.id;this.broadcast(r);}
   this.send(p.socket,{type:'home',rating:p.rating,points:p.points});this.publishRoomList();return;
  }
  if (r) { if(r.exchange&&(r.exchange.fromId===p.id||r.exchange.toId===p.id))r.exchange=undefined; r.drawVote=undefined; this.finish(r, `${p.name} 님이 대전을 포기했어요.`, p.id); r.players = r.players.filter(x => x !== p); if(r.custom&&r.hostId===p.id)r.hostId=r.players.find(x=>!x.ai)?.id; for (const x of r.players) x.rematch = false; if (!r.players.some(x => !x.ai)) this.rooms.delete(r.code); else { if (r.phase === 'matching' && r.players.length === 1) { const bot = this.newPlayer('로고스 AI'); bot.ai = 'normal'; bot.room = r.code; bot.token = ''; r.players.push(bot); } this.broadcast(r); } }
  p.room = undefined; this.send(p.socket, { type: 'home', rating: p.rating, points: p.points });
 }
 choice(p: Player, msg: Record<string, unknown>) {
  const r = p.room && this.rooms.get(p.room), d = r && r.decision;
  if (!r || r.phase !== 'battle' || !d || d.id !== msg.decisionId || d.playerId !== p.id || msg.matchId !== r.matchId) return this.fail(p, '현재 고 / 스톱 주도권이 없어요.');
  if (msg.choice !== 'go' && msg.choice !== 'stop') return this.fail(p, '고 또는 스톱을 선택하세요.');
  if (msg.choice === 'stop') return this.finish(r, `${p.name} 님의 스톱! 개인 고 보상 정산`);
  if (r.goCount >= RULES.maxGo) return this.fail(p, '3고 이후에는 스톱만 가능합니다.');
  const paused = Date.now() - d.startedAt; p.calledGo=true; r.goCount++; if(r.endsAt > 0&&!r.finalRound) r.endsAt += paused; if(r.nextDealAt>0)r.nextDealAt+=paused; if(r.drawVote?.aiApproveAt)for(const id of Object.keys(r.drawVote.aiApproveAt))r.drawVote.aiApproveAt[id]+=paused; for (const x of r.players) x.nextAI += paused; r.decision = undefined;
  if(r.goCount===RULES.maxGo)return this.finish(r,`${p.name} 님의 3고! 개인 고 보상 정산`);
  this.log(r, `${p.name} 님의 ${r.goCount}고! 고를 외친 플레이어만 획득 포인트 2배 · ${r.highScore}점을 먼저 넘으면 주도권 획득`); this.broadcast(r);
 }
 newDrawVote(r:Room):DrawVote|undefined{return r.deck.length>=r.players.length?{id:randomUUID(),approved:[],aiApproveAt:Object.fromEntries(r.players.filter(x=>x.ai).map(x=>[x.id,Date.now()+randomInt(1200,9000)]))}:undefined;}
 distribute(r:Room,source:'automatic'|'unanimous'){
  if(r.deck.length<r.players.length){r.drawVote=undefined;r.nextDealAt=0;this.broadcast(r);return false;}
  this.deal(r,1);r.drawVote=this.newDrawVote(r);r.nextDealAt=r.drawVote?Date.now()+this.dealMs:0;r.nextDrawRequestAt=Date.now()+3000;
  this.log(r,source==='automatic'?'30초 자동 카드 배분 · 전원 1장':'전원 동의 · 카드 1장씩 배분');this.broadcast(r);return true;
 }
 drawRequest(p:Player,msg:Record<string,unknown>){this.fail(p,'카드 배분은 30초 자동 또는 전원 동의로 진행됩니다.',String(msg.requestId??''));}
 discardCard(p:Player,msg:Record<string,unknown>){
  const r=p.room&&this.rooms.get(p.room),id=String(msg.requestId??'');
  if(!r||r.phase!=='battle'||msg.matchId!==r.matchId)return this.fail(p,'진행 중인 경기가 없어요.',id);
  if(!/^[\w-]{1,80}$/.test(id))return this.fail(p,'올바르지 않은 요청 번호예요.',id);
  if(p.seen.has(id))return this.send(p.socket,{type:'ack',requestId:id,duplicate:true});
  if(r.decision||Date.now()<p.actionAt||msg.handVersion!==p.handVersion)return this.fail(p,'지금은 카드를 버릴 수 없어요.',id);
  const hand=p.hand.find(c=>c.id===msg.cardId),field=fieldCards(p).find(c=>c.id===msg.cardId),card=hand??field;
  if(!card||(!hand&&msg.fieldVersion!==(p.fieldVersion??0)))return this.fail(p,'내 카드가 바뀌었어요. 다시 확인해 주세요.',id);
  p.seen.add(id);if(p.seen.size>256)p.seen.delete(p.seen.values().next().value!);
  this.removeOwnedCard(r,p,card.id);if(!r.discard.some(c=>c.id===card.id))r.discard.push(card);
  p.handVersion++;p.actionAt=Date.now()+RULES.actionCooldownMs;
  if(r.exchange&&((r.exchange.fromId===p.id&&r.exchange.offerId===card.id)||(r.exchange.toId===p.id&&r.exchange.wantedId===card.id)))r.exchange=undefined;
  this.audit(p,'discarded','info',{requestId:id,cardId:card.id,source:hand?'hand':'field'},r,[card]);
  this.log(r,`${p.name} 님이 카드를 버렸어요.`,p);this.send(p.socket,{type:'ack',requestId:id});this.broadcast(r);
 }
 drawVote(p:Player,msg:Record<string,unknown>){
  const r=p.room?this.rooms.get(p.room):undefined,vote=r?.drawVote;
  if(!r||r.phase!=='battle'||r.decision||msg.matchId!==r.matchId||!vote||msg.voteId!==vote.id)return this.fail(p,'현재 동의할 카드 배분이 없어요.');
  if(msg.approve!==true)return this.fail(p,'카드 배분에는 동의만 할 수 있어요.');
  if(vote.approved.includes(p.id))return this.send(p.socket,{type:'ack',voteId:vote.id,duplicate:true});
  vote.approved.push(p.id);this.send(p.socket,{type:'ack',voteId:vote.id});
  if(vote.approved.length===r.players.length)this.distribute(r,'unanimous');else this.broadcast(r);
 }
 react(p:Player,msg:Record<string,unknown>){
  const r=p.room&&this.rooms.get(p.room);
  if(!r||r.phase!=='battle'||msg.matchId!==r.matchId)return this.fail(p,'대전 중에만 감정표현을 보낼 수 있어요.');
  if(!REACTIONS.includes(msg.emoji as Reaction))return this.fail(p,'사용할 수 없는 감정표현이에요.');
  const now=Date.now();if(now-(p.reactionAt??0)<1800)return this.fail(p,'감정표현은 잠시 후 다시 보낼 수 있어요.');
  p.reactionAt=now;p.reaction={id:randomUUID(),emoji:msg.emoji as Reaction,at:now};this.broadcast(r);
 }
 syncDraft(p:Player,msg:Record<string,unknown>){
  const r=p.room&&this.rooms.get(p.room);
  if(!r||r.phase!=='battle'||p.ai||msg.matchId!==r.matchId||msg.handVersion!==p.handVersion)return;
  if(!Array.isArray(msg.cards)||msg.cards.length>RULES.maxSelected||msg.cards.some(id=>typeof id!=='string')||new Set(msg.cards).size!==msg.cards.length)return;
  const ids=msg.cards as string[];
  if(ids.some(id=>!p.hand.some(c=>c.id===id&&!['get2','get3','rob','exchange','protect'].includes(c.kind))))return;
  if(JSON.stringify(p.draftIds??[])===JSON.stringify(ids))return;
  p.draftIds=ids;this.broadcast(r);
 }
 inspectRob(p:Player,msg:Record<string,unknown>){
  const r=p.room&&this.rooms.get(p.room);
  if(!r||r.phase!=='battle'||msg.matchId!==r.matchId||r.decision)return this.fail(p,'지금은 ROB 대상을 볼 수 없어요.');
  const card=p.hand.find(c=>c.id===msg.cardId&&c.kind==='rob');
  if(!card)return this.fail(p,'ROB 카드를 가지고 있어야 해요.');
  this.send(p.socket,{type:'robView',matchId:r.matchId,cardId:card.id,players:r.players.filter(x=>x!==p).map(x=>({id:x.id,name:x.name,avatar:x.avatar,connected:Boolean(x.ai||x.socket?.readyState===1),handVersion:x.handVersion,fieldVersion:x.fieldVersion??0,protected:x.hand.some(c=>c.kind==='protect'),cards:x.hand.some(c=>c.kind==='protect')?[]:[...x.hand.filter(canTransferCard).map(c=>({...c,source:'hand' as const})),...fieldCards(x).filter(canTransferCard).map(c=>({...c,source:'field' as const}))]}))});
 }
 inspectExchange(p:Player,msg:Record<string,unknown>){
  const r=p.room&&this.rooms.get(p.room);
  if(!r||r.phase!=='battle'||r.decision||msg.matchId!==r.matchId||!p.hand.some(c=>c.id===msg.cardId&&c.kind==='exchange'))return this.fail(p,'EXCHANGE 카드를 가진 상태에서만 상대 손패를 볼 수 있어요.');
  this.send(p.socket,{type:'exchangeView',matchId:r.matchId,cardId:msg.cardId,players:r.players.filter(x=>x!==p).map(x=>({id:x.id,name:x.name,avatar:x.avatar,handVersion:x.handVersion,fieldVersion:x.fieldVersion??0,cards:[...x.hand,...fieldCards(x)].filter(canTransferCard)}))});
 }
 special(p:Player,msg:Record<string,unknown>){
  const r=p.room&&this.rooms.get(p.room),id=String(msg.requestId??'');
  if(!r||r.phase!=='battle'||msg.matchId!==r.matchId)return this.fail(p,'진행 중인 경기가 없어요.',id);
  if(!/^[\w-]{1,80}$/.test(id))return this.fail(p,'올바르지 않은 요청 번호예요.');
  if(p.seen.has(id)){this.send(p.socket,{type:'ack',requestId:id,duplicate:true});return;}
  if(r.decision||Date.now()<p.actionAt||msg.handVersion!==p.handVersion)return this.fail(p,'지금은 기능 카드를 사용할 수 없어요.',id);
  const card=p.hand.find(c=>c.id===msg.cardId),target=r.players.find(x=>x.id===msg.targetId&&x!==p);
  if(!card||!['get2','get3','rob','exchange'].includes(card.kind))return this.fail(p,'사용할 수 있는 기능 카드가 없어요.',id);
  if(r.exchange?.fromId===p.id&&r.exchange.offerId===card.id)return this.fail(p,'교환 요청 중인 카드는 사용할 수 없어요.',id);
  if(card.kind==='exchange'&&r.exchange)return this.fail(p,'이미 교환 요청이 진행 중이에요.',id);
  if(card.kind==='rob'&&(!target||(!target.ai&&target.socket?.readyState!==1)||!(target.hand.length||fieldCards(target).length)))return this.fail(p,'카드를 가진 상대를 선택해 주세요.',id);
  if(card.kind==='exchange'&&(!target||(!target.ai&&target.socket?.readyState!==1)||!(target.hand.length||fieldCards(target).length)))return this.fail(p,'카드를 가진 상대를 선택해 주세요.',id);
  if(card.kind==='rob'&&(!target||typeof msg.stealId!=='string'||(msg.stealSource!=='hand'&&msg.stealSource!=='field')||(msg.stealSource==='hand'&&(msg.targetHandVersion!==target.handVersion||!target.hand.some(c=>c.id===msg.stealId)))||(msg.stealSource==='field'&&(msg.targetFieldVersion!==(target.fieldVersion??0)||!fieldCards(target).some(c=>c.id===msg.stealId)||!r.discard.some(c=>c.id===msg.stealId)))))return this.fail(p,'상대 카드가 바뀌었어요. ROB 대상을 다시 확인해 주세요.',id);
  if(card.kind==='exchange'&&(typeof msg.offerId!=='string'||msg.offerId===card.id||![...p.hand,...fieldCards(p)].some(c=>c.id===msg.offerId)))return this.fail(p,'교환할 내 카드 한 장을 골라 주세요.',id);
  if(card.kind==='exchange'&&(!target||msg.targetHandVersion!==target.handVersion||(fieldCards(target).some(c=>c.id===msg.wantedId)&&msg.targetFieldVersion!==(target.fieldVersion??0))||typeof msg.wantedId!=='string'||![...target.hand,...fieldCards(target)].some(c=>c.id===msg.wantedId)))return this.fail(p,'상대 카드가 바뀌었어요. 교환할 카드를 다시 확인해 주세요.',id);
  if(card.kind==='rob'&&target&&!([...target.hand,...fieldCards(target)].some(c=>c.id===msg.stealId&&canTransferCard(c))))return this.fail(p,'ROB·EXCHANGE·PROTECT 카드는 뺏을 수 없어요.',id);
  if(card.kind==='exchange'&&(![...p.hand,...fieldCards(p)].some(c=>c.id===msg.offerId&&canTransferCard(c))||!target||![...target.hand,...fieldCards(target)].some(c=>c.id===msg.wantedId&&canTransferCard(c))))return this.fail(p,'ROB·EXCHANGE·PROTECT 카드는 교환할 수 없어요.',id);
  if((card.kind==='get2'||card.kind==='get3')&&!r.deck.length)return this.fail(p,'공용 덱이 비었어요.',id);
  const specialCards=[card,...[msg.offerId,msg.wantedId,msg.stealId].flatMap(id=>{const found=r.players.flatMap(x=>[...x.hand,...fieldCards(x)]).find(c=>c.id===id);return found?[found]:[];})];
  p.seen.add(id);if(p.seen.size>256)p.seen.delete(p.seen.values().next().value!);
  const blocked=card.kind==='rob'&&target?.hand.some(c=>c.kind==='protect');
  if(!blocked){p.hand=p.hand.filter(c=>c.id!==card.id);p.handVersion++;r.discard.push(card);}p.actionAt=Date.now()+RULES.actionCooldownMs;
  if(card.kind==='get2'||card.kind==='get3'){
   const count=Math.min(r.deck.length,card.kind==='get2'?2:3);
   for(let i=0;i<count;i++)p.hand.push(r.deck.pop()!);
   p.handVersion++;r.dealSerial++;if(r.deck.length<r.players.length){r.drawVote=undefined;r.nextDealAt=0;}this.log(r,`${p.name} 님이 GET ${card.kind==='get2'?2:3} 사용 · ${count}장 획득`,p);
  }else if(card.kind==='rob'&&target){
   if(target.hand.some(c=>c.kind==='protect')){this.log(r,`${p.name} 님의 ROB을 ${target.name} 님의 PROTECT가 막았어요.`,p);target.lastAction={id:randomUUID(),text:`${target.name} 님이 PROTECT로 ROB 방어`};}
   else{
    let stolen:Card;
    if(msg.stealSource==='field'){
     stolen=r.discard.splice(r.discard.findIndex(c=>c.id===msg.stealId),1)[0];
     target.lastPlayed=(target.lastPlayed??[]).filter(c=>c.id!==stolen.id);
     target.playedSentences=(target.playedSentences??[]).map(sentence=>sentence.filter(c=>c.id!==stolen.id)).filter(sentence=>sentence.length);
     target.fieldVersion=(target.fieldVersion??0)+1;
    }else{stolen=target.hand.splice(target.hand.findIndex(c=>c.id===msg.stealId),1)[0];target.handVersion++;target.draftIds=(target.draftIds??[]).filter(id=>id!==stolen.id);}
    p.hand.push(stolen);p.handVersion++;
    target.robNotices=[...(target.robNotices??[]),{id:randomUUID(),fromId:p.id,fromName:p.name,fromAvatar:p.avatar,card:{...stolen},source:msg.stealSource as "hand"|"field"}].slice(-8);
    this.log(r,`${p.name} 님이 ${target.name} 님의 ${msg.stealSource==='field'?'필드':'손패'}에서 ${stolen.kind} 카드 1장을 뺏었어요.`,p);
    target.lastAction={id:randomUUID(),text:`${target.name} 님의 ${msg.stealSource==='field'?'필드':'손패'} 카드 1장 ROB으로 이동`};
   }
  }else if(card.kind==='exchange'&&target){
   r.exchange={id:randomUUID(),fromId:p.id,toId:target.id,offerId:String(msg.offerId),wantedId:String(msg.wantedId),expiresAt:Date.now()+15000};
   this.log(r,`${p.name} 님이 ${target.name} 님에게 교환을 요청했어요.`,p);
  }
  this.audit(p,'special_result','info',{...msg,reason:blocked?'protected':'used'},r,specialCards);
  this.send(p.socket,{type:'ack',requestId:id});this.broadcast(r);
 }
 removeOwnedCard(r:Room,p:Player,id:string){p.hand=p.hand.filter(c=>c.id!==id);if(fieldCards(p).some(c=>c.id===id)){r.discard=r.discard.filter(c=>c.id!==id);p.lastPlayed=(p.lastPlayed??[]).filter(c=>c.id!==id);p.playedSentences=(p.playedSentences??[]).map(sentence=>sentence.filter(c=>c.id!==id)).filter(sentence=>sentence.length);p.fieldVersion=(p.fieldVersion??0)+1;}p.draftIds=(p.draftIds??[]).filter(x=>x!==id);}
 exchangeReply(p:Player,msg:Record<string,unknown>){
  const r=p.room?this.rooms.get(p.room):undefined,ex=r?.exchange;
  if(!r||r.phase!=='battle'||!ex||msg.matchId!==r.matchId||msg.exchangeId!==ex.id||ex.toId!==p.id)return this.fail(p,'유효한 교환 요청이 없어요.');
  const sender=r.players.find(x=>x.id===ex.fromId),offer=sender&&[...sender.hand,...fieldCards(sender)].find(c=>c.id===ex.offerId),given=[...p.hand,...fieldCards(p)].find(c=>c.id===ex.wantedId);
  if(msg.accept!==true&&msg.accept!==false)return this.fail(p,'교환 수락 또는 빠른 답장을 선택해 주세요.');
  if(msg.accept===false&&!EXCHANGE_REPLIES.includes(msg.reason as typeof EXCHANGE_REPLIES[number]))return this.fail(p,'빠른 답장을 선택해 주세요.');
  if(msg.accept===true&&(!sender||!offer||!given||!canTransferCard(offer)||!canTransferCard(given)))return this.fail(p,'선택한 교환 카드가 더 이상 없어요.');
  r.exchange=undefined;
   if(msg.accept===true&&sender&&offer&&given){this.removeOwnedCard(r,sender,offer.id);this.removeOwnedCard(r,p,given.id);sender.draftIds=(sender.draftIds??[]).filter(id=>id!==offer.id);p.draftIds=(p.draftIds??[]).filter(id=>id!==given.id);sender.hand.push(given);p.hand.push(offer);sender.handVersion++;p.handVersion++;this.log(r,`${sender.name} 님과 ${p.name} 님이 카드를 한 장씩 교환했어요.`,p);sender.lastAction={id:randomUUID(),text:`${sender.name} 님이 카드 교환 완료`};}
  else {this.log(r,`${p.name} 님이 교환을 거절했어요.`,p);if(sender){const reason=String(msg.reason);this.send(sender.socket,{type:'exchangeResponse',matchId:r.matchId,fromName:p.name,reason});sender.lastAction={id:randomUUID(),text:`${p.name} 님의 답장 · ${reason}`};}}
  this.broadcast(r);
 }
 autoSpecial(r:Room,p:Player){
  if(r.exchange?.toId===p.id)return false;
  const usable=p.hand.find(c=>(c.kind==='get2'||c.kind==='get3')&&r.deck.length);
  const rivals=r.players.filter(x=>x!==p&&[...x.hand,...fieldCards(x)].some(canTransferCard)&&(!x.ai?x.socket?.readyState===1:true));
  const target=rivals[randomInt(Math.max(1,rivals.length))];
  const action=usable??(target&&p.hand.find(c=>c.kind==='rob'||c.kind==='exchange'));
  if(!action)return false;
  const offer=action.kind==='exchange'?p.hand.find(c=>c.id!==action.id&&canTransferCard(c)):undefined;
  if(action.kind==='exchange'&&(!offer||r.exchange||!target?.hand.length))return false;
  const robOptions=action.kind==='rob'&&target&&!target.hand.some(c=>c.kind==='protect')?[...target.hand.filter(canTransferCard).map(card=>({card,source:'hand' as const})),...fieldCards(target).filter(canTransferCard).map(card=>({card,source:'field' as const}))]:[];
  const robChoice=robOptions.length?robOptions[randomInt(robOptions.length)]:undefined;
  if(action.kind==='rob'&&!robChoice)return false;
  this.special(p,{matchId:r.matchId,requestId:randomUUID(),handVersion:p.handVersion,cardId:action.id,targetId:target?.id,offerId:offer?.id,wantedId:target?.hand.find(canTransferCard)?.id,stealId:robChoice?.card.id,stealSource:robChoice?.source,targetHandVersion:target?.handVersion,targetFieldVersion:target?.fieldVersion??0});
  return true;
 }
 action(p: Player, msg: Record<string, unknown>) {
  const r = p.room && this.rooms.get(p.room);
  if (!r || r.phase !== 'battle') return this.fail(p, '진행 중인 경기가 없어요.', String(msg.requestId));
  if (typeof msg.requestId !== 'string' || !/^[\w-]{1,80}$/.test(msg.requestId)) return this.fail(p, '올바르지 않은 요청 번호예요.');
  if (p.seen.has(msg.requestId)) { this.send(p.socket, { type: 'ack', requestId: msg.requestId, duplicate: true }); return; }

  if (msg.matchId !== r.matchId || msg.handVersion !== p.handVersion) return this.fail(p, '이전 카드 상태의 요청이에요. 현재 손패로 다시 조합해 주세요.', msg.requestId);
  if (r.decision) return this.fail(p, '고 / 스톱 선택 중에는 잠시 기다려 주세요.', msg.requestId);
  if (r.endsAt > 0 && Date.now() >= r.endsAt) { this.finish(r, r.finalRound?'마지막 5분이 끝났어요. 최종 점수로 정산합니다.':'경기 시간이 끝났어요. 현재 점수로 정산합니다.'); return; }
  if (Date.now() < p.actionAt) return this.fail(p, '잠깐! 다음 행동까지 조금 기다려 주세요.', msg.requestId);
  if (!Array.isArray(msg.cards) || msg.cards.length < 1 || msg.cards.length > RULES.maxSelected || msg.cards.some(id => typeof id !== 'string') || new Set(msg.cards).size !== msg.cards.length) return this.fail(p, '서로 다른 카드 1~15장을 선택해 주세요.', msg.requestId);
  const selected = msg.cards.map(id => p.hand.find(c => c.id === id));
  if(r.exchange?.fromId===p.id&&(msg.cards as string[]).includes(r.exchange.offerId))return this.fail(p,'교환 요청 중인 카드는 문장에 사용할 수 없어요.',String(msg.requestId));
  if(selected.some(c=>c&&['get2','get3','rob','exchange','protect'].includes(c.kind)))return this.fail(p,'기능 카드는 문장에 넣을 수 없어요.',String(msg.requestId));
  if (selected.some(c => !c)) return this.fail(p, '내 손패에 없는 카드는 사용할 수 없어요.', msg.requestId);
  p.seen.add(msg.requestId);if(p.seen.size>256)p.seen.delete(p.seen.values().next().value!);
  p.draftIds=msg.cards as string[];
  p.actionAt = Date.now() + RULES.actionCooldownMs; p.judgment = judgeCards(selected as Card[]);
  this.audit(p,'judgment','info',{...msg,reason:p.judgment.message});
  p.judgment.submissionId=msg.requestId; p.judgment.accepted=p.judgment.valid && p.judgment.points>RULES.goThreshold;
  if (p.judgment.accepted) {
   p.score += p.judgment.points;
   const accepted = new Set((msg.cards as string[]).slice(p.judgment.usedStartIndex, p.judgment.usedStartIndex + p.judgment.usedLength));
   p.lastPlayed=(selected as Card[]).filter(c=>accepted.has(c.id));
   (p.playedSentences??=[]).push(p.lastPlayed);
   p.fieldVersion=(p.fieldVersion??0)+1;
   r.discard.push(...p.hand.filter(c => accepted.has(c.id))); p.hand = p.hand.filter(c => !accepted.has(c.id)); p.handVersion++;
   p.draftIds=[];
   this.log(r, `${p.name} · ${p.judgment.label} +${p.judgment.points}점`,p);
   if (p.score >= RULES.goThreshold && p.score > r.highScore) { r.highScore = p.score; r.leaderId=p.id; r.decision = { id: randomUUID(), playerId: p.id, startedAt: Date.now(), expiresAt: Date.now() + (p.ai ? this.decisionMs : this.humanDecisionMs) }; this.log(r, `${p.name} 님이 최고점 ${p.score}점! 고 / 스톱 선택권 획득`); }
  }
  this.audit(p,'submit_result','info',{...msg,points:p.judgment.points,valid:p.judgment.valid,patternType:p.judgment.patternType,usedStartIndex:p.judgment.usedStartIndex,usedLength:p.judgment.usedLength,accepted:p.judgment.accepted,reason:p.judgment.accepted?'scored':p.judgment.valid?'valid_below_threshold':'invalid_grammar'},undefined,selected as Card[]);
  this.send(p.socket, { type: 'ack', requestId: msg.requestId }); this.broadcast(r);
 }
 handle(p: Player, msg: Record<string, unknown>) {
  p.touchedAt = Date.now(); this.tick();
  if(msg.type==='clientEvent'){const last=this.telemetryAt.get(p.id)??0;if(Date.now()-last>=250){this.telemetryAt.set(p.id,Date.now());this.audit(p,'client',msg.code==='CLIENT_ERROR'||msg.code==='SUBMIT_TIMEOUT'?'error':msg.code==='SUBMIT_BLOCKED'?'warn':'info',msg);}return;}
  if(msg.type!=='ping')this.audit(p,'request','info',msg);
  if(msg.type==='register'||msg.type==='login')return this.authenticate(p,msg);
  if(msg.type==='logout')return this.logout(p);
  if(msg.type==='robNoticeRead'){const room=p.room&&this.rooms.get(p.room);if(room&&msg.matchId===room.matchId&&typeof msg.noticeId==='string'){p.robNotices=(p.robNotices??[]).filter(n=>n.id!==msg.noticeId);this.send(p.socket,{type:'state',room:this.view(room,p)});}return;}
  if (msg.type === 'ping') return this.send(p.socket, { type: 'pong', now: Date.now() });
  if (msg.type === 'quick') return this.quick(p);
  if (msg.type === 'roomList') return this.sendRoomList(p.socket);
  if (msg.type === 'createRoom') return this.createRoom(p);
  if (msg.type === 'joinRoom') return this.joinRoom(p,msg.code);
  if (msg.type === 'renameRoom') return this.renameRoom(p,msg.name);
  if (msg.type === 'addRoomAI') return this.addRoomAI(p);
  if (msg.type === 'removeRoomAI') return this.removeRoomAI(p,msg.id);
  if (msg.type === 'startRoom') return this.startRoom(p);
  if (msg.type === 'leave') return this.leave(p);
  if (msg.type === 'submit') return this.action(p, msg);
  if (msg.type === 'draft') return this.syncDraft(p,msg);
  if (msg.type === 'discard') return this.discardCard(p,msg);
  if (msg.type === 'drawRequest') return this.drawRequest(p,msg);
  if (msg.type === 'drawVote') return this.drawVote(p,msg);
  if (msg.type === 'react') return this.react(p,msg);
  if (msg.type === 'special') return this.special(p,msg);
  if (msg.type === 'inspectRob') return this.inspectRob(p,msg);
  if (msg.type === 'inspectExchange') return this.inspectExchange(p,msg);
  if (msg.type === 'debugSpecials') return this.debugSpecials(p,msg);
  if (msg.type === 'exchangeReply') return this.exchangeReply(p,msg);
  if (msg.type === 'choice') return this.choice(p, msg);
  const r = p.room && this.rooms.get(p.room);
  if (r && msg.type === 'rematch' && msg.matchId === r.matchId && r.phase === 'result' && !r.finalRound) { p.rematch = true; for (const x of r.players) if (x.ai) x.rematch = true; if (this.allRematch(r)) this.reveal(r); else this.broadcast(r); return; }
  this.fail(p, '현재 상태에서는 할 수 없는 행동이에요.');
 }
 tick() {
  const now = Date.now(); let aiSpent = 0;
  for (const r of this.rooms.values()) {
   if (r.expiresAt > 0 && now >= r.expiresAt) { const message=r.phase==='result'?'경기 결과 보관 시간이 끝났어요. 다시 시작해 주세요.':'방이 만료되었어요.';for (const p of r.players) { p.room = undefined;if(p.ai)continue;p.resumeNotice=message;this.send(p.socket, { type: 'home', message, rating: p.rating, points: p.points });if(p.socket?.readyState===1)p.resumeNotice=undefined; } this.rooms.delete(r.code); continue; }
   if (r.phase === 'lobby') {for(const p of [...r.players])if(!p.ai&&p.disconnectedAt&&now-p.disconnectedAt>=this.reconnectMs)this.leave(p);}
   else if (r.phase === 'matching') { for (const p of [...r.players]) if (!p.ai && p.disconnectedAt && now - p.disconnectedAt >= this.reconnectMs) this.leave(p); if (this.rooms.has(r.code) && now >= r.stageEndsAt && r.players.some(p => !p.ai && p.socket?.readyState === 1)) this.reveal(r); }
   else if (r.phase === 'reveal' && now >= r.stageEndsAt) { r.phase = 'dealing'; r.stageEndsAt = now + this.dealingMs; this.deal(r, RULES.handSize); this.broadcast(r); }
   else if (r.phase === 'dealing' && now >= r.stageEndsAt) this.begin(r);
   if (['battle', 'reveal', 'dealing'].includes(r.phase)) { const missing = r.players.find(p => !p.ai && p.disconnectedAt && now - p.disconnectedAt >= this.reconnectMs); if (missing){if(r.phase!=='battle'||r.players.filter(p=>!p.ai).every(p=>p.disconnectedAt!==undefined))this.cancel(r,'연결이 끊겨 경기가 취소됐어요. 레이팅과 포인트는 변경되지 않았습니다.');else this.finish(r, `${missing.name} 님의 재접속 유예시간이 끝났어요.`, missing.id);} }
   if(!this.rooms.has(r.code))continue;
   if (r.phase !== 'battle') continue;
   if(r.exchange){const ex=r.exchange;if(now>=ex.expiresAt||!r.players.find(p=>p.id===ex.fromId)?.hand.some(c=>c.id===ex.offerId)||!r.players.find(p=>p.id===ex.toId)?.hand.some(c=>c.id===ex.wantedId)){r.exchange=undefined;this.log(r,'교환 요청이 만료되었어요.');this.broadcast(r);}else if(r.players.find(p=>p.id===ex.toId)?.ai&&now>=ex.expiresAt-13000){const bot=r.players.find(p=>p.id===ex.toId)!;this.exchangeReply(bot,{matchId:r.matchId,exchangeId:ex.id,accept:true});}}
   if(r.deck.length<r.players.length&&(r.drawVote||r.nextDealAt>0)){r.drawVote=undefined;r.nextDealAt=0;this.broadcast(r);}
   if(!r.drawVote&&r.deck.length>=r.players.length){r.drawVote=this.newDrawVote(r);if(r.nextDealAt<=0)r.nextDealAt=now+this.dealMs;this.broadcast(r);}
   if(r.deck.length<r.players.length&&!r.finalRound){r.finalRound=true;r.endsAt=r.endsAt>0?Math.min(r.endsAt,now+300000):now+300000;this.log(r,'공용 덱 배분 종료 · 마지막 5분! 남은 카드로 역전할 수 있어요.');this.broadcast(r);}
   if(r.finalRound&&r.endsAt>0&&now>=r.endsAt){this.finish(r,'마지막 5분이 끝났어요. 최종 점수로 정산합니다.');continue;}
   if (r.decision) { const p = r.players.find(x => x.id === r.decision!.playerId)!; if (r.decision.expiresAt > 0 && now >= r.decision.expiresAt) this.finish(r, `${p.name} 님의 선택 시간이 끝나 자동 스톱됐어요.`); else if (p.ai && now - r.decision.startedAt > 1800) this.choice(p, { matchId: r.matchId, decisionId: r.decision.id, choice: r.goCount < RULES.maxGo ? 'go' : 'stop' }); continue; }
   if (r.endsAt > 0 && now >= r.endsAt) { this.finish(r, r.finalRound?'마지막 5분이 끝났어요. 최종 점수로 정산합니다.':'경기 시간이 끝났어요. 현재 점수로 정산합니다.'); continue; }
   if(!r.decision&&r.drawVote){let changed=false;for(const p of r.players)if(p.ai&&!r.drawVote.approved.includes(p.id)&&now>=(r.drawVote.aiApproveAt?.[p.id]??now)){r.drawVote.approved.push(p.id);changed=true;}if(r.drawVote.approved.length===r.players.length){this.distribute(r,'unanimous');continue;}if(changed)this.broadcast(r);}
   if(r.nextDealAt>0&&now>=r.nextDealAt){this.distribute(r,'automatic');continue;}
   for (const p of r.players) if (!r.decision && p.ai && now >= p.nextAI && aiSpent < 16) { p.nextAI = now + thinkMs(p.ai); if(this.autoSpecial(r,p))continue; const started = performance.now(), cards = chooseMove(p.hand, p.ai); aiSpent += performance.now() - started; if (cards && judgeCards(cards.map(id=>p.hand.find(c=>c.id===id)!)).points>RULES.goThreshold) this.action(p, { type: 'submit', cards, requestId: randomUUID(), matchId: r.matchId, handVersion: p.handVersion }); }
  }
  for (const [token, p] of this.sessions) if (!p.room && !p.socket && now - p.touchedAt > GUEST_RETENTION_MS) this.sessions.delete(token);
  for(const [hash,session] of this.accountSessions)if(session.expiresAt<=now)this.accountSessions.delete(hash);
 }
}








