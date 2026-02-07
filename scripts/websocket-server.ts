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
import { createHash } from 'crypto';

// Configuration
const PORT = parseInt(process.env.WS_PORT || process.env.PORT || '3001', 10);
const HOST = process.env.WS_HOST || '0.0.0.0';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// Security Configuration
const AUTH_TOKEN = process.env.WS_AUTH_TOKEN || generateDefaultToken();
const MAX_CONNECTIONS_PER_IP = parseInt(process.env.WS_MAX_CONNECTIONS_PER_IP || '5', 10);
const MAX_MESSAGE_SIZE = parseInt(process.env.WS_MAX_MESSAGE_SIZE || '1048576', 10); // 1MB default
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_MESSAGES = parseInt(process.env.WS_RATE_LIMIT_MAX_MESSAGES || '100', 10);

/**
 * Generate a default authentication token (only for development)
 * In production, this should be provided via environment variable
 */
function generateDefaultToken(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('WS_AUTH_TOKEN must be set in production environment');
  }
  const token = createHash('sha256').update('dev-token-' + Date.now()).digest('hex').substring(0, 32);
  console.warn('[WebSocket] WARNING: Using auto-generated auth token for development');
  console.warn(`[WebSocket] Auth token: ${token}`);
  return token;
}

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
  ip: string;
  connectedAt: number;
  messageCount: number;
  lastMessageTime: number;
  authenticated: boolean;
  subscriptions: Set<string>;
}

// Rate limiting tracking
interface RateLimitInfo {
  messageCount: number;
  windowStart: number;
}

// Track connections per IP
const connectionsPerIP = new Map<string, number>();
// Track rate limiting per client
const rateLimitMap = new Map<string, RateLimitInfo>();

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
 * Extract IP address from request
 */
function getClientIP(request: IncomingMessage): string {
  // Check for proxy headers first
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  
  const realIP = request.headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }
  
  return request.socket.remoteAddress || 'unknown';
}

/**
 * Validate authentication token
 */
function validateAuthToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  const expected = AUTH_TOKEN;
  if (token.length !== expected.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Check if client has exceeded rate limit
 */
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const limitInfo = rateLimitMap.get(clientId);
  
  if (!limitInfo || now - limitInfo.windowStart > RATE_LIMIT_WINDOW) {
    // Start new window
    rateLimitMap.set(clientId, {
      messageCount: 1,
      windowStart: now,
    });
    return true;
  }
  
  if (limitInfo.messageCount >= RATE_LIMIT_MAX_MESSAGES) {
    return false;
  }
  
  limitInfo.messageCount++;
  return true;
}

/**
 * Sanitize message data to prevent XSS and injection attacks
 */
