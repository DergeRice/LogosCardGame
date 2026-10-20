import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';
function socket(){const messages:Record<string,any>[]=[];const peer:GameSocket={readyState:1,bufferedAmount:0,send(raw){messages.push(JSON.parse(raw));},close(){},terminate(){}};return {peer,last:(type:string)=>messages.filter(m=>m.type===type).at(-1)};}
test('Apple identity links to one persistent account and separate coin balance',()=>{
 const game=new Game(),first=socket(),guest=game.hello(first.peer,undefined,'게스트 1234');
 guest.rating=1160;guest.points=22;guest.coins=7;
 game.loginApple(guest,{sub:'apple-stable-user-1'},'Alice');
 const token=first.last('auth')!.authToken;assert.equal(first.last('session')!.coins,7);
 assert.equal(first.last('session')!.account.username,'Alice');
 const restored=new Game();restore(restored,snapshot(game));restored.sessions.clear();
 const next=socket(),player=restored.hello(next.peer,undefined,'ignored',token);
 assert.equal(player.rating,1160);assert.equal(player.points,22);assert.equal(player.coins,7);
 const repeated=socket(),repeat=restored.hello(repeated.peer,undefined,'게스트 5678');
 restored.loginApple(repeat,{sub:'apple-stable-user-1'},'Changed Name');
 assert.equal(repeated.last('session')!.name,'Alice');assert.equal(repeat.coins,7);
 assert.equal([...restored.accounts.values()].filter(a=>a.provider==='apple').length,1);
});
test('Apple identity links to an existing password account without replacing its identity',()=>{
 const game=new Game(),first=socket(),player=game.hello(first.peer,undefined,'게스트 1234');
 game.handle(player,{type:'register',username:'ordinary',password:'correct horse battery'});
 const id=player.accountId;game.loginApple(player,{sub:'another-apple-user'},'Alice');
 assert.equal(player.accountId,id);assert.equal(game.accounts.size,1);
 assert.equal([...game.accounts.values()][0].appleSubHash?.length,64);
});
