import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {CATALOG,DECK_FACES} from '../shared/rules.js';
import {ART} from '../src/theme.js';
const root=process.cwd(),profiles=path.join(root,'public/profiles'),origin='http://127.0.0.1:5174';
const faces=DECK_FACES.map(c=>({kind:c.kind,face:c.variant??c.kind,name:CATALOG[c.kind].name}));
let publishing=false;
await fs.mkdir(profiles,{recursive:true});
try{await fs.access(path.join(profiles,'manifest.json'));}catch{await fs.writeFile(path.join(profiles,'manifest.json'),'{}');}
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.headers.host!=='127.0.0.1:5174'||(req.headers.origin&&req.headers.origin!==origin)){res.writeHead(403);res.end('Local access only');return;}
 const url=new URL(req.url??'/',origin);
 const json=(code:number,data:unknown)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 try{
  if(req.method==='GET'&&url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await fs.readFile(path.join(root,'tools/profile-editor.html')));return;}
  if(req.method==='GET'&&url.pathname==='/catalog'){json(200,{catalog:CATALOG,art:ART,faces,manifest:JSON.parse(await fs.readFile(path.join(profiles,'manifest.json'),'utf8'))});return;}
  if(req.method==='GET'&&/^\/assets\/CardImage[1-5]\.jpg$/.test(url.pathname)){res.setHeader('Content-Type','image/jpeg');res.end(await fs.readFile(path.join(root,'public',url.pathname)));return;}
  if(req.method==='GET'&&faces.some(face=>url.pathname===`/cards/${face.face}.webp`)){res.setHeader('Content-Type','image/webp');res.end(await fs.readFile(path.join(root,'public',url.pathname)));return;}
  if(req.method==='GET'&&/^\/profiles\/[a-z]+\.png$/.test(url.pathname)){res.setHeader('Content-Type','image/png');res.end(await fs.readFile(path.join(root,'public',url.pathname)));return;}
  if(req.method==='POST'&&req.headers.origin===origin&&url.pathname==='/save'){
   if(publishing){json(409,{error:'배포 중입니다. 완료 후 저장하세요.'});return;}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>2_000_000){json(413,{error:'이미지가 너무 큽니다.'});return;}}
   const {kind,image}=JSON.parse(body);
   if(!Object.hasOwn(CATALOG,kind)||typeof image!=='string'||!image.startsWith('data:image/png;base64,'))throw Error('올바른 PNG 프로필을 선택하세요.');
   const bytes=Buffer.from(image.slice(22),'base64');
   if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==512||bytes.readUInt32BE(20)!==512)throw Error('512 × 512 PNG만 저장합니다.');
   await fs.writeFile(path.join(profiles,kind+'.png'),bytes);
   const manifest=JSON.parse(await fs.readFile(path.join(profiles,'manifest.json'),'utf8'));manifest[kind]=`/profiles/${kind}.png?v=${Date.now()}`;
   await fs.writeFile(path.join(profiles,'manifest.json'),JSON.stringify(manifest,null,2));json(200,{url:manifest[kind]});return;
  }
  if(req.method==='POST'&&req.headers.origin===origin&&url.pathname==='/publish'){
   if(publishing){json(409,{error:'이미 배포 중입니다.'});return;}publishing=true;
   // Fixed commands only. No browser input is passed to the shell.
   const run=(cmd:string)=>new Promise<void>((resolve,reject)=>{const child=spawn(cmd,{cwd:root,shell:true,windowsHide:true,stdio:'ignore'});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('빌드 또는 Netlify 배포 실패. 터미널에서 계정 연결을 확인하세요.')));});
   try{await run('npm run build');await run('npx netlify-cli deploy --prod --dir dist --no-build --message "Update profile crops"');json(200,{url:'https://logos-card-battle.netlify.app'});}finally{publishing=false;}return;
  }
  json(404,{error:'찾을 수 없습니다.'});
 }catch(e){json(400,{error:e instanceof Error?e.message:'요청 실패'});}
});
server.listen(5174,'127.0.0.1',()=>console.log(`Private profile editor: ${origin}`));