function sanitizeMessageData(data: unknown): unknown {
  if (typeof data === 'string') {
    // Remove potentially dangerous characters
    return data.replace(/[<>'"]/g, '');
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeMessageData(item));
  }
  
  if (data && typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Limit key length to prevent DoS
      if (key.length > 100) continue;
      sanitized[key] = sanitizeMessageData(value);
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Broadcast a message to all connected clients
 */
function broadcast(message: WebSocketMessage, excludeClient?: string): void {
  const messageStr = JSON.stringify({
    ...message,
    timestamp: Date.now(),
  });

  wss.clients.forEach((client: WebSocket) => {
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
  const clientIP = getClientIP(request);
  let allowed = false;

  console.log(`[WebSocket] Connection attempt from IP: ${clientIP}`);

  // Check IP connection limit
  const currentConnections = connectionsPerIP.get(clientIP) || 0;
  if (currentConnections >= MAX_CONNECTIONS_PER_IP) {
    console.log(`[WebSocket] Rejected: Too many connections from IP ${clientIP}`);
    socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
    socket.destroy();
    return;
  }

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
    console.log(`[WebSocket] Blocked connection with missing Origin header from ${clientIP}`);
    allowed = false;
  } else {
    allowed = ALLOWED_ORIGINS.includes(origin);
    if (!allowed) {
      console.log(`[WebSocket] Blocked connection from unauthorized origin: ${origin} (IP: ${clientIP})`);
    }
  }

  if (!allowed) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  // Increment connection count for this IP
  connectionsPerIP.set(clientIP, currentConnections + 1);

  wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
    wss.emit('connection', ws, request);
  });
});

/**
 * Handle new WebSocket connections
 */
wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
  const clientId = generateClientId();
  const clientIP = getClientIP(request);

  // Register client (initially unauthenticated)
  const clientInfo: ClientInfo = {
    id: clientId,
    ws,
    isAlive: true,
    ip: clientIP,
    connectedAt: Date.now(),
    messageCount: 0,
    lastMessageTime: Date.now(),
    authenticated: false, 
    subscriptions: new Set<string>(),
  };
  clients.set(clientId, clientInfo);

  console.log(`[WebSocket] Client connected: ${clientId} from IP: ${clientIP} (Pending Auth)`);

  // Set auth timeout
  const authTimeout = setTimeout(() => {
    if (!clientInfo.authenticated) {
      console.log(`[WebSocket] Auth timeout for ${clientId}, closing...`);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Authentication timeout', code: 'AUTH_TIMEOUT' },
        timestamp: Date.now(),
      }));
      ws.close(4001, 'Authentication timeout');
    }
  }, 10000); // 10 seconds to authenticate

  // Set maximum message size
  ws.on('message', (_data: Buffer) => {
    if (_data.length > MAX_MESSAGE_SIZE) {
      console.log(`[WebSocket] Message too large from ${clientId}, closing connection`);
      ws.close(1009, 'Message too large');
      return;
    }
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    data: {
      clientId,
      message: 'Connected to Trader Pro WebSocket Server. Please authenticate.',
      serverTime: new Date().toISOString(),
    },
    timestamp: Date.now(),
  }));

  // Handle incoming messages from client
  ws.on('message', (data: Buffer) => {
    // Check rate limit
    if (!checkRateLimit(clientId)) {
      console.log(`[WebSocket] Rate limit exceeded for ${clientId}`);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Rate limit exceeded' },
        timestamp: Date.now(),
      }));
      return;
    }

    // Update client message statistics
    clientInfo.messageCount++;
    clientInfo.lastMessageTime = Date.now();

    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      // Validate message structure
      if (!message.type || typeof message.type !== 'string') {
        throw new Error('Invalid message structure: missing or invalid type');
      }

      // Handle Authentication message
      if (message.type === 'auth') {
        const token = (message.data as any)?.token;
        if (validateAuthToken(token)) {
          clientInfo.authenticated = true;
          clearTimeout(authTimeout);
          console.log(`[WebSocket] Client ${clientId} authenticated successfully`);
          ws.send(JSON.stringify({
            type: 'authenticated',
            data: { message: 'Authentication successful' },
            timestamp: Date.now(),
          }));
        } else {
          console.log(`[WebSocket] Authentication failed for ${clientId}`);
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Invalid authentication token', code: 'AUTH_FAILED' },
            timestamp: Date.now(),
          }));
          ws.close(4003, 'Authentication failed');
        }
        return;
      }

      // Reject all other messages if not authenticated
      if (!clientInfo.authenticated) {
        console.log(`[WebSocket] Unauthorized message from ${clientId}`);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
          timestamp: Date.now(),
        }));
        return;
      }

      // Sanitize message data
      if (message.data) {
        message.data = sanitizeMessageData(message.data);
      }

      console.log(`[WebSocket] Received from ${clientId}:`, message.type);

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
          if (message.data && typeof message.data === 'string') {
            const symbols = message.data.split(',').map(s => s.trim().toUpperCase());
            symbols.forEach(s => clientInfo.subscriptions.add(s));
            console.log(`[WebSocket] Client ${clientId} subscribed to:`, symbols);
            ws.send(JSON.stringify({
              type: 'subscribed',
              data: Array.from(clientInfo.subscriptions),
              timestamp: Date.now(),
            }));
          }
          break;

        case 'unsubscribe':
          // Handle unsubscription from data channels
          if (message.data && typeof message.data === 'string') {
            const symbols = message.data.split(',').map(s => s.trim().toUpperCase());
            symbols.forEach(s => clientInfo.subscriptions.delete(s));
            console.log(`[WebSocket] Client ${clientId} unsubscribed from:`, symbols);
            ws.send(JSON.stringify({
              type: 'unsubscribed',
              data: Array.from(clientInfo.subscriptions),
              timestamp: Date.now(),
            }));
          }
          break;

        default:
          console.log(`[WebSocket] Unknown message type: ${message.type}`);
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Unknown message type' },
            timestamp: Date.now(),
          }));
      }
    } catch (error) {
      console.error(`[WebSocket] Error processing message from ${clientId}:`, error);
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
    
    const clientInfo = clients.get(clientId);
    if (clientInfo) {
      // Decrement IP connection count
      const currentCount = connectionsPerIP.get(clientInfo.ip) || 0;
      if (currentCount > 1) {
        connectionsPerIP.set(clientInfo.ip, currentCount - 1);
      } else {
        connectionsPerIP.delete(clientInfo.ip);
      }
      
      // Clean up rate limit tracking
      rateLimitMap.delete(clientId);
    }
    
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

// --- Market Data Simulator ---

// Base prices for simulation
const basePrices: Record<string, number> = {
  'AAPL': 180.50,
  'GOOGL': 140.20,
  'TSLA': 190.10,
  'AMZN': 175.40,
  '^N225': 38000.00,
  '7203': 3300.00,
  '6758': 13000.00,
};

// Simulation interval
const simulationInterval = setInterval(() => {
  if (clients.size === 0) return;

  // Get all unique symbols currently subscribed to
  const allSubscribedSymbols = new Set<string>();
  clients.forEach(client => {
    client.subscriptions.forEach(symbol => allSubscribedSymbols.add(symbol));
  });

  if (allSubscribedSymbols.size === 0) return;

  // Generate and send updates for each symbol
  allSubscribedSymbols.forEach(symbol => {
    const basePrice = basePrices[symbol] || 100.00;
    // Small random walk: -0.1% to +0.1%
    const change = (Math.random() - 0.5) * 0.002;
    basePrices[symbol] = basePrice * (1 + change);
    
    const marketData = {
      symbol,
      price: basePrices[symbol],
      change: basePrices[symbol] - basePrice,
      changePercent: change * 100,
      volume: Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
    };

    // Broadcast only to clients who subscribed to this symbol
    clients.forEach(client => {
      if (client.subscriptions.has(symbol)) {
        client.ws.send(JSON.stringify({
          type: 'market_data',
          data: marketData,
          timestamp: Date.now(),
        }));
      }
    });
  });
}, 1000); // 1 second updates

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[WebSocket] Shutting down server...');
  clearInterval(heartbeatInterval);
  clearInterval(simulationInterval);

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
  console.log(`[WebSocket] Security settings:`);
  console.log(`  - Authentication: ${AUTH_TOKEN ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  - Max connections per IP: ${MAX_CONNECTIONS_PER_IP}`);
  console.log(`  - Max message size: ${MAX_MESSAGE_SIZE} bytes`);
  console.log(`  - Rate limit: ${RATE_LIMIT_MAX_MESSAGES} messages per ${RATE_LIMIT_WINDOW / 1000}s`);
  
  if (process.env.NODE_ENV !== 'production' && !process.env.WS_AUTH_TOKEN) {
    console.warn('\n⚠️  WARNING: Using auto-generated auth token for development');
    console.warn('   Set WS_AUTH_TOKEN environment variable for production use\n');
  }
});

// Export for testing
export { broadcast, sendToClient, wss };
