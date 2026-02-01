/**
 * WebSocket Server for Trader Pro
 *
 * This server provides real-time data streaming for market data, signals, and alerts.
 *
 * Usage:
 *   npx ts-node scripts/websocket-server.ts
 *   or with custom port: PORT=3001 npx ts-node scripts/websocket-server.ts
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage } from 'http';
import { URL } from 'url';

// Configuration
const PORT = parseInt(process.env.WS_PORT || process.env.PORT || '3001', 10);
const HOST = process.env.WS_HOST || '0.0.0.0';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// Types
interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: number;
}

interface ClientInfo {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
}

// Create HTTP server for WebSocket upgrade
const server = createServer();
// 🛡️ Sentinel: Enforce Origin validation (CSWSH protection)
// Removed 'server' option to handle upgrade manually
const wss = new WebSocketServer({ noServer: true, path: '/ws' });

// Track connected clients
const clients = new Map<string, ClientInfo>();
let clientIdCounter = 0;

// Heartbeat interval to detect dead connections
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

/**
 * Generate a unique client ID
 */
function generateClientId(): string {
  return `client_${++clientIdCounter}_${Date.now()}`;
}

/**
 * Broadcast a message to all connected clients
 */
function broadcast(message: WebSocketMessage, excludeClient?: string): void {
  const messageStr = JSON.stringify({
    ...message,
    timestamp: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const clientInfo = Array.from(clients.values()).find(
        (info) => info.ws === client
      );

      if (!excludeClient || clientInfo?.id !== excludeClient) {
        client.send(messageStr);
      }
    }
  });
}

/**
 * Send a message to a specific client
 */
function sendToClient(clientId: string, message: WebSocketMessage): boolean {
  const clientInfo = clients.get(clientId);

  if (clientInfo && clientInfo.ws.readyState === WebSocket.OPEN) {
    clientInfo.ws.send(JSON.stringify({
      ...message,
      timestamp: Date.now(),
    }));
    return true;
  }

  return false;
}

// 🛡️ Sentinel: Handle upgrade with Origin validation
server.on('upgrade', (request: IncomingMessage, socket, head) => {
  const origin = request.headers.origin;
  let allowed = false;

  // Validate path
  const protocol = request.headers['x-forwarded-proto'] || 'http';
  const host = request.headers.host || `localhost:${PORT}`;
  const { pathname } = new URL(request.url || '/', `${protocol}://${host}`);

  if (pathname !== '/ws') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  // Validate Origin
  if (!origin) {
    // Block missing origin (common in scripts/bots)
    console.log('[WebSocket] Blocked connection with missing Origin header');
    allowed = false;
  } else {
    allowed = ALLOWED_ORIGINS.includes(origin);
    if (!allowed) {
      console.log(`[WebSocket] Blocked connection from unauthorized origin: ${origin}`);
    }
  }

  if (!allowed) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

/**
 * Handle new WebSocket connections
 */
wss.on('connection', (ws: WebSocket) => {
  const clientId = generateClientId();

  // Register client
  clients.set(clientId, {
    id: clientId,
    ws,
    isAlive: true,
  });

  console.log(`[WebSocket] Client connected: ${clientId}`);
  console.log(`[WebSocket] Total clients: ${clients.size}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    data: {
      clientId,
      message: 'Connected to Trader Pro WebSocket Server',
      serverTime: new Date().toISOString(),
    },
    timestamp: Date.now(),
  }));

  // Handle incoming messages from client
  ws.on('message', (data: Buffer) => {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      console.log(`[WebSocket] Received from ${clientId}:`, message.type);

      // Echo back for testing (remove in production)
      ws.send(JSON.stringify({
        type: 'echo',
        data: message,
        timestamp: Date.now(),
      }));

      // Handle specific message types
      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            data: { timestamp: Date.now() },
          }));
          break;

        case 'subscribe':
          // Handle subscription to data channels
          console.log(`[WebSocket] Client ${clientId} subscribed to:`, message.data);
          break;

        case 'unsubscribe':
          // Handle unsubscription from data channels
          console.log(`[WebSocket] Client ${clientId} unsubscribed from:`, message.data);
          break;

        default:
          console.log(`[WebSocket] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[WebSocket] Error parsing message from ${clientId}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' },
        timestamp: Date.now(),
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', (code: number, reason: Buffer) => {
    console.log(`[WebSocket] Client disconnected: ${clientId} (code: ${code}, reason: ${reason.toString()})`);
    clients.delete(clientId);
    console.log(`[WebSocket] Total clients: ${clients.size}`);
  });

  // Handle errors
  ws.on('error', (error: Error) => {
    console.error(`[WebSocket] Error for client ${clientId}:`, error);
  });

  // Setup heartbeat
  ws.on('pong', () => {
    const clientInfo = clients.get(clientId);
    if (clientInfo) {
      clientInfo.isAlive = true;
    }
  });
});

// Heartbeat interval to detect dead connections
const heartbeatInterval = setInterval(() => {
  clients.forEach((clientInfo, clientId) => {
    if (!clientInfo.isAlive) {
      console.log(`[WebSocket] Terminating inactive client: ${clientId}`);
      clientInfo.ws.terminate();
      clients.delete(clientId);
      return;
    }

    clientInfo.isAlive = false;
    clientInfo.ws.ping();
  });
}, HEARTBEAT_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[WebSocket] Shutting down server...');
  clearInterval(heartbeatInterval);

  // Close all client connections
  clients.forEach((clientInfo) => {
    clientInfo.ws.close(1000, 'Server shutting down');
  });

  // Close server
  server.close(() => {
    console.log('[WebSocket] Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`[WebSocket] Server running on ws://${HOST}:${PORT}/ws`);
  console.log(`[WebSocket] Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

// Export for testing
export { broadcast, sendToClient, wss };
