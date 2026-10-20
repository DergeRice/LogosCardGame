import {test} from 'node:test';import assert from 'node:assert/strict';
import {HOME_COMMON_LINES,CHARACTER_HOME_LINES,pickHomeDialogue} from '../src/homeDialogue.js';
test('home dialogue has thirty distinct common lines and avoids immediate repeats',()=>{
 assert.equal(HOME_COMMON_LINES.length,30);assert.equal(new Set(HOME_COMMON_LINES).size,30);assert.deepEqual(CHARACTER_HOME_LINES,{});
 for(let i=0;i<30;i++){assert.equal(pickHomeDialogue('character-hans',undefined,()=>i/30),HOME_COMMON_LINES[i]);assert.notEqual(pickHomeDialogue('character-hans',HOME_COMMON_LINES[i],()=>i/30),HOME_COMMON_LINES[i]);}
 assert.equal(pickHomeDialogue('future-character',undefined,()=>0),HOME_COMMON_LINES[0]);
});
