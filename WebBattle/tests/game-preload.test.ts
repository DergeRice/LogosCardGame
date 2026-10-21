import {test} from 'node:test';import assert from 'node:assert/strict';
import {GAME_ASSET_URLS,preloadGameAssets} from '../src/preloadGameAssets.js';
test('game image downloads are bounded and concurrent subscribers share progress and downloads',async()=>{
 let active=0,peak=0,requests=0;const previous=globalThis.Image;
 class FakeImage{onload?:()=>void;onerror?:()=>void;set src(_url:string){requests++;active++;peak=Math.max(peak,active);setImmediate(()=>this.onload?.())}async decode(){active--}}
 Object.defineProperty(globalThis,'Image',{value:FakeImage,configurable:true,writable:true});
 try{const first:number[]=[],second:number[]=[];const results=await Promise.all([preloadGameAssets(done=>first.push(done)),preloadGameAssets(done=>second.push(done))]);assert.equal(peak,6);assert.equal(requests,GAME_ASSET_URLS.length);assert.equal(active,0);assert.equal(first.at(-1),GAME_ASSET_URLS.length);assert.equal(second.at(-1),GAME_ASSET_URLS.length);assert.deepEqual(results,[{failed:0},{failed:0}]);await preloadGameAssets();assert.equal(requests,GAME_ASSET_URLS.length);}finally{if(previous)Object.defineProperty(globalThis,'Image',{value:previous,configurable:true,writable:true});else Reflect.deleteProperty(globalThis,'Image')}
});
