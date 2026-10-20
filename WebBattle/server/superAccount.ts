import type {Game} from './game.js';import {COSMETICS} from '../shared/store.js';
const key=(s:string)=>s.trim().normalize('NFC').toLocaleLowerCase('en-US');
export function findAccounts(game:Game,name:string){
 if(typeof name!=='string'||!name.trim()||name.length>64)throw Error('정확한 닉네임이 필요합니다.');
 const found=new Map<string,{id:string;name:string;account:boolean;superUser:boolean;owned:number}>();
 for(const r of game.community.records.values())if(key(r.name)===key(name))found.set(r.id,{id:r.id,name:r.name,account:[...game.accounts.values()].some(a=>a.id===r.id),superUser:r.superUser===true,owned:r.store.owned.length});
 return [...found.values()];
}
export function grantSuperAccount(game:Game,name:string,id:string){
 const candidates=findAccounts(game,name).filter(r=>r.id===id);if(candidates.length!==1)throw Error('닉네임과 고유 ID가 일치하는 기존 계정이 필요합니다.');
 const record=game.community.records.get(id)!,duplicate=record.superUser===true;record.superUser=true;
 record.store.owned=[...new Set([...record.store.owned,...COSMETICS.map(c=>c.id)])];record.superCatalogSize=COSMETICS.length;
 game.community.publish();return {...candidates[0],superUser:true,owned:record.store.owned.length,duplicate};
}
