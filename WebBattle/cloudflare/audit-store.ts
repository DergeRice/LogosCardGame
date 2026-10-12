import {AUDIT_MAX_ROWS,AUDIT_RETENTION_MS,type AuditEvent} from '../server/audit.js';
export class AuditStore{
 private cleanedAt=0;
 private insertCount=0;
 constructor(private readonly sql:SqlStorage){
  sql.exec("CREATE TABLE IF NOT EXISTS audit_logs(id TEXT PRIMARY KEY,time INTEGER NOT NULL,level TEXT NOT NULL,event TEXT NOT NULL,action TEXT,player TEXT,room TEXT,request_id TEXT,data TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',note TEXT NOT NULL DEFAULT '')");
  sql.exec('CREATE INDEX IF NOT EXISTS audit_time ON audit_logs(time)');
 }
 insert(e:AuditEvent){
  this.sql.exec('INSERT INTO audit_logs(id,time,level,event,action,player,room,request_id,data) VALUES(?,?,?,?,?,?,?,?,?)',e.id,e.time,e.level,e.event,e.action,e.player??'',e.room??'',e.requestId,JSON.stringify(e));
  if(++this.insertCount%32===0||Date.now()-this.cleanedAt>60000){this.cleanedAt=Date.now();this.sql.exec('DELETE FROM audit_logs WHERE time<?',Date.now()-AUDIT_RETENTION_MS);this.sql.exec('DELETE FROM audit_logs WHERE id IN (SELECT id FROM audit_logs ORDER BY time DESC LIMIT -1 OFFSET ?)',AUDIT_MAX_ROWS);}
 }
 async handle(request:Request):Promise<Response>{
  const url=new URL(request.url),id=url.pathname.split('/')[3];
  if(request.method==='POST'&&id){
   const text=await request.text();if(text.length>2400)return Response.json({error:'수정 내용이 너무 깁니다.'},{status:413});
   let body;try{body=JSON.parse(text)}catch{return Response.json({error:'올바른 JSON이 필요합니다.'},{status:400})}
   if(!body||!['open','investigating','resolved'].includes(body.status)||typeof body.note!=='string'||body.note.length>2000)return Response.json({error:'올바른 상태와 2000자 이내 메모가 필요합니다.'},{status:400});
   if(!this.sql.exec('SELECT id FROM audit_logs WHERE id=?',id).toArray().length)return Response.json({error:'기록이 없습니다.'},{status:404});
   this.sql.exec('UPDATE audit_logs SET status=?,note=? WHERE id=?',body.status,body.note,id);return Response.json({ok:true});
  }
  if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
  const q=(url.searchParams.get('q')??'').slice(0,120),level=url.searchParams.get('level')??'',status=url.searchParams.get('status')??'',before=Number(url.searchParams.get('before'))||Date.now()+1;
  const limit=Math.min(500,Math.max(1,Number(url.searchParams.get('limit'))||100));
  const beforeId=url.searchParams.get('beforeId')??'zzzz';
  this.sql.exec('DELETE FROM audit_logs WHERE time<?',Date.now()-AUDIT_RETENTION_MS);
  const rows=this.sql.exec<{data:string;status:string;note:string}>('SELECT data,status,note FROM audit_logs WHERE (time<? OR (time=? AND id<?)) AND time>? AND (?=\'\' OR level=?) AND (?=\'\' OR status=?) AND (?=\'\' OR player LIKE ? OR room LIKE ? OR request_id LIKE ? OR data LIKE ?) ORDER BY time DESC,id DESC LIMIT ?',before,before,beforeId,Date.now()-AUDIT_RETENTION_MS,level,level,status,status,q,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,limit).toArray();
  const logs=rows.map(row=>({...JSON.parse(row.data),status:row.status,note:row.note}));
  const counts=this.sql.exec<{level:string;count:number}>('SELECT level,COUNT(*) AS count FROM audit_logs GROUP BY level').toArray();
  return Response.json({logs,counts,nextBefore:logs.length===limit?logs[logs.length-1].time:null,nextBeforeId:logs.length===limit?logs[logs.length-1].id:null,retentionDays:7,maxRows:AUDIT_MAX_ROWS},{headers:{'Cache-Control':'no-store'}});
 }
}
