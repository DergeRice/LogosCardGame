import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import type { Card, RoomView } from '../shared/rules.js';

const url=process.env.BATTLE_WS_URL;
if(!url)throw Error('BATTLE_WS_URL is required');
const ws=new WebSocket(url);
let room:RoomView|undefined;
const messages:any[]=[];
ws.on('message',raw=>{const msg=JSON.parse(String(raw));messages.push(msg);if(msg.type==='state')room=msg.room;});
const wait=async(predicate:()=>boolean,ms=25000)=>{const start=Date.now();while(!predicate()){if(Date.now()-start>ms)throw Error(`Timed out: ${JSON.stringify(messages.slice(-2))}`);await new Promise(resolve=>setTimeout(resolve,30));}};
const send=(type:string,extra:Record<string,unknown>={})=>ws.send(JSON.stringify({type,matchId:room?.matchId,...extra}));
try{
 await new Promise<void>((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
 send('hello',{name:`ROB검증${randomUUID().slice(0,4)}`});await wait(()=>messages.some(m=>m.type==='session'));
 send('quick');await wait(()=>room?.phase==='battle',35000);
 send('debugSpecials',{requestId:randomUUID()});await wait(()=>Boolean(room?.hand.some(c=>c.kind==='rob')));
 assert.equal(room!.testMode,true,'Cheat must disable rewards');
 const rob=room!.hand.find(c=>c.kind==='rob')!,target=room!.players.find(p=>p.id!==room!.you)!;
 assert.ok(target.handCount>0);
 assert.equal(JSON.stringify(room).includes('"cards":['),false,'Normal room state must not contain target cards');
 send('inspectRob',{cardId:rob.id,targetId:target.id});await wait(()=>messages.some(m=>m.type==='robView'&&m.cardId===rob.id));
 const peek=messages.find(m=>m.type==='robView'&&m.cardId===rob.id) as {cards:Card[];handVersion:number};
 assert.ok(peek.cards.length>0);
 const chosen=peek.cards.find(c=>c.kind!=='protect')??peek.cards[0];
 send('special',{cardId:rob.id,targetId:target.id,stealId:chosen.id,stealSource:'hand',targetHandVersion:peek.handVersion,handVersion:room!.handVersion,requestId:randomUUID()});
 await wait(()=>!room?.hand.some(c=>c.id===rob.id)||messages.some(m=>m.type==='error'&&String(m.message).includes('ROB')));
 if(room!.hand.some(c=>c.id===rob.id))throw Error(`ROB rejected: ${JSON.stringify(messages.slice(-2))}`);
 if(!peek.cards.some(c=>c.kind==='protect'))assert.ok(room!.hand.some(c=>c.id===chosen.id),'Chosen card was not transferred');
 send('leave');await wait(()=>messages.some(m=>m.type==='home'));
 console.log(`PASS: deployed Worker ROB private peek, chosen card ${chosen.kind}, server transfer, test-match cleanup`);
}finally{ws.close();}
