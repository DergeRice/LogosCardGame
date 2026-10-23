import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BOX_WEIGHTS,LOOT_WEIGHTS,BOX_DUST,DUST_PRICES,DUPLICATE_DUST,COSMETICS,defaultHubSave,lootType,openDemoBox} from '../shared/store.js';
import {Game,type GameSocket} from '../server/game.js';

test('silver and gold dust odds rise five points while all box weights total 100',()=>{
 assert.deepEqual(BOX_WEIGHTS,{silver:[64.5,0.9,6.1,11.4,6.1,6.6,4.4],gold:[30,3.7,14.9,11.2,15.9,16.8,7.5],diamond:[10,12,18,8,20,22,10]});
 for(const id of ['silver','gold','diamond'] as const){
  assert.equal(BOX_WEIGHTS[id].reduce((a,b)=>a+b,0),100);
  const counts=LOOT_WEIGHTS.map(x=>Array.from({length:10000},(_,i)=>lootType((i+.5)/10000,id)).filter(t=>t===x.type).length);
  assert.deepEqual(counts,BOX_WEIGHTS[id].map(w=>Math.round(w*100)));
  // Even the hundredth draw uses the supplied random value; no hidden guarantee.
  const opened=openDemoBox({...defaultHubSave(),diamonds:6000},id,id==='diamond'?100:10,()=>0);
  assert.ok(opened.rewards.every(r=>r.type==='dust'));
 }
});

test('all categories can drop and each duplicate returns the approved fixed dust',()=>{
 for(const box of ['silver','gold','diamond'] as const){let start=0;
  for(let i=0;i<LOOT_WEIGHTS.length;i++){
   const type=LOOT_WEIGHTS[i].type,roll=(start+BOX_WEIGHTS[box][i]/2)/100;start+=BOX_WEIGHTS[box][i];
   for(const value of [0,.999999]){
    let call=0;const save={...defaultHubSave(),owned:COSMETICS.map(c=>c.id)},before=save.dust;
    const result=openDemoBox(save,box,1,()=>call++===0?roll:value),r=result.rewards[0];
    assert.equal(r.type,type);
    const expected=type==='dust'?(value===0?BOX_DUST[box].min:BOX_DUST[box].max):DUPLICATE_DUST[type];
    assert.equal(r.dust,expected);assert.equal(result.next.dust,before+expected);assert.equal(save.dust,before);
   }
   if(type!=='dust'){
    let call=0;const fresh=openDemoBox({...defaultHubSave(),owned:[]},box,1,()=>call++===0?roll:0);
    assert.equal(fresh.rewards[0].duplicate,false);assert.ok(fresh.next.owned.includes(fresh.rewards[0].itemId!));
   }
  }
 }
});

test('server ignores forged redemption price, charges category price once and refuses insufficient funds',()=>{
 assert.deepEqual(DUST_PRICES,{profile:300,character:850,board:500,background:400,frame:300,emote:200});
 for(const type of ['profile','character','board','background','frame','emote'] as const){
  const messages:any[]=[],socket:GameSocket={readyState:1,bufferedAmount:0,send(s){messages.push(JSON.parse(s))},close(){},terminate(){}};
  const g=new Game(),p=g.hello(socket,null,'Economy fixture'),r=g.community.record(p),item=COSMETICS.find(c=>c.type===type&&!r.store.owned.includes(c.id))!;
  assert.ok(item);const cost=DUST_PRICES[type];r.store.dust=cost-1;
  g.handle(p,{type:'storeRedeem',id:item.id,requestId:'poor',storeVersion:0,price:0});
  assert.equal(r.store.dust,cost-1);assert.ok(!r.store.owned.includes(item.id));assert.equal(messages.at(-1).type,'error');
  r.store.dust=cost;const request={type:'storeRedeem',id:item.id,requestId:'once',storeVersion:0,price:1,dust:999999};
  g.handle(p,request);g.handle(p,request);assert.equal(r.store.dust,0);assert.equal(r.store.owned.filter(id=>id===item.id).length,1);
 }
});
