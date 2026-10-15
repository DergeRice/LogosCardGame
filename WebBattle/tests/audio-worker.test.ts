import {test} from 'node:test';import assert from 'node:assert/strict';import {buildSync} from 'esbuild';import {Miniflare,convertV4MiniflareOptions} from 'miniflare';import {readFileSync} from 'node:fs';
const script=buildSync({entryPoints:['cloudflare/audio-worker.ts'],bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022'}).outputFiles[0].text;
test('public audio Worker serves verified R2 audio with CORS/cache/HEAD and accepts no writes',async()=>{
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script,compatibilityDate:'2026-09-01',r2Buckets:{AUDIO:'audio-test'}}));
 try{
  const bucket=await mf.getR2Bucket('AUDIO'),key='kokoro-afheart-v1/e435e3f37c20730c9318.mp3',bytes=readFileSync('public/audio/sentences/'+key);
  await bucket.put(key,bytes,{httpMetadata:{contentType:'audio/mpeg'}});
  const get=await mf.dispatchFetch('https://audio.test/'+key);assert.equal(get.status,200);assert.equal(get.headers.get('Access-Control-Allow-Origin'),'*');assert.match(get.headers.get('Cache-Control')!,/immutable/);assert.equal(get.headers.get('Content-Type'),'audio/mpeg');assert.deepEqual(Buffer.from(await get.arrayBuffer()),bytes);
  const head=await mf.dispatchFetch('https://audio.test/'+key,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('Content-Length'),String(bytes.length));assert.equal((await head.arrayBuffer()).byteLength,0);
  assert.equal((await mf.dispatchFetch('https://audio.test/'+key,{method:'PUT',body:'bad'})).status,405);
  assert.equal((await mf.dispatchFetch('https://audio.test/manifest.json')).status,404);
  assert.equal((await mf.dispatchFetch('https://audio.test/'+key+'bad')).status,404);
  assert.equal((await mf.dispatchFetch('https://audio.test/'+key,{method:'OPTIONS'})).status,204);
 }finally{await mf.dispose();}
});
test('missing audio is not permanently cached before a pack is uploaded',async()=>{
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script,compatibilityDate:'2026-09-01',r2Buckets:{AUDIO:'audio-test'}}));
 try{
  const key='kokoro-afheart-v1/00000000000000000000.mp3',url='https://audio.test/'+key;
  assert.equal((await mf.dispatchFetch(url)).status,404);await (await mf.getR2Bucket('AUDIO')).put(key,'new audio');const result=await mf.dispatchFetch(url);assert.equal(result.status,200);assert.equal(await result.text(),'new audio');
 }finally{await mf.dispose();}
});
test('temporary uploader verifies hash/size, rejects unauthenticated writes and inventories only with its secret',async()=>{
 const upload=buildSync({entryPoints:['cloudflare/audio-upload-worker.ts'],bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022'}).outputFiles[0].text;
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:upload,compatibilityDate:'2026-09-01',r2Buckets:{AUDIO:'audio-upload-test'},bindings:{UPLOAD_TOKEN:'test-upload-secret'}}));
 try{
  const {createHash}=await import('node:crypto'),key='kokoro-afheart-v1/e435e3f37c20730c9318.mp3',bytes=readFileSync('public/audio/sentences/'+key),sha=createHash('sha256').update(bytes).digest('hex'),url='https://upload.test/'+key;
  assert.equal((await mf.dispatchFetch(url,{method:'PUT',body:bytes})).status,403);
  const headers={Authorization:'Bearer test-upload-secret','Content-Length':String(bytes.length),'X-Content-SHA256':'0'.repeat(64)};
  assert.equal((await mf.dispatchFetch(url,{method:'PUT',headers,body:bytes})).status,400);
  headers['X-Content-SHA256']=sha;const result=await mf.dispatchFetch(url,{method:'PUT',headers,body:bytes});assert.equal(result.status,200);assert.equal((await result.json() as any).sha256,sha);
  assert.equal((await mf.dispatchFetch('https://upload.test/inventory')).status,403);const inventory=await (await mf.dispatchFetch('https://upload.test/inventory',{headers:{Authorization:headers.Authorization}})).json() as any;assert.equal(inventory.objects.length,1);assert.equal(inventory.objects[0].sha256,sha);
 }finally{await mf.dispose();}
});
