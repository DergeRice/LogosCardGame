import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';
import assert from 'node:assert/strict';
const child = spawn(process.execPath, ['--env-file-if-exists=.env', 'dist-server/server/index.js'], { env: { ...process.env, PORT: '3002' }, windowsHide: true, stdio: ['ignore','pipe','pipe'] });
let ws;
try {
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Production startup timeout')),10000);child.stdout.on('data',data=>{if(String(data).includes('ready')){clearTimeout(timer);resolve();}});child.once('exit',code=>{clearTimeout(timer);reject(Error(`Server exited ${code}`));});});
 assert.equal((await (await fetch('http://127.0.0.1:3002/health')).json()).status,'ok');
 ws = new WebSocket('ws://127.0.0.1:3002/socket');
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Production WebSocket timeout')),20000);
  ws.on('open',()=>ws.send(JSON.stringify({type:'hello',name:'운영빌드 검사'})));
  ws.on('message',raw=>{const msg=JSON.parse(String(raw));if(msg.type==='session')ws.send(JSON.stringify({type:'quick'}));if(msg.type==='state'&&msg.room.phase==='battle'){assert.equal(msg.room.hand.length,5);clearTimeout(timer);resolve();}});
  ws.on('error',reject);
 });
 console.log('Production build: health + guest handshake + quick matching + authoritative battle state PASS');
} finally { ws?.terminate(); child.kill(); }
