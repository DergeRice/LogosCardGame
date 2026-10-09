import { DurableObject } from 'cloudflare:workers';
import { Game,type GameSocket } from '../server/game.js';
import { snapshot,restore,nextDeadline } from '../server/persistence.js';
interface Env { BATTLE:DurableObjectNamespace<BattleArena>;ALLOWED_ORIGINS:string;MATCH_SECONDS:string;RECONNECT_SECONDS:string }
type Attachment={id?:string;opened:number;tokens:number;at:number};
type Player=ReturnType<Game['newPlayer']>;
const bounded=(v:string,def:number,min:number,max:number)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):def;

export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname!=='/health'&&url.pathname!=='/socket')return new Response('Not found',{status:404});
  if(url.pathname==='/socket'){
   if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
   const origin=request.headers.get('Origin');
   if(origin&&!env.ALLOWED_ORIGINS.split(',').includes(origin))return new Response('Origin not allowed',{status:403});
  }
  // A single persisted coordinator preserves the existing shared matchmaking pool.
  return env.BATTLE.getByName('public-arena-v1').fetch(request);
 }
} satisfies ExportedHandler<Env>;

export class BattleArena extends DurableObject<Env>{
 game:Game;cache=new Map<string,string>();adapters=new Map<WebSocket,GameSocket>();
 // All game mutations AND persistence are serialized; responses flush after commit.
 queue:Promise<unknown>=Promise.resolve();outbox:(()=>void)[]|null=null;
 constructor(ctx:DurableObjectState,env:Env){
  super(ctx,env);
  this.game=new Game({durationMs:bounded(env.MATCH_SECONDS,0,0,600)*1000,reconnectMs:bounded(env.RECONNECT_SECONDS,30,2,120)*1000});
  ctx.blockConcurrencyWhile(async()=>{
   ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
   ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS connections (ip TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL)');
   for(const row of ctx.storage.sql.exec<{key:string;value:string}>('SELECT key,value FROM records'))this.cache.set(row.key,row.value);
   const players=restore(this.game,this.cache);
   for(const ws of ctx.getWebSockets()){
    const a=ws.deserializeAttachment() as Attachment;const adapter=this.adapter(ws),p=a.id?players.get(a.id):undefined;
    if(p){p.socket=adapter;p.disconnectedAt=undefined;}
   }
   // During an infrastructure restart an unattached socket becomes reconnectable.
   for(const p of players.values())if(!p.ai&&!p.socket&&p.room&&!p.disconnectedAt)p.disconnectedAt=Date.now();
   ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"type":"ping"}','{"type":"pong"}'));
  });
 }
 adapter(ws:WebSocket):GameSocket{
  let a=this.adapters.get(ws);if(a)return a;
  const schedule=(fn:()=>void)=>{if(this.outbox)this.outbox.push(fn);else{try{fn();}catch{/* peer closed */}}};
  a={get readyState(){return ws.readyState;},bufferedAmount:0,send(data){schedule(()=>ws.send(data));},close(code,reason){schedule(()=>ws.close(code,reason));},terminate(){schedule(()=>ws.close(1013,'Slow connection'));}};
  this.adapters.set(ws,a);return a;
 }
 async serial<T>(fn:()=>T):Promise<T>{
  const work=this.queue.then(async()=>{
   this.outbox=[];
   try{
    const result=fn();await this.persist();const pending=this.outbox;this.outbox=null;
    for(const send of pending)try{send();}catch{/* remote close races are handled by close events */}
    return result;
   }catch(e){this.outbox=null;this.ctx.abort('Game storage commit failed; reconnect to restore committed state.');throw e;}
  });this.queue=work.catch(()=>{});return work;
 }
 async persist(){
  const next=snapshot(this.game),now=Date.now();let deadline=nextDeadline(this.game);
  for(const ws of this.ctx.getWebSockets()){
   const a=ws.deserializeAttachment() as Attachment;
   if(!a.id){const at=a.opened+10000;if(at<=now){ws.close(4000,'세션 인증 시간이 지났어요.');}else deadline=Math.min(deadline??Infinity,at);}
  }
  this.ctx.storage.transactionSync(()=>{
   for(const [key,value]of next)if(this.cache.get(key)!==value)this.ctx.storage.sql.exec('INSERT INTO records(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',key,value);
   for(const key of this.cache.keys())if(!next.has(key))this.ctx.storage.sql.exec('DELETE FROM records WHERE key=?',key);
   this.ctx.storage.sql.exec('DELETE FROM connections WHERE expires<=?',now);
  });this.cache=next;
  if(deadline!==null)await this.ctx.storage.setAlarm(deadline);else await this.ctx.storage.deleteAlarm();
 }
 async fetch(request:Request):Promise<Response>{
  return this.serial(()=>{
   this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS connections (ip TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL)');
   this.game.tick();
   if(new URL(request.url).pathname==='/health')return Response.json({status:'ok',provider:'cloudflare',storage:'sqlite',rooms:this.game.rooms.size});
   const now=Date.now(),ip=request.headers.get('CF-Connecting-IP')??'unknown';
   const row=this.ctx.storage.sql.exec<{count:number;expires:number}>('SELECT count,expires FROM connections WHERE ip=?',ip).toArray()[0];
   const count=row&&row.expires>now?row.count+1:1,expires=row&&row.expires>now?row.expires:now+60000;
   if(count>120||this.ctx.getWebSockets().length>=1000)return new Response('Connection limit',{status:429});
   this.ctx.storage.sql.exec('INSERT INTO connections(ip,count,expires) VALUES(?,?,?) ON CONFLICT(ip) DO UPDATE SET count=excluded.count,expires=excluded.expires',ip,count,expires);
   const pair=new WebSocketPair(),client=pair[0],server=pair[1];
   server.serializeAttachment({opened:now,tokens:20,at:now} satisfies Attachment);
   this.ctx.acceptWebSocket(server);this.adapter(server);
   return new Response(null,{status:101,webSocket:client});
  });
 }
 async webSocketMessage(ws:WebSocket,raw:string|ArrayBuffer){
  await this.serial(()=>{
   const adapter=this.adapter(ws),a=ws.deserializeAttachment() as Attachment;
   let p:Player|undefined=a.id?[...this.game.sessions.values()].find(p=>p.id===a.id):undefined;
   try{
    if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>4096){ws.close(1009,'Message too large');return;}
    const now=Date.now();a.tokens=Math.min(20,a.tokens+(now-a.at)/250)-1;a.at=now;ws.serializeAttachment(a);
    if(a.tokens<0){this.game.send(adapter,{type:'error',message:'요청이 너무 빨라요. 잠시 기다려 주세요.'});if(a.tokens< -20)ws.close(4008,'rate limit');return;}
    const msg=JSON.parse(raw);if(!msg||typeof msg!=='object'||Array.isArray(msg))throw Error('잘못된 메시지예요.');
    if(!p){if(msg.type!=='hello')throw Error('게스트 세션이 필요해요.');p=this.game.hello(adapter,msg.token,msg.name);a.id=p.id;ws.serializeAttachment(a);}
    else if(p.socket===adapter)this.game.handle(p,msg);
   }catch(e){this.game.send(adapter,{type:'error',message:e instanceof SyntaxError?'읽을 수 없는 요청이에요.':e instanceof Error?e.message:'요청 오류'});}
  });
 }
 async webSocketClose(ws:WebSocket,code:number,reason:string){await this.disconnected(ws);try{ws.close(code,reason);}catch{/* already closed */}}
 async webSocketError(ws:WebSocket){await this.disconnected(ws);}
 async disconnected(ws:WebSocket){await this.serial(()=>{const a=ws.deserializeAttachment() as Attachment;const p=[...this.game.sessions.values()].find(p=>p.id===a.id);if(p)this.game.disconnected(p,this.adapter(ws));this.adapters.delete(ws);});}
 async alarm(){await this.serial(()=>this.game.tick());}
}
