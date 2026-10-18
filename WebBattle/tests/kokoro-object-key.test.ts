import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {kokoroObjectKey} from '../shared/kokoro-audio.js';
test('Kokoro public object keys keep exact text, normalization and voice version compatible',async()=>{
 assert.equal(await kokoroObjectKey('Does the management make them enjoy our management?'),'kokoro-afheart-v1/2053dfabb04875e85579.mp3');assert.equal(await kokoroObjectKey(' I  work.\n'),await kokoroObjectKey('I work.'));assert.notEqual(await kokoroObjectKey('I work.'),await kokoroObjectKey('I work!'));
});
