import assert from 'node:assert/strict';
import { WebSocket } from 'ws';

const url=process.env.BATTLE_WS_URL||'wss://logos-card-battle-server.jesus-and-children-ranking-worker.workers.dev/socket';
const ws=new WebSocket(url,{origin:'https://logos-card-battle.netlify.app'});
let startRating,requested=false,verified=false;
try{
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Public cheat smoke timeout')),35000);
  const fail=error=>{clearTimeout(timer);reject(error);};
  ws.on('error',fail);
  ws.on('open',()=>ws.send(JSON.stringify({type:'hello',name:'기능 카드 검사'})));
  ws.on('message',raw=>{
   try{
    const msg=JSON.parse(String(raw));
    if(msg.type==='error')throw Error(msg.message);
    if(msg.type==='session'){startRating=msg.rating;ws.send(JSON.stringify({type:'quick'}));}
    if(msg.type==='state'){
     const room=msg.room;
     if(room.phase==='battle'&&!requested){requested=true;ws.send(JSON.stringify({type:'debugSpecials',matchId:room.matchId,requestId:crypto.randomUUID()}));}
     if(room.phase==='battle'&&room.testMode&&!verified){
      const kinds=new Set(room.hand.map(card=>card.kind));
      for(const kind of ['get2','get3','rob','exchange','protect'])assert.ok(kinds.has(kind),`${kind} missing`);
      assert.equal(room.hand.length+room.players.find(p=>p.ai).handCount+room.deckCount+room.usedCards.length,39);
      verified=true;ws.send(JSON.stringify({type:'leave'}));
     }
    }
    if(msg.type==='home'&&verified){assert.equal(msg.rating,startRating);clearTimeout(timer);resolve();}
   }catch(error){fail(error);}
  });
 });
 console.log('PASS: public Worker AI match, five unique special cards, shared deck accounting, no test-match rating reward');
}finally{ws.terminate();}
