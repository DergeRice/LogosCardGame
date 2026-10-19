import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,type GameSocket} from '../server/game.js';
import {snapshot,restore} from '../server/persistence.js';

function socket(){
 const messages:Record<string,any>[]=[];
 const peer:GameSocket={readyState:1,bufferedAmount:0,send(raw){messages.push(JSON.parse(raw));},close(){},terminate(){}};
 return {peer,messages,last:(type:string)=>messages.filter(m=>m.type===type).at(-1)};
}

test('account registration keeps guest rating, survives restart, and requires the account credential',()=>{
 const game=new Game(),first=socket();
 const player=game.hello(first.peer,undefined,'게스트 1234');player.rating=1120;player.points=45;
 game.handle(player,{type:'register',username:'Learner_1',password:'correct horse battery'});
 const auth=first.last('auth')!;assert.equal(auth.username,'Learner_1');assert.ok(auth.authToken);
 assert.equal(game.accounts.get('learner_1')?.rating,1120);
 const saved=snapshot(game),restored=new Game();restore(restored,saved);
 const noCredential=socket(),guest=restored.hello(noCredential.peer,player.token,'게스트 9999');
 assert.notEqual(guest.id,player.id);assert.equal(noCredential.last('session')!.account,null);
 const second=socket(),accountPlayer=restored.hello(second.peer,undefined,'ignored',auth.authToken);
 assert.equal(accountPlayer.id,player.id);assert.equal(second.last('session')!.rating,1120);
 assert.equal(second.last('session')!.account.username,'Learner_1');
 restored.handle(accountPlayer,{type:'logout'});
 const afterLogout=socket(),anonymous=restored.hello(afterLogout.peer,player.token,'게스트 8888',auth.authToken);
 assert.notEqual(anonymous.id,player.id);
});

test('account password checks and login rate limit protect persistent rating',()=>{
 const game=new Game(),first=socket(),owner=game.hello(first.peer,undefined,'게스트 1234');
 game.handle(owner,{type:'register',username:'player2',password:'a secure password'});
 const challenger=socket(),guest=game.hello(challenger.peer,undefined,'게스트 5678');
 for(let i=0;i<5;i++)game.handle(guest,{type:'login',username:'player2',password:'wrong password'});
 assert.equal(game.accounts.get('player2')!.failedLogins,0);
 assert.ok(game.accounts.get('player2')!.lockedUntil>Date.now());
 game.handle(guest,{type:'login',username:'player2',password:'a secure password'});
 assert.match(challenger.last('error')!.message,/시도가 많아요/);
 assert.equal(challenger.last('auth'),undefined);
 game.accounts.get('player2')!.lockedUntil=0;
 game.handle(guest,{type:'login',username:'player2',password:'a secure password'});
 assert.equal(challenger.last('auth')!.username,'player2');
});

test('settled match rating is restored on a later account login',()=>{
 const game=new Game({minimumPlayers:2,matchingMs:0,revealMs:0,dealingMs:0}),first=socket(),second=socket();
 const owner=game.hello(first.peer,undefined,'게스트 1000');game.handle(owner,{type:'register',username:'rated_player',password:'a strong password'});
 const authToken=first.last('auth')!.authToken;
 const rival=game.hello(second.peer,undefined,'게스트 2000');
 game.quick(owner);game.quick(rival);game.tick();game.tick();game.tick();
 const room=[...game.rooms.values()][0];assert.equal(room.phase,'battle');
 game.community.record(owner).rankGames=3;game.community.record(rival).rankGames=3;owner.score=20;rival.score=0;game.finish(room,'테스트 정산');
 assert.ok(owner.rating>1000);
 const saved=snapshot(game),resumed=new Game();restore(resumed,saved);
 resumed.sessions.clear();
 const next=socket(),restoredPlayer=resumed.hello(next.peer,undefined,'ignored',authToken);
 assert.equal(restoredPlayer.rating,owner.rating);
 assert.equal(next.last('session')!.rating,owner.rating);
});
