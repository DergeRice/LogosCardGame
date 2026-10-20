import {BASIC_PROFILES} from '../shared/profiles.js';
import {migrateProfiles,migrateEmoteCatalog} from '../shared/store.js';
import {BASIC_EMOTES,emoteSlots,type EmoteSlots} from '../shared/emotes.js';
import {randomInt,randomUUID} from 'node:crypto';
import type {Game} from './game.js';
import type {Peer,CommunityView,Invitation,StoreResult} from '../shared/community.js';
import {COSMETICS,dustPrice,leagueFor,defaultHubSave,openDemoBox,type HubSave} from '../shared/store.js';
type Player=ReturnType<Game['newPlayer']>;
export type CommunityRecord={id:string;name:string;avatar:Player['avatar'];friends:string[];incoming:string[];store:HubSave;results:StoreResult[];lastRequest?:number;rankGames?:number;rating?:number;grants?:string[]};
export type CommunityInvite=Invitation & {to:string};
export class Community {
 records=new Map<string,CommunityRecord>();invites=new Map<string,CommunityInvite>();
 constructor(private game:Game){}
 id(p:Player){return p.accountId??p.id;}
 record(p:Player){const id=this.id(p);let record=this.records.get(id);if(!record){const initial=defaultHubSave();initial.profile=p.profileId??BASIC_PROFILES[randomInt(BASIC_PROFILES.length)].id;initial.gold=0;initial.diamonds=0;record={id,name:p.name,avatar:p.avatar,friends:[],incoming:[],store:initial,results:[]};this.records.set(id,record);}migrateProfiles(record.store,id);record.store.board??='board-classic';record.store.emote??='emote-hello';migrateEmoteCatalog(record.store);if(!record.store.owned.includes('board-classic'))record.store.owned.push('board-classic');record.rating=p.rating;record.name=p.name;record.avatar=p.avatar;return record;}
 player(id:string){return [...this.game.sessions.values()].find(p=>this.id(p)===id);}
 peer(id:string):Peer|undefined{const p=this.player(id),r=p?this.record(p):this.records.get(id);return r?{id,name:r.name,avatar:r.avatar,profileId:r.store.profile,characterId:r.store.character,frameId:r.store.frame,online:Boolean(p?.socket?.readyState===1)}:undefined;}
 view(p:Player):CommunityView{const r=this.record(p);return {rankGames:r.rankGames??0,friends:r.friends.map(id=>this.peer(id)).filter((x):x is Peer=>Boolean(x)),incoming:r.incoming.map(id=>this.peer(id)).filter((x):x is Peer=>Boolean(x)),outgoing:[...this.records.values()].filter(x=>x.incoming.includes(r.id)).map(x=>x.id),invites:[...this.invites.values()].filter(i=>i.to===r.id&&i.expiresAt>Date.now()).map(({to,...i})=>i),store:{...r.store,gold:p.coins??0}};}
 send(p:Player){this.game.send(p.socket,{type:'community',community:this.view(p)});}
 publish(){for(const p of this.game.sessions.values())if(p.socket?.readyState===1)this.send(p);}
 migrate(p:Player,oldId:string){const nextId=this.id(p),old=this.records.get(oldId);if(oldId===nextId||!old)return;const target=this.records.get(nextId);if(!target){old.id=nextId;this.records.set(nextId,old);}else{target.friends=[...new Set([...target.friends,...old.friends])].filter(x=>x!==nextId);target.incoming=[...new Set([...target.incoming,...old.incoming])].filter(x=>x!==nextId);}this.records.delete(oldId);for(const r of this.records.values()){r.friends=[...new Set(r.friends.map(x=>x===oldId?nextId:x))].filter(x=>x!==r.id);r.incoming=[...new Set(r.incoming.map(x=>x===oldId?nextId:x))].filter(x=>x!==r.id);}}
 request(p:Player,msg:Record<string,unknown>){const room=p.room&&this.game.rooms.get(p.room),target=room&&room.phase==='result'&&(room.resultPlayers??this.game.view(room,p).players).find(x=>x.id===msg.targetId&&!x.ai),r=this.record(p);if(!target||target.id===p.id)return this.game.fail(p,'결과 화면의 다른 참가자에게 요청해 주세요.');const targetSession=[...this.game.sessions.values()].find(x=>x.id===target.id)??this.player(target.socialId??''),other=targetSession?this.record(targetSession):this.records.get(target.socialId??target.id);if(!other)return this.game.fail(p,'만료된 참가자예요.');if(r.friends.includes(other.id)){this.send(p);return;}if(other.incoming.includes(r.id)){this.send(p);return;}if(Date.now()-(r.lastRequest??0)<1000)return this.game.fail(p,'친구 요청은 잠시 뒤 다시 보내 주세요.');if(r.friends.length>=100||other.friends.length>=100||other.incoming.length>=50)return this.game.fail(p,'친구 또는 요청 목록이 가득 찼어요.');r.lastRequest=Date.now();other.incoming.push(r.id);this.publish();}
 reply(p:Player,msg:Record<string,unknown>){const r=this.record(p),id=typeof msg.id==='string'?msg.id:'',other=this.records.get(id);if(!other||!r.incoming.includes(id))return this.game.fail(p,'유효한 친구 요청이 없어요.');if(msg.accept===true){if(r.friends.length>=100||other.friends.length>=100)return this.game.fail(p,'친구 목록이 가득 찼어요.');r.friends=[...new Set([...r.friends,id])];other.friends=[...new Set([...other.friends,r.id])];other.incoming=other.incoming.filter(x=>x!==r.id);}r.incoming=r.incoming.filter(x=>x!==id);this.publish();}
 invite(p:Player,msg:Record<string,unknown>){const room=this.game.lobbyRoom(p),r=this.record(p),id=typeof msg.id==='string'?msg.id:'',other=this.player(id);if(!room||room.hostId!==p.id||room.players.length>=6)return this.game.fail(p,'여유 있는 대기방의 방장만 초대할 수 있어요.');if(!r.friends.includes(id)||!other||other.socket?.readyState!==1||other.room)return this.game.fail(p,'홈에 접속 중인 친구를 초대해 주세요.');const existing=[...this.invites.values()].find(i=>i.to===id&&i.code===room.code&&i.expiresAt>Date.now());if(existing)return this.game.fail(p,'이미 초대를 보냈어요.');const invitation={id:randomUUID(),from:this.peer(r.id)!,to:id,code:room.code,roomName:room.name??'친구의 방',expiresAt:Date.now()+120000};this.invites.set(invitation.id,invitation);this.send(other);this.game.send(p.socket,{type:'notice',message:'친구에게 초대를 보냈어요.'});}
 acceptInvite(p:Player,msg:Record<string,unknown>){const i=this.invites.get(String(msg.id));if(!i||i.to!==this.id(p)||i.expiresAt<=Date.now())return this.game.fail(p,'초대가 만료되었어요.');if(msg.accept===true){if(p.room)return this.game.fail(p,'현재 방에서 나온 뒤 초대를 받아 주세요.');this.game.joinRoom(p,i.code);}this.invites.delete(i.id);this.send(p);}
 store(p:Player,msg:Record<string,unknown>){if(p.room)return this.game.fail(p,'상점은 홈에서 이용해 주세요.');const r=this.record(p),requestId=typeof msg.requestId==='string'?msg.requestId:'';if(!requestId||requestId.length>80)return this.game.fail(p,'유효한 구매 요청이 필요해요.');const prior=r.results.find(x=>x.requestId===requestId);if(prior){this.send(p);this.game.send(p.socket,{type:'storeResult',...prior});return;}if(msg.storeVersion!==(r.store.revision??0)){this.send(p);return this.game.fail(p,'상점 정보가 바뀌었어요. 다시 선택해 주세요.');}let result:StoreResult;
 if(msg.type==='storeOpen'){const opened=openDemoBox({...r.store,gold:p.coins??0},String(msg.box),Number(msg.count),()=>randomInt(1000000000)/1000000000);r.store=opened.next;p.coins=opened.next.gold;result={requestId,source:'box',box:String(msg.box),rewards:opened.rewards};}
 else{const item=COSMETICS.find(c=>c.id===msg.id);if(!item||r.store.owned.includes(item.id))return this.game.fail(p,'아직 보유하지 않은 치장을 선택해 주세요.');const price=dustPrice(item.type);if(r.store.dust<price)return this.game.fail(p,`별가루 ${price}개가 필요해요.`);r.store.dust-=price;r.store.owned.push(item.id);result={requestId,source:'redeem',rewards:[{name:item.name,type:item.type,duplicate:false,image:item.image,itemId:item.id}]};}
 r.store.revision=(r.store.revision??0)+1;const account=[...this.game.accounts.values()].find(a=>a.id===p.accountId);if(account)account.coins=p.coins;r.results.push(result);r.results=r.results.slice(-20);this.send(p);this.game.send(p.socket,{type:'storeResult',...result});}
 setEmotes(p:Player,msg:Record<string,unknown>){
  if(p.room)return this.game.fail(p,'감정표현은 홈에서 장착해 주세요.');
  const r=this.record(p),slots=msg.slots;
  if(!Array.isArray(slots)||slots.length!==4||slots.some(id=>id!==null&&(typeof id!=='string'||!r.store.owned.includes(id)||!COSMETICS.some(c=>c.type==='emote'&&c.id===id)))||new Set(slots.filter(Boolean)).size!==slots.filter(Boolean).length)return this.game.fail(p,'서로 다른 보유 감정표현을 최대 4개 선택해 주세요.');
  r.store.emotes=[...slots] as EmoteSlots;r.store.emote=r.store.emotes.find((id):id is string=>Boolean(id))??'emote-hello';this.send(p);
 }
 equip(p:Player,msg:Record<string,unknown>){const r=this.record(p),item=COSMETICS.find(c=>c.id===msg.id);if(!item||!r.store.owned.includes(item.id))return this.game.fail(p,'보유한 치장만 장착할 수 있어요.');if(item.type==='emote'){const slots=emoteSlots(r.store).map(id=>id===item.id?null:id);slots[0]=item.id;return this.setEmotes(p,{slots});}if(item.type==='profile'||item.type==='character'||item.type==='background'||item.type==='frame'||item.type==='board')r.store[item.type]=item.id;this.send(p);}

