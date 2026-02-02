const { WebSocketServer } = require('ws');
const { createServer } = require('http');

const PORT = parseInt(process.env.WS_PORT || '3001', 10);
const HOST = process.env.WS_HOST || '0.0.0.0';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
const WS_AUTH_TOKEN = process.env.WS_AUTH_TOKEN;

const server = createServer();
const wss = new WebSocketServer({ noServer: true, path: '/ws', maxPayload: 1024 * 1024 });

server.on('upgrade', (request, socket, head) => {
  const { origin } = request.headers;
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  
  if (pathname !== '/ws' || !ALLOWED_ORIGINS.includes(origin || '')) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  const token = new URLSearchParams(request.url.split('?')[1]).get('token');
  if (WS_AUTH_TOKEN && token !== WS_AUTH_TOKEN) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  const clientId = `client_${Date.now()}`;
  ws.send(JSON.stringify({ type: 'connection', data: { clientId } }));
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);
  ws.on('close', () => ws.terminate());
});

setInterval(() => {
  wss.clients.forEach(ws => (!ws.isAlive) && ws.terminate());
}, 30000);

server.listen(PORT, HOST, () => console.log(`[WS] Listening on ${HOST}:${PORT}`));
