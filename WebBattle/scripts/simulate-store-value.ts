import {BOXES,BOX_WEIGHTS,COSMETICS,DIAMOND_PACKS,lootType,BOX_DUST,DUPLICATE_DUST,dustPrice} from '../shared/store.js';
import {writeFileSync} from 'node:fs';

// Offline economy study only. Never opens real boxes or changes player saves.
const trials=10_000;
const sizes={character:40,background:40,emote:60,frame:80,board:40}; // Background count is an assumption; live v96 rules.
let seed=20261020;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const eligible=COSMETICS.filter(c=>!('basic' in c&&c.basic)&&!('dustOnly' in c&&c.dustOnly));
const actualSizes=Object.fromEntries(Object.keys(sizes).map(t=>[t,eligible.filter(c=>c.type===t).length]));
function series(box: keyof typeof BOX_WEIGHTS,pools:Record<string,number>){
 const hits:Record<string,number>={dust:0,character:0,background:0,emote:0,frame:0,board:0};
 const owned=new Set<string>();let dust=0,duplicates=0;
 for(let n=0;n<trials;n++){
  const type=lootType(random(),box);hits[type]++;
  if(type==='dust'){dust+=BOX_DUST[box].min+Math.floor(random()*(BOX_DUST[box].max-BOX_DUST[box].min+1));continue;}
  const id=type+Math.floor(random()*pools[type]);
  if(owned.has(id)){duplicates++;dust+=DUPLICATE_DUST[type];}else owned.add(id);
 }
 if(Object.values(hits).reduce((a,b)=>a+b,0)!==trials||owned.size+duplicates+hits.dust!==trials)throw Error('Reward accounting mismatch');
 return {hits,unique:owned.size,duplicates,dust,purchasingPower:Object.fromEntries(Object.keys(sizes).map(t=>[t,Math.floor(dust/dustPrice(t as keyof typeof sizes))]))};
}
// 10,000 independent new collectors per category. Stop on desired item OR
// the configured category dust price to redeem it. Other rewards are kept; they are not sold for dust.
function target(box:keyof typeof BOX_WEIGHTS,type:string){
 const draws:number[]=[];let natural=0;
 for(let n=0;n<trials;n++){
  const owned=new Set<string>();let dust=0,count=0;
  while(dust<dustPrice(type as keyof typeof sizes)){
   count++;const t=lootType(random(),box);
   if(t==='dust'){dust+=BOX_DUST[box].min+Math.floor(random()*(BOX_DUST[box].max-BOX_DUST[box].min+1));continue;}
   const index=Math.floor(random()*sizes[t]);
   if(t===type&&index===0){natural++;break;}
   const id=t+index;
   if(owned.has(id))dust+=DUPLICATE_DUST[t];else owned.add(id);
  }
  draws.push(count);
 }
 draws.sort((a,b)=>a-b);
 return {mean:draws.reduce((a,b)=>a+b,0)/trials,median:draws[4999],p90:draws[8999],natural};
}
const boxes=BOXES.map(box=>({id:box.id,weights:BOX_WEIGHTS[box.id],offers:box.offers,
 planned:series(box.id,sizes),currentCatalog:series(box.id,actualSizes),
 targets:Object.fromEntries(Object.keys(sizes).map(t=>[t,target(box.id,t)])),
 initialDustEquivalent:BOX_WEIGHTS[box.id].reduce((sum,weight,i)=>sum+weight/100*(i===0?(BOX_DUST[box.id].min+BOX_DUST[box.id].max)/2:dustPrice((['dust','character','background','emote','frame','board'] as const)[i] as keyof typeof sizes)),0),
 fullCollectionDustPerBox:BOX_WEIGHTS[box.id].reduce((sum,weight,i)=>sum+weight/100*(i===0?(BOX_DUST[box.id].min+BOX_DUST[box.id].max)/2:DUPLICATE_DUST[(['dust','character','background','emote','frame','board'] as const)[i] as keyof typeof sizes]),0),
}));
const result={seed:20261020,trials,independentTargetTrialsPerCategory:trials,sizes,boardCount:40,actualSizes,
 assumptions:['Background pool assumed 40. Board now drops from boxes.','Empty initial collection, no free defaults for planned pool. No automatic dust spending in collection series.','Each eligible item within a category has equal probability. Dust uses configured box ranges; duplicates use category fixed amounts.','Category-specific live dust prices apply. No cash price or gold exchange rate is currently implemented.','Cash amounts use displayed diamond packs, not live purchases; free preview is currently enabled.'],
 diamondPacks:DIAMOND_PACKS,boxes};
writeFileSync('docs/STORE-SIMULATION-v0.9.96.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
