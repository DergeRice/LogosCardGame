import type {Game} from './game.js';import {NICKNAME_PRICE,cleanNickname,validNickname} from '../shared/nickname.js';
type Player=ReturnType<Game['newPlayer']>;
export function renameNickname(game:Game,p:Player,msg:Record<string,unknown>){
 const requestId=typeof msg.requestId==='string'?msg.requestId:'',name=cleanNickname(msg.name),record=game.community.record(p);
 const reply=(ok:boolean,message?:string)=>game.send(p.socket,{type:'nicknameResult',requestId,ok,message,...(ok?{name:p.name,coins:p.coins,guest:!p.accountId}:{})});
 if(!requestId||requestId.length>80)return reply(false,'유효한 변경 요청이 필요해요.');
 if(p.room)return reply(false,'닉네임은 홈에서 변경해 주세요.');
 const prior=record.nicknameChanges?.find(x=>x.requestId===requestId);
 if(prior)return prior.name===name?reply(true):reply(false,'이미 처리한 변경 요청이에요.');
 if(msg.confirm!==true||msg.previousName!==p.name||msg.storeVersion!==(record.store.revision??0)){game.community.send(p);return reply(false,'프로필 정보가 바뀌었어요. 다시 확인해 주세요.');}
 if(!validNickname(name))return reply(false,'닉네임은 한글·영문·숫자·공백·_ . -로 1~16자 입력해 주세요.');
 const key=name.toLocaleLowerCase('en-US');if(key===p.name.toLocaleLowerCase('en-US'))return reply(false,'현재 닉네임과 다른 이름을 입력해 주세요.');
 if([...game.community.records.values()].some(r=>r.id!==record.id&&r.name.toLocaleLowerCase('en-US')===key)||[...game.accounts.values()].some(a=>a.id!==p.accountId&&(a.nickname??a.username).toLocaleLowerCase('en-US')===key)||[...game.sessions.values()].some(x=>x!==p&&game.community.id(x)!==record.id&&x.name.toLocaleLowerCase('en-US')===key))return reply(false,'이미 사용 중인 닉네임이에요.');
 const cost=record.superUser?0:NICKNAME_PRICE;if(p.coins<cost)return reply(false,'골드 1,500개가 필요해요.');
 p.coins-=cost;p.name=name;record.name=name;record.store.gold=p.coins;record.store.revision=(record.store.revision??0)+1;
 record.nicknameChanges=[...(record.nicknameChanges??[]),{requestId,name,cost}].slice(-20);
 const account=[...game.accounts.values()].find(a=>a.id===p.accountId);if(account){account.nickname=name;account.coins=p.coins;}
 game.community.publish();game.publishRoomList();reply(true);
}
