export interface AudioEnv { AUDIO:R2Bucket }
const headers=()=>new Headers({'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Expose-Headers':'Content-Length, ETag','Cross-Origin-Resource-Policy':'cross-origin','X-Content-Type-Options':'nosniff'});
export default {
 async fetch(request:Request,env:AudioEnv,ctx:ExecutionContext):Promise<Response>{
  const h=headers(),url=new URL(request.url);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:h});
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:h});
  if(url.pathname==='/health')return Response.json({service:'logos-card-audio',storage:'R2 Standard',voice:'af_heart',version:'v0.9.58',catalogSentences:24155,bytes:548560728}, {headers:h});
  if(!/^\/kokoro-afheart-v1\/[a-f0-9]{20}\.mp3$/.test(url.pathname))return new Response(null,{status:404,headers:h});
  const key=url.pathname.slice(1),cache=caches.default,cacheKey=new Request(url.origin+url.pathname);
  const cached=await cache.match(cacheKey);
  if(cached){const result=new Response(request.method==='HEAD'?null:cached.body,cached);for(const [k,v] of h)result.headers.set(k,v);result.headers.set('X-Audio-Cache','HIT');return result;}
  const object=await env.AUDIO.get(key);
  if(!object)return new Response(null,{status:404,headers:h});
  object.writeHttpMetadata(h);h.set('Content-Type','audio/mpeg');h.set('Cache-Control','public, max-age=31536000, immutable');h.set('Content-Length',String(object.size));h.set('ETag',object.httpEtag);h.set('X-Audio-Cache','MISS');
  const response=new Response(object.body,{headers:h});
  ctx.waitUntil(cache.put(cacheKey,response.clone()));
  return request.method==='HEAD'?new Response(null,response):response;
 }
};
