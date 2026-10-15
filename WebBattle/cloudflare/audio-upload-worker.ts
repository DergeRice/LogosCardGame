interface Env { AUDIO:R2Bucket; UPLOAD_TOKEN?:string }
export default { async fetch(request:Request,env:Env):Promise<Response>{
  if(!env.UPLOAD_TOKEN||request.headers.get('Authorization')!=='Bearer '+env.UPLOAD_TOKEN)return new Response(null,{status:403});
 const url=new URL(request.url);
 if(request.method==='GET'&&url.pathname==='/inventory'){
  const page=await env.AUDIO.list({prefix:'kokoro-afheart-v1/',limit:1000,cursor:url.searchParams.get('cursor')??undefined,include:['customMetadata']});
  return Response.json({truncated:page.truncated,cursor:page.truncated?page.cursor:null,objects:page.objects.map(o=>({key:o.key,size:o.size,sha256:o.customMetadata?.sha256}))});
 }
 if(request.method!=='PUT')return new Response(null,{status:405});
 const key=new URL(request.url).pathname.slice(1);
 if(!/^kokoro-afheart-v1\/[a-f0-9]{20}\.mp3$/.test(key))return new Response(null,{status:400});
 const sha=request.headers.get('X-Content-SHA256')??'',length=Number(request.headers.get('Content-Length'));
 if(!/^[a-f0-9]{64}$/.test(sha)||!Number.isInteger(length)||length<1500||length>200000||!request.body)return new Response(null,{status:400});
  const bytes=await request.arrayBuffer();
 if(bytes.byteLength!==length)return new Response(null,{status:400});
 const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 if(actual!==sha)return new Response(null,{status:400});
 const object=await env.AUDIO.put(key,bytes,{httpMetadata:{contentType:'audio/mpeg',cacheControl:'public, max-age=31536000, immutable'},customMetadata:{sha256:sha}});
 return Response.json({key,size:object.size,etag:object.etag,sha256:object.customMetadata?.sha256});
}};
