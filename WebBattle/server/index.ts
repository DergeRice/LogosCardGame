import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { Game } from './game.js';
export function createBattleServer(options: ConstructorParameters<typeof Game>[0] = {}) {
 const game = new Game(options);
 const server = createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); if (req.url === '/health') { res.end(JSON.stringify({ status: 'ok', rooms: game.rooms.size })); } else { res.writeHead(404); res.end('{"error":"not_found"}'); } });
 const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
 const origins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173').split(',').map(s => s.trim());
 const ips = new Map<string, { count: number; at: number }>();
 server.on('upgrade', (req, socket, head) => {
  // Never trust arbitrary X-Forwarded-For for rate limits. Proxy traffic shares a conservative connection cap.
  const ip = req.socket.remoteAddress ?? 'unknown', now = Date.now();
  let entry = ips.get(ip); if (!entry || now - entry.at > 60_000) { entry = { count: 0, at: now }; ips.set(ip, entry); }
  if (req.url !== '/socket' || (req.headers.origin && !origins.includes(req.headers.origin)) || ++entry.count > 120 || wss.clients.size >= 1000) { socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
 });
 wss.on('connection', (ws: WebSocket) => {
  let player: ReturnType<Game['hello']> | undefined; let tokens = 20, at = Date.now(), alive = true;
  const helloTimeout = setTimeout(() => { if (!player) ws.close(4000, '세션 인증 시간이 지났어요.'); }, 10_000);
  const heartbeat = setInterval(() => { if (!alive) { ws.terminate(); return; } alive = false; ws.ping(); }, 10_000);
  ws.on('pong', () => { alive = true; });
  ws.on('message', raw => {
   try {
    const now = Date.now(); tokens = Math.min(20, tokens + (now - at) / 250); at = now;
    if (--tokens < 0) { game.send(ws, { type: 'error', message: '요청이 너무 빨라요. 잠시 기다려 주세요.' }); if (tokens < -20) ws.close(4008, 'rate limit'); return; }
    const msg = JSON.parse(raw.toString()); if (!msg || typeof msg !== 'object' || Array.isArray(msg)) throw Error('잘못된 메시지예요.');
    if (!player) { if (msg.type !== 'hello') throw Error('게스트 세션이 필요해요.'); player = game.hello(ws, msg.token, msg.name); clearTimeout(helloTimeout); }
    else if (player.socket === ws) game.handle(player, msg);
   } catch (e) { game.send(ws, { type: 'error', message: e instanceof SyntaxError ? '읽을 수 없는 요청이에요.' : e instanceof Error ? e.message : '요청 오류' }); }
  });
  ws.on('error', () => {});
  ws.on('close', () => { clearInterval(heartbeat); clearTimeout(helloTimeout); if (player) game.disconnected(player, ws); });
 });
 const timer = setInterval(() => { game.tick(); for (const [ip, entry] of ips) if (Date.now() - entry.at > 60_000) ips.delete(ip); }, 200);
 return { server, game, close: async () => { clearInterval(timer); for (const ws of wss.clients) ws.terminate(); await new Promise<void>(resolve => wss.close(() => resolve())); await new Promise<void>(resolve => server.close(() => resolve())); } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const bounded = (value: string | undefined, fallback: number, min: number, max: number) => value && Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
 const app = createBattleServer({ durationMs: bounded(process.env.MATCH_SECONDS, 0, 0, 600) * 1000, reconnectMs: bounded(process.env.RECONNECT_SECONDS, 30, 2, 120) * 1000 });
 app.server.listen(Number(process.env.PORT ?? 3001), '0.0.0.0', () => console.log('LOGOS WebSocket server ready on port', process.env.PORT ?? 3001));
 const stop = () => { void app.close().then(() => process.exit(0)); }; process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
