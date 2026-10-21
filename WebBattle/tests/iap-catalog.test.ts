import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DIAMOND_PACKS,diamondPack} from '../shared/store.js';

test('Google Play diamond catalog has stable products and Korean launch prices',()=>{
 assert.deepEqual(DIAMOND_PACKS.map(({id,amount,won})=>[id,amount,won]),[
  ['diamonds_100',100,1200],['diamonds_300',300,2900],['diamonds_1000',1000,8900],['diamonds_3000',3000,24900],
 ]);
 assert.equal(diamondPack('diamonds_3000')?.won,24900);
 assert.equal(diamondPack('unknown'),undefined);
});
