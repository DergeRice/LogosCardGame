import type {LootReward} from './store.js';
// Presentation tiers do not change server odds or rewards.
export const LOOT_TIERS=[{name:'일반',color:0x9bb5cc},{name:'고급',color:0x65cfa6},{name:'희귀',color:0x66aaff},{name:'영웅',color:0xbd88ff},{name:'전설',color:0xffc75a},{name:'신화',color:0xff82c3}] as const;
export function lootTier(type:LootReward['type']){return {dust:0,emote:1,profile:2,board:2,frame:3,background:4,character:5}[type];}
export function orderedLoot(rewards:LootReward[]){return rewards.map((reward,index)=>({reward,index,tier:lootTier(reward.type)})).sort((a,b)=>a.tier-b.tier||a.index-b.index);}
export function revealPlan(rewards:LootReward[]){let elapsed=0;return orderedLoot(rewards).map(({index,tier})=>{const start=elapsed;elapsed+=240+tier*260;return {index,tier,start,reveal:elapsed};});}
