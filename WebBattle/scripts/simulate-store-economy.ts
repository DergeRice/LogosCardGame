import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {BOXES,BOX_WEIGHTS,COSMETICS,DIAMOND_PACKS,LOOT_WEIGHTS,defaultHubSave,openDemoBox,type HubSave} from '../shared/store.js';

const trials=10_000,seed=20261020,dustPrice=100;
assert(readFileSync('server/community.ts','utf8').includes('r.store.dust-=100'),'Update the analysis when the live redemption price changes');
function rng(value:number){return()=>{value|=0;value=value+0x6D2B79F5|0;let n=Math.imul(value^value>>>15,1|value);n=n+Math.imul(n^n>>>7,61|n)^n;return((n^n>>>14)>>>0)/4294967296;};}
const pools=Object.fromEntries(LOOT_WEIGHTS.filter(t=>t.type!=='dust').map(t=>[t.type,COSMETICS.filter(c=>c.type===t.type&&!('basic'in c&&c.basic)&&!('dustOnly'in c&&c.dustOnly)).map(c=>c.id)]));
const fresh=():HubSave=>({...defaultHubSave(),gold:1e9,diamonds:1e9});
const wonPerDiamond={min:Math.min(...DIAMOND_PACKS.map(p=>p.won/p.amount)),max:Math.max(...DIAMOND_PACKS.map(p=>p.won/p.amount))};
const diamondOffers=BOXES.find(b=>b.id==='diamond')!.offers.map(o=>({count:o.count,diamonds:o.cost,diamondsPerOpen:o.cost/o.count,wonPerOpen:{min:o.cost/o.count*wonPerDiamond.min,max:o.cost/o.count*wonPerDiamond.max}}));
const cashPerOpen={min:Math.min(...diamondOffers.map(o=>o.wonPerOpen.min)),max:Math.max(...diamondOffers.map(o=>o.wonPerOpen.max))};
function simulate(box:typeof BOXES[number],scenario:'freshIndependent'|'oneAccount'|'allOwned',random:()=>number){
 let save=fresh();if(scenario==='allOwned')save.owned=COSMETICS.map(c=>c.id);
 const counts:Record<string,number>={},newItems:Record<string,number>={};let duplicates=0,dust=0,directDust=0,duplicateDust=0;
 for(let i=0;i<trials;i++){
  if(scenario==='freshIndependent')save=fresh();
  const opened=openDemoBox(save,box.id,1,random);save=opened.next;const r=opened.rewards[0];counts[r.type]=(counts[r.type]??0)+1;
  if(r.type==='dust')directDust+=r.dust??0;else if(r.duplicate){duplicates++;duplicateDust+=r.dust??0;}else newItems[r.type]=(newItems[r.type]??0)+1;
  dust+=r.dust??0;
 }
 const newCount=Object.values(newItems).reduce((a,b)=>a+b,0);
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),trials);assert.equal(dust,directDust+duplicateDust);
 return {trials,counts,newItems,newCount,duplicates,dust,directDust,duplicateDust,dustPerOpen:dust/trials,duplicateRate:duplicates/trials,dustEquivalentPerOpen:(dust+newCount*dustPrice)/trials};
}
function firstRedemption(box:typeof BOXES[number],allOwned:boolean,random:()=>number){
 const opens:number[]=[];
 for(let i=0;i<trials;i++){
  let save=fresh();if(allOwned)save.owned=COSMETICS.map(c=>c.id);let n=0;
  while(save.dust<dustPrice){save=openDemoBox(save,box.id,1,random).next;n++;assert(n<1000);}
  opens.push(n);
 }
 opens.sort((a,b)=>a-b);const mean=opens.reduce((a,b)=>a+b,0)/trials;
 return {trials,meanOpens:mean,median:opens[Math.floor(trials*.5)],p90:opens[Math.floor(trials*.9)],p95:opens[Math.floor(trials*.95)],meanCurrencyCost:mean*box.price};
}
const boxes=BOXES.map((box,i)=>({id:box.id,name:box.name,currency:box.currency,price:box.price,offers:box.offers,weights:BOX_WEIGHTS[box.id],freshIndependent:simulate(box,'freshIndependent',rng(seed+i*10)),oneAccount:simulate(box,'oneAccount',rng(seed+i*10+1)),allOwned:simulate(box,'allOwned',rng(seed+i*10+2)),first100DustFresh:firstRedemption(box,false,rng(seed+i*10+3)),first100DustAllOwned:firstRedemption(box,true,rng(seed+i*10+4))}));
const singleItemTargets=LOOT_WEIGHTS.filter(t=>t.type!=='dust').map(t=>{const size=pools[t.type].length;const perBox=BOXES.map(b=>{const weight=BOX_WEIGHTS[b.id][LOOT_WEIGHTS.findIndex(x=>x.type===t.type)];const expectedOpens=size/(weight/100);return {box:b.id,expectedOpens,currencyCost:expectedOpens*b.price,...(b.id==='diamond'?{won:{min:expectedOpens*cashPerOpen.min,max:expectedOpens*cashPerOpen.max}}:{})};});return {type:t.type,poolSize:size,perBox};});
const report={asOf:'2026-10-20',seed,trialsPerScenario:trials,scope:'Offline simulation of configured paid rules; FREE_BOX_PREVIEW currently makes actual preview charges and saved rewards zero. Not a cash-out valuation.',dustPrice,wonPerDiamond,diamondOffers,cashPerOpen,pools,boxes,singleItemTargets,longRunDustWon:{perDust:{min:cashPerOpen.min/22,max:cashPerOpen.max/22},per100Dust:{min:cashPerOpen.min/22*100,max:cashPerOpen.max/22*100}},assumedSilverAnchor:{assumption:'Only if one silver opening is assigned the same long-run duplicate/dust utility as one diamond opening; not an actual exchange or gold sale.',wonPerGold:{min:cashPerOpen.min/1000,max:cashPerOpen.max/1000},silverWon:cashPerOpen,goldBoxWon:{min:cashPerOpen.min*3,max:cashPerOpen.max*3}}};
mkdirSync('docs/store-economy',{recursive:true});writeFileSync('docs/store-economy/simulation-2026-10-20.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pools:Object.fromEntries(Object.entries(pools).map(([k,v])=>[k,v.length])),cashPerOpen,boxes:boxes.map(b=>({id:b.id,counts:b.oneAccount.counts,newItems:b.oneAccount.newItems,duplicates:b.oneAccount.duplicates,dustPerOpen:b.oneAccount.dustPerOpen,freshDustValue:b.freshIndependent.dustEquivalentPerOpen,first100DustFresh:b.first100DustFresh,first100DustAllOwned:b.first100DustAllOwned}))},null,2));