 ranking(p:Player,tier:unknown){if(!Number.isInteger(tier)||Number(tier)<0||Number(tier)>7)return this.game.fail(p,'올바른 리그를 선택해 주세요.');for(const player of this.game.sessions.values())this.record(player);const rows=[...this.records.values()].filter(r=>(r.rankGames??0)>=3&&leagueFor(r.rating??1000).tier===tier).map(r=>({id:r.id,name:r.name,avatar:r.avatar,profileId:r.store.profile,characterId:r.store.character,frameId:r.store.frame,rating:r.rating??1000})).sort((a,b)=>b.rating-a.rating||a.id.localeCompare(b.id));this.game.send(p.socket,{type:'ranking',tier,players:rows.slice(0,100),total:rows.length});}
 grantGold(name:string,amount:number,grantId:string,playerId?:string){const candidates=[...this.game.sessions.values()].filter(p=>!p.ai&&p.name===name&&(!playerId||p.id===playerId));if(candidates.length!==1)throw Error(`대상 ${candidates.length}명: 고유한 닉네임/ID 확인이 필요합니다.`);const p=candidates[0],record=this.record(p);if(!Number.isSafeInteger(amount)||amount<0||amount>99999999||!grantId||grantId.length>80)throw Error('잘못된 지급 요청');if(record.grants?.includes(grantId))return {id:p.id,name:p.name,gold:p.coins,duplicate:true};p.coins=amount;const account=[...this.game.accounts.values()].find(a=>a.id===p.accountId);if(account)account.coins=amount;record.grants=[...(record.grants??[]),grantId].slice(-50);this.game.audit(p,'admin_gold_grant','info',{reason:`관리자 테스트 골드 잔액 ${amount}`,requestId:grantId});this.send(p);return {id:p.id,name:p.name,gold:p.coins,duplicate:false};}
 seedTestFriends(name:string,grantId:string,playerId?:string){
  if(typeof name!=='string'||!grantId||typeof grantId!=='string'||grantId.length>80)throw Error('잘못된 테스트 친구 요청');
  const candidates=[...this.game.sessions.values()].filter(p=>!p.ai&&p.name===name&&(!playerId||p.id===playerId));
  if(candidates.length!==1)throw Error(`대상 ${candidates.length}명: 고유한 닉네임/ID 확인이 필요합니다.`);
  const p=candidates[0],record=this.record(p),seeds=[['naro','테스트 나로','pronoun'],['tori','테스트 토리','verb'],['bora','테스트 보라','adjective'],['mori','테스트 모리','count'],['ruri','테스트 루리','mass']] as const;
  const response=(added:number,duplicate:boolean)=>({id:p.id,name:p.name,added,duplicate,total:record.friends.length,friends:this.view(p).friends.filter(f=>f.id.startsWith('test-friend-'))});
  if(record.grants?.includes(grantId))return response(0,true);
  const missing=seeds.filter(([key])=>!record.friends.includes('test-friend-'+key));if(record.friends.length+missing.length>100)throw Error('친구 목록이 가득 찼어요.');
  for(const [key,name,avatar]of seeds){const id='test-friend-'+key;let friend=this.records.get(id);if(!friend){friend={id,name,avatar,friends:[],incoming:[],store:defaultHubSave(),results:[],rankGames:0};this.records.set(id,friend)}if(!friend.friends.includes(record.id))friend.friends.push(record.id);if(!record.friends.includes(id))record.friends.push(id);}
  record.grants=[...(record.grants??[]),grantId].slice(-50);this.game.audit(p,'admin_test_friends_grant','info',{reason:`테스트 친구 ${missing.length}명 추가`,requestId:grantId});this.send(p);return response(missing.length,false);
 }
 grantItems(name:string,items:unknown,grantId:string,playerId?:string){
  if(typeof name!=='string'||typeof grantId!=='string'||!grantId||grantId.length>80||!Array.isArray(items)||items.length<1||items.length>20||items.some(id=>typeof id!=='string'||!COSMETICS.some(c=>c.id===id)))throw Error('잘못된 아이템 지급 요청');
  const candidates=[...this.game.sessions.values()].filter(p=>!p.ai&&p.name===name&&(!playerId||p.id===playerId));
  if(candidates.length!==1)throw Error(`대상 ${candidates.length}명: 고유한 닉네임/ID 확인이 필요합니다.`);
  const p=candidates[0],r=this.record(p),ids=[...new Set(items as string[])];
  const response=(added:string[],duplicate:boolean)=>({id:p.id,name:p.name,added,duplicate,owned:ids.filter(id=>r.store.owned.includes(id))});
  if(r.grants?.includes(grantId))return response([],true);
  const added=ids.filter(id=>!r.store.owned.includes(id));r.store.owned.push(...added);
  if(added.length)r.store.revision=(r.store.revision??0)+1;
  r.grants=[...(r.grants??[]),grantId].slice(-50);
  this.game.audit(p,'admin_items_grant','info',{reason:`관리자 아이템 ${added.length}개 지급`,requestId:grantId});this.send(p);return response(added,false);
 }
 cleanup(){for(const [id,i]of this.invites)if(i.expiresAt<=Date.now())this.invites.delete(id);}
}
