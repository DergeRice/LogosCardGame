import {NARO_EMOTES,BASIC_EMOTES,DUST_EMOTE_IDS,DEFAULT_EMOTE_SLOTS,emoteSlots,type EmoteSlots} from './emotes.js';
import {EXTRA_COSMETICS} from './cosmetic-resources.js';
export const LEAGUES=['아이언','브론즈','실버','골드','플래티넘','에메랄드','다이아','네더라이트'] as const;
export function leagueFor(rating:number){const value=Number.isFinite(rating)?Math.max(0,Math.floor(rating)):0,step=Math.min(39,Math.max(0,Math.floor((value-300)/100))),tier=Math.floor(step/5),division=5-step%5;return {tier,division,label:`${LEAGUES[tier]} ${division}`,floor:step===0?0:300+step*100,next:step===39?null:400+step*100};}
export const LOOT_WEIGHTS=[{type:'dust',name:'별가루',weight:35},{type:'character',name:'캐릭터',weight:2},{type:'background',name:'배경',weight:10},{type:'emote',name:'감정표현',weight:30},{type:'frame',name:'프레임',weight:23}] as const;
export type LootType=typeof LOOT_WEIGHTS[number]['type'];
export const BOX_WEIGHTS={silver:[35,2,10,30,23],gold:[30,5,15,25,25],diamond:[10,15,20,25,30]} as const;
export function lootType(roll:number,boxId: keyof typeof BOX_WEIGHTS='silver'):LootType{if(!Number.isFinite(roll)||roll<0||roll>=1)throw Error('Invalid loot roll');let at=roll*100;for(let i=0;i<LOOT_WEIGHTS.length;i++){if(at<BOX_WEIGHTS[boxId][i])return LOOT_WEIGHTS[i].type;at-=BOX_WEIGHTS[boxId][i];}return 'frame';}
export const BOXES=[{id:'silver',name:'실버 박스',currency:'gold',price:1000,color:'#96b6b9',offers:[{count:1,cost:1000},{count:10,cost:9800}]},{id:'gold',name:'골드 박스',currency:'gold',price:3000,color:'#e7b750',offers:[{count:1,cost:3000},{count:10,cost:28000}]},{id:'diamond',name:'다이아 박스',currency:'diamonds',price:100,color:'#a28bdb',offers:[{count:1,cost:100},{count:10,cost:900},{count:20,cost:1700},{count:40,cost:3000},{count:100,cost:6000}]}] as const;
export const DIAMOND_PACKS=[{amount:100,won:1200},{amount:300,won:2900},{amount:1000,won:8900},{amount:3000,won:25000}] as const;
export const COSMETICS=[
 ...NARO_EMOTES,
 {id:'character-naro',type:'character',name:'나로와 친구들',image:'/landing/mascots-mobile.webp'},
 {id:'character-table',type:'character',name:'카드 테이블',image:'/brand-ui/loading-under.png'},
 {id:'board-classic',type:'board',name:'기본 나무 보드',image:'/brand-ui/game-back.png'},
 {id:'board-garden',type:'board',name:'정원 보드',image:'/landing/background.jpg'},
 {id:'background-garden',type:'background',name:'햇살 정원',image:'/landing/background.jpg'},
 {id:'background-table',type:'background',name:'로고스 테이블',image:'/brand-ui/game-back.png'},
 {id:'emote-smile',type:'emote',name:'싱글벙글',image:'😊'}, {id:'emote-fire',type:'emote',name:'불타는 승부',image:'🔥'},
 {id:'emote-clap',type:'emote',name:'최고야',image:'👏'}, {id:'emote-wow',type:'emote',name:'깜짝',image:'😮'},
 {id:'frame-mint',type:'frame',name:'민트 프레임',image:'#78a995'}, {id:'frame-gold',type:'frame',name:'햇살 프레임',image:'#dfb24c'},
 {id:'frame-violet',type:'frame',name:'라일락 프레임',image:'#a28bca'},
 ...EXTRA_COSMETICS,
] as const;
export type HubSave={revision?:number;emoteCatalogVersion?:number;gold:number;diamonds:number;dust:number;owned:string[];board?:string;emote?:string;emotes?:EmoteSlots;character:string;background:string;frame:string;bestScore:number;bestRating:number};
export function defaultHubSave():HubSave{return {revision:0,emoteCatalogVersion:2,gold:50000,diamonds:1000,dust:0,board:'board-classic',emote:DEFAULT_EMOTE_SLOTS[0],emotes:[...DEFAULT_EMOTE_SLOTS],owned:[...BASIC_EMOTES.map(e=>e.id),'board-classic','character-naro','background-garden','frame-mint'],character:'character-naro',background:'background-garden',frame:'frame-mint',bestScore:0,bestRating:1000};}
export function readHubSave(key:string):HubSave{const base=defaultHubSave();try{const data=JSON.parse(localStorage.getItem(key)??'null');if(!data||typeof data!=='object')return base;for(const field of ['gold','diamonds','dust','bestScore','bestRating'] as const)if(Number.isFinite(data[field])&&data[field]>=0)base[field]=Math.min(1e8,Math.floor(data[field]));if(Array.isArray(data.owned))base.owned=[...new Set([...base.owned,...data.owned.filter((id:unknown)=>typeof id==='string'&&COSMETICS.some(c=>c.id===id))])] as string[];for(const field of ['character','background','frame'] as const)if(base.owned.includes(data[field])&&COSMETICS.some(c=>c.id===data[field]&&c.type===field))base[field]=data[field];base.emoteCatalogVersion=data.emoteCatalogVersion;
base.emotes=emoteSlots({...base,emotes:Array.isArray(data.emotes)?data.emotes:undefined,emote:data.emote});return migrateEmoteCatalog(base);}catch{return base;}}
export type LootReward={name:string;type:LootType|'board';duplicate:boolean;image?:string;dust?:number;itemId?:string};
export function openDemoBox(save:HubSave,boxId:string,count:number,random:()=>number=Math.random){const box=BOXES.find(b=>b.id===boxId),offer=box?.offers.find(o=>o.count===count);if(!box||!offer)throw Error('잘못된 상자 요청입니다.');const cost=offer.cost;if(save[box.currency]<cost)throw Error('재화가 부족해요.');const next={...save,owned:[...save.owned],[box.currency]:save[box.currency]-cost},rewards:LootReward[]=[];for(let i=0;i<count;i++){const type=lootType(random(),box.id);if(type==='dust'){const dust=4+Math.floor(random()*37);next.dust+=dust;rewards.push({name:`별가루 ${dust}`,type,duplicate:false,dust});continue;}const pool=COSMETICS.filter(c=>c.type===type&&!('basic' in c&&c.basic)&&!('dustOnly' in c&&c.dustOnly)),item=pool[Math.floor(random()*pool.length)];if(!item)throw Error('Invalid cosmetic roll');const duplicate=next.owned.includes(item.id),dust=duplicate?4+Math.floor(random()*37):0;if(duplicate)next.dust+=dust;else next.owned.push(item.id);rewards.push({name:item.name,type,duplicate,image:item.image,dust,itemId:item.id});}return {next,rewards};}
export function dummyRanking(tier:number){const first=['달빛','새벽','초록','구름','별빛','노을','민트','라임','바람','햇살','은빛','푸른'],last=['나로','여우','책갈피','호랑이','산책','고양이','마법사','모험가','소다','카드','문장','고래'];return Array.from({length:12},(_,i)=>({id:`demo-${tier}-${i}`,name:first[(i+tier)%12]+last[(i*5+tier)%12],rating:300+tier*500+Math.max(0,490-i*37),avatar:(['pronoun','verb','adjective','count'] as const)[i%4]}));}

export const EXCHANGE_CATEGORIES=[['character','캐릭터'],['background','배경'],['board','보드판'],['emote','이모티콘'],['frame','프레임']] as const;
export function isEquipped(save:HubSave,item:{id:string;type:string}){return item.type==='emote'?emoteSlots(save).includes(item.id):item.type in save&&(save as unknown as Record<string,unknown>)[item.type]===item.id;}

/** v1 granted all ten free. Convert those free grants to six; later dust purchases persist. */
export function migrateEmoteCatalog(save:HubSave){
 if((save.emoteCatalogVersion??0)<2){save.owned=save.owned.filter(id=>!DUST_EMOTE_IDS.includes(id));save.emoteCatalogVersion=2;}
 for(const e of BASIC_EMOTES)if(!save.owned.includes(e.id))save.owned.push(e.id);
 save.emotes=emoteSlots(save);return save;
}
