/**
 * WebSocket Server for Trader Pro
 *
 * This server provides real-time data streaming for market data, signals, and alerts.
 *
 * Usage:
 *   node scripts/websocket-server.js
 *   or with custom port: PORT=3001 node scripts/websocket-server.js
 */

const { WebSocketServer } = require('ws');
const { createServer } = require('http');

// Configuration
const PORT = parseInt(process.env.WS_PORT || process.env.PORT || '3001', 10);
const HOST = process.env.WS_HOST || '0.0.0.0';

// Create HTTP server for WebSocket upgrade
const server = createServer();
const wss = new WebSocketServer({ server, path: '/ws' });

// Track connected clients
const clients = new Map();
let clientIdCounter = 0;

// Heartbeat interval to detect dead connections
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

/**
 * Generate a unique client ID
 */
function generateClientId() {
  return `client_${++clientIdCounter}_${Date.now()}`;
}

/**
 * Broadcast a message to all connected clients
 */
function broadcast(message, excludeClient) {
  const messageStr = JSON.stringify({
    ...message,
    timestamp: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
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
function sendToClient(clientId, message) {
  const clientInfo = clients.get(clientId);

  if (clientInfo && clientInfo.ws.readyState === 1) {
    clientInfo.ws.send(JSON.stringify({
      ...message,
      timestamp: Date.now(),
    }));
    return true;
  }

  return false;
}

/**
 * Handle new WebSocket connections
 */
wss.on('connection', (ws) => {
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
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

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
    }
  });

  // Handle connection close
  ws.on('close', (code, reason) => {
    clients.delete(clientId);
    console.log(`[WebSocket] Client disconnected: ${clientId} (code: ${code}, reason: ${reason.toString()})`);
    console.log(`[WebSocket] Total clients: ${clients.size}`);
  });

  // Handle connection errors
  ws.on('error', (error) => {
    console.error(`[WebSocket] Error for client ${clientId}:`, error);
    clients.delete(clientId);
  });

  // Handle pong responses (for heartbeat)
  ws.on('pong', () => {
    const clientInfo = clients.get(clientId);
    if (clientInfo) {
      clientInfo.isAlive = true;
    }
  });
});

/**
 * Heartbeat check to detect stale connections
 */
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const clientInfo = Array.from(clients.values()).find(
      (info) => info.ws === ws
    );

    if (clientInfo) {
      if (!clientInfo.isAlive) {
        console.log(`[WebSocket] Terminating stale connection: ${clientInfo.id}`);
        ws.terminate();
        clients.delete(clientInfo.id);
        return;
      }

      clientInfo.isAlive = false;
      ws.ping();
    }
  });
}, HEARTBEAT_INTERVAL);

/**
 * Handle server shutdown gracefully
 */
function shutdown() {
  console.log('[WebSocket] Shutting down server...');

  // Stop heartbeat
  clearInterval(heartbeatInterval);

  // Close all client connections
  wss.clients.forEach((ws) => {
    ws.close(1000, 'Server shutting down');
  });

  // Close server
  server.close(() => {
    console.log('[WebSocket] Server closed');
    process.exit(0);
  });

  // Force shutdown after 5 seconds
  setTimeout(() => {
    console.error('[WebSocket] Forced shutdown');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * Start the server
 */
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('==========================================');
  console.log('  Trader Pro WebSocket Server');
  console.log('==========================================');
  console.log(`  Host: ${HOST}`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Path: /ws`);
  console.log(`  URL: ws://${HOST}:${PORT}/ws`);
  console.log('==========================================');
  console.log('');
});

/**
 * Example: Broadcast market data (for testing)
 * Uncomment to enable periodic test broadcasts
 */
// const TEST_BROADCAST_INTERVAL = 5000; // 5 seconds
// setInterval(() => {
//   if (clients.size > 0) {
//     broadcast({
//       type: 'market_data',
//       data: {
//         symbol: 'AAPL',
//         price: 150 + Math.random() * 10,
//         change: (Math.random() - 0.5) * 5,
//       },
//     });
//   }
// }, TEST_BROADCAST_INTERVAL);
