import {test} from 'node:test';import assert from 'node:assert/strict';
import {HOME_COMMON_LINES,CHARACTER_HOME_LINES,pickHomeDialogue} from '../src/homeDialogue.js';
test('all story characters have distinct special lines, including the default Naro',()=>{
 assert.equal(HOME_COMMON_LINES.length,30);assert.equal(new Set(HOME_COMMON_LINES).size,30);
 for(const id of ['character-naro','character-naro-solo','character-hamster','character-dog','character-hans','character-rabbit','character-spotted','character-horse','character-pink-monkey','character-king']){
  const lines=CHARACTER_HOME_LINES[id];assert.ok(lines?.length>=9,id);assert.equal(new Set(lines).size,lines.length,id);
 }
 assert.deepEqual(CHARACTER_HOME_LINES['character-naro'],CHARACTER_HOME_LINES['character-naro-solo']);
});
test('special lines use a 40 percent threshold, common lines the remaining 60 percent',()=>{
 const special=CHARACTER_HOME_LINES['character-hans'];
 assert.equal(pickHomeDialogue('character-hans',undefined,()=>0),special[0]);
 assert.equal(pickHomeDialogue('character-hans',undefined,()=>.399999),special.at(-1));
 assert.equal(pickHomeDialogue('character-hans',undefined,()=>.4),HOME_COMMON_LINES[0]);
 assert.equal(pickHomeDialogue('character-hans',undefined,()=>.999999),HOME_COMMON_LINES.at(-1));
 assert.notEqual(pickHomeDialogue('character-hans',special[0],()=>0),special[0]);
 assert.notEqual(pickHomeDialogue('character-hans',HOME_COMMON_LINES[0],()=>.4),HOME_COMMON_LINES[0]);
 assert.equal(pickHomeDialogue('future-character',undefined,()=>0),HOME_COMMON_LINES[0]);
});
