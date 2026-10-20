import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {COSMETICS,defaultHubSave,LOOT_WEIGHTS,BOX_WEIGHTS,openDemoBox} from '../shared/store.js';
import {GAME_ASSET_URLS} from '../src/preloadGameAssets.js';
const added=COSMETICS.filter(c=>c.type==='emote'&&c.image.startsWith('/cosmetics/emotes/'));

test('70 supplied emotes are transparent 512px images, preloaded, collectible and present in the draw pool',async()=>{
 assert.equal(added.length,70);assert.equal(added.filter(c=>c.name.startsWith('두두')).length,10);assert.equal(added.filter(c=>c.name.startsWith('프로나운')).length,10);assert.equal(added.filter(c=>c.name.startsWith('버프')).length,10);assert.equal(added.filter(c=>c.name.startsWith('아리')).length,10);assert.equal(added.filter(c=>c.name.startsWith('애드버프')).length,10);
 assert.equal(added.filter(c=>c.name.startsWith('트랜스 ')).length,10);assert.equal(added.filter(c=>c.name.startsWith('코리쉬 ')).length,10);
 const pool=COSMETICS.filter(c=>c.type==='emote'&&!('basic'in c&&c.basic)&&!('dustOnly'in c&&c.dustOnly));
 const category=LOOT_WEIGHTS.findIndex(c=>c.type==='emote'),roll=(BOX_WEIGHTS.silver.slice(0,category).reduce((a,b)=>a+b,0)+1)/100;
 for(const item of added){
  assert.ok(!defaultHubSave().owned.includes(item.id));assert.ok(GAME_ASSET_URLS.includes(item.image));
  const {data,info}=await sharp('public'+decodeURIComponent(item.image)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,512);assert.equal(info.height,512);assert.equal(data[3],0);assert.equal(data.at(-1),0);
  assert.ok(Array.from({length:512},(_,x)=>data[(x)*4+3]).every(a=>a===0));
  let n=0;const opened=openDemoBox({...defaultHubSave(),owned:[]},'silver',1,()=>n++===0?roll:(pool.findIndex(c=>c.id===item.id)+.5)/pool.length);
  assert.equal(opened.rewards[0].itemId,item.id);assert.equal(opened.rewards[0].duplicate,false);
 }
});

test('two real local WebSockets redeem a new emote for 200, equip and transmit its Unicode id',async()=>{
 const {createBattleServer}=await import('../server/index.js'),{WebSocket}=await import('ws');
 const app=createBattleServer({revealMs:10,dealingMs:10});await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const clients:any[]=[];
 const wait=async(f:()=>boolean)=>{const end=Date.now()+5000;while(!f()){if(Date.now()>end)throw Error('wire timeout');await new Promise(r=>setTimeout(r,10));}};
 const send=(c:any,type:string,extra:any={})=>c.ws.send(JSON.stringify({type,...extra}));
 try{
  for(const name of ['EmoteBuyer','EmoteObserver']){const c:any={ws:new WebSocket(`ws://127.0.0.1:${(app.server.address() as any).port}/socket`)};clients.push(c);c.ws.on('message',(raw:any)=>{const m=JSON.parse(String(raw));if(m.type==='community')c.community=m.community;if(m.type==='state')c.room=m.room;});await new Promise(r=>c.ws.on('open',r));send(c,'hello',{name});await wait(()=>!!c.community);}
  const[a,b]=clients,p=[...app.game.sessions.values()][0],record=app.game.community.record(p),item=added.find(c=>c.name==='트랜스 미소')!;record.store.dust=200; // Seeded wallet, not earned currency.
  send(a,'storeRedeem',{id:item.id,requestId:'new-emote',storeVersion:0});await wait(()=>a.community.store.owned.includes(item.id));assert.equal(a.community.store.dust,0);
  send(a,'storeEmotes',{slots:[item.id,null,null,null]});await wait(()=>a.community.store.emotes[0]===item.id);
  send(a,'createRoom');await wait(()=>a.room?.phase==='lobby');send(b,'joinRoom',{code:a.room.code});await wait(()=>a.room.players.length===2);send(a,'startRoom');await wait(()=>a.room?.phase==='battle'&&b.room?.phase==='battle');
  send(a,'react',{matchId:a.room.matchId,emoji:item.id});await wait(()=>b.room.players.find((x:any)=>x.id===a.room.you).reaction?.emoji===item.id);
  assert.deepEqual(a.room.emoteLoadout,[item.id]);
 }finally{for(const c of clients)c.ws.terminate();await app.close();}
});
