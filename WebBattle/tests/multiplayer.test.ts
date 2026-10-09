import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';
import {RULES} from '../shared/rules.js';
const socket=()=>({readyState:1,bufferedAmount:0,send(){},close(){},terminate(){}} as GameSocket);
test('one to three humans are filled to four; AI consent and five-card initial deal',()=>{
 for(const humans of [1,2,3]){
  const game=new Game();const players=Array.from({length:humans},(_,i)=>game.hello(socket(),null,`Human ${i}`));
  players.forEach(p=>game.quick(p));const room=game.rooms.get(players[0].room!)!;game.reveal(room);
  assert.equal(room.players.length,4);assert.equal(room.players.filter(p=>p.ai).length,4-humans);
  assert.equal(new Set(room.players.map(p=>p.name)).size,4);
  game.deal(room,RULES.handSize);game.begin(room);
  assert.ok(room.players.every(p=>p.hand.length===5));assert.equal(room.deck.length,40);
  assert.equal(room.drawVote?.approved.length,4-humans);
 }
});
test('four and five humans wait for the window; sixth starts; seventh gets a new room',()=>{
 const game=new Game();const humans=Array.from({length:7},(_,i)=>game.hello(socket(),null,`Human ${i}`));
 humans.slice(0,4).forEach(p=>game.quick(p));const room=game.rooms.get(humans[0].room!)!;
 assert.equal(room.phase,'matching');game.quick(humans[4]);assert.equal(room.phase,'matching');
 game.quick(humans[5]);assert.equal(room.phase,'reveal');assert.equal(room.players.length,6);assert.equal(room.players.filter(p=>p.ai).length,0);
 game.deal(room,5);game.begin(room);assert.equal(room.deck.length,30);assert.ok(room.players.every(p=>p.hand.length===5));
 const cards=room.players.flatMap(p=>p.hand);assert.equal(new Set(cards.map(c=>c.id)).size,30);
 game.quick(humans[6]);assert.notEqual(humans[6].room,room.code);
});
test('rematch restores the four-player minimum after a human leaves',()=>{
 const game=new Game();const humans=Array.from({length:4},(_,i)=>game.hello(socket(),null,`Human ${i}`));
 humans.forEach(p=>game.quick(p));const room=game.rooms.get(humans[0].room!)!;game.reveal(room);game.begin(room);
 game.leave(humans[0]);game.reveal(room);assert.equal(room.players.length,4);assert.equal(room.players.filter(p=>p.ai).length,1);
});
