# WebSocket Setup Guide for Trader Pro

This guide explains how to set up and use the WebSocket server for real-time data streaming in Trader Pro.

## Quick Start

### 1. Start the WebSocket Server

#### Linux/macOS:
```bash
# Default port (3001)
./scripts/start-websocket-server.sh

# Custom port
./scripts/start-websocket-server.sh 8080
```

#### Windows:
```powershell
# Default port (3001)
.\scripts\start-websocket-server.ps1

# Custom port
.\scripts\start-websocket-server.ps1 8080
```

#### Using npm:
```bash
cd trading-platform
npm run ws:server        # Production
npm run ws:server:dev    # Development with custom port
```

### 2. Start the Trading Platform

In a separate terminal:

```bash
cd trading-platform
npm run dev
```

The platform will automatically connect to the WebSocket server at `ws://localhost:3001/ws`.

## Configuration

### Environment Variables

You can customize the WebSocket server using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `WS_PORT` or `PORT` | WebSocket server port | `3001` |
| `WS_HOST` | Host to bind to | `0.0.0.0` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins | `http://localhost:3000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for client | `ws://localhost:3001/ws` |

### Examples

#### Custom Port:
```bash
WS_PORT=8080 ./scripts/start-websocket-server.sh
```

#### Multiple Allowed Origins:
```bash
export ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,https://example.com"
./scripts/start-websocket-server.sh
```

#### Custom WebSocket URL for Client:
```bash
# In trading-platform/.env.local
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

## Features

### 1. Automatic Reconnection

The WebSocket client automatically reconnects when the connection is lost:

- **Exponential backoff**: Retry intervals increase exponentially (2s, 4s, 8s, 16s, 32s)
- **Maximum backoff**: Capped at 30 seconds
- **Jitter**: Random delay added to prevent thundering herd
- **Max attempts**: Default 5 attempts before entering fallback mode

### 2. Fallback Polling

When WebSocket connection fails after max attempts, the system falls back to HTTP polling:

- Polls data from `/api/market/snapshot` every 5 seconds
- Maintains functionality even when WebSocket is unavailable
- Automatically switches back to WebSocket when available

### 3. Heartbeat Mechanism

The server and client use ping/pong messages to detect stale connections:

- Server sends ping every 30 seconds
- Client responds with pong
- Connection terminated if no pong received within 10 seconds

### 4. Message Queuing

Messages sent while disconnected are queued and delivered when reconnected:

- Queue size limited to 1000 messages
- Failed messages retried up to 3 times
- Oldest messages dropped when queue is full

### 5. Rate Limiting

Server enforces rate limiting to prevent abuse:

- Maximum 50 messages per second per client
- Exceeding limit results in warning message and dropped messages

## Usage in Code

### Using the Resilient WebSocket Hook

```typescript
import { useResilientWebSocket } from '@/app/hooks/useResilientWebSocket';

function MyComponent() {
  const {
    status,           // 'CONNECTING' | 'OPEN' | 'CLOSED' | 'RECONNECTING' | 'FALLBACK' | 'ERROR'
    isConnected,      // boolean
    lastMessage,      // Last received message
    error,            // Last error if any
    sendMessage,      // Function to send messages
    connect,          // Manual connect
    disconnect,       // Manual disconnect
    reconnect,        // Manual reconnect
    connectionDuration, // Duration in ms
    stateHistory,     // Connection state history
  } = useResilientWebSocket({
    url: 'ws://localhost:3001/ws',  // Optional, uses default if not provided
    enabled: true,                   // Optional, default true
    onMessage: (msg) => {
      console.log('Received:', msg);
    },
    onError: (err) => {
      console.error('WebSocket error:', err);
    },
    onStatusChange: (status) => {
      console.log('Status changed:', status);
    },
  });

  return (
    <div>
      <p>Status: {status}</p>
      {isConnected && <p>Connected for {Math.floor(connectionDuration / 1000)}s</p>}
      {error && <p>Error: {error.message}</p>}
      
      <button onClick={() => sendMessage({ type: 'ping', data: {} })}>
        Send Ping
      </button>
      
      {status === 'ERROR' && (
        <button onClick={reconnect}>Reconnect</button>
      )}
    </div>
  );
}
```

### Legacy Hook (Backward Compatibility)

```typescript
import { useWebSocket } from '@/app/hooks/useWebSocket';

function MyComponent() {
  const {
    status,        // 'CONNECTING' | 'OPEN' | 'CLOSED' | 'ERROR' | 'DISCONNECTED'
    lastMessage,   // Last received message
    sendMessage,   // Function to send messages
    connect,       // Manual connect
    disconnect,    // Manual disconnect
    reconnect,     // Manual reconnect
    isConnected,   // boolean
  } = useWebSocket();

  // ... use as needed
}
```

## Message Format

### Client to Server

```typescript
{
  type: 'ping' | 'subscribe' | 'unsubscribe' | string,
  data: any,
  timestamp?: number,  // Optional, added automatically
  id?: string          // Optional, added automatically
}
```

### Server to Client

```typescript
{
  type: 'connection' | 'market_data' | 'signal' | 'alert' | 'ping' | 'pong' | 'echo' | 'error',
  data: any,
  timestamp: number,
  id?: string
}
```

### Examples

#### Subscribe to Market Data:
```typescript
sendMessage({
  type: 'subscribe',
  data: { symbols: ['AAPL', 'GOOGL', 'MSFT'] }
});
```

#### Ping/Pong:
```typescript
// Client sends
sendMessage({ type: 'ping', data: { timestamp: Date.now() } });

// Server responds
{ type: 'pong', data: { timestamp: 1234567890 }, timestamp: 1234567890 }
```

## Monitoring and Debugging

### Connection Status Indicator

The trading platform includes a visual connection status indicator that shows:

- 🟢 **Green**: Connected (OPEN)
- 🟡 **Yellow**: Connecting/Reconnecting
- 🔵 **Blue**: Fallback mode (using HTTP polling)
- 🔴 **Red**: Error/Disconnected

### Console Logs

The WebSocket client and server provide detailed console logs:

```
[WebSocket] Connecting to ws://localhost:3001/ws...
[WebSocket] Connected
[WebSocket] Received: { type: 'market_data', ... }
[WebSocket] Connection closed: 1006 Connection lost
[WebSocket] Scheduling reconnect in 2000ms (attempt 1/5)
[WebSocket] Reconnecting to ws://localhost:3001/ws...
```

### State History

Access the connection state history for debugging:

```typescript
const { stateHistory } = useResilientWebSocket();

console.log('State transitions:', stateHistory);
// [
//   { from: 'CLOSED', to: 'CONNECTING', timestamp: 1234567890, reason: undefined },
//   { from: 'CONNECTING', to: 'OPEN', timestamp: 1234567891, reason: undefined },
//   { from: 'OPEN', to: 'ERROR', timestamp: 1234567892, reason: 'Connection lost' },
//   ...
// ]
```

## Testing

### Manual Testing

1. Start the WebSocket server
2. Start the trading platform
3. Observe connection status indicator (should be green)
4. Stop the WebSocket server (simulate network failure)
5. Observe reconnection attempts
6. Restart the WebSocket server
7. Verify automatic reconnection

### E2E Testing

Run the WebSocket resilience tests:

```bash
cd trading-platform
npm run test:e2e -- websocket-resilience
```

Tests verify:
- ✅ Initial connection establishment
- ✅ Automatic reconnection on network failure
- ✅ Fallback mode when WebSocket unavailable
- ✅ Message queuing during disconnection
- ✅ Heartbeat mechanism
- ✅ Rate limiting

## Troubleshooting

### Connection Refused

**Symptom**: `Error: Connection refused`

**Solution**:
1. Ensure WebSocket server is running: `./scripts/start-websocket-server.sh`
2. Check port is not blocked by firewall
3. Verify correct port in environment variables

### Origin Blocked

**Symptom**: `Blocked connection from unauthorized origin`

**Solution**:
1. Add your origin to `ALLOWED_ORIGINS`:
   ```bash
   export ALLOWED_ORIGINS="http://localhost:3000,http://your-origin.com"
   ./scripts/start-websocket-server.sh
   ```

### Max Reconnect Attempts Reached

**Symptom**: Status shows `FALLBACK` after multiple failed attempts

**Solution**:
1. Check WebSocket server is running
2. Verify network connectivity
3. Check server logs for errors
4. Restart WebSocket server if needed

### Rate Limit Exceeded

**Symptom**: `Rate limit exceeded. Please slow down.`

**Solution**:
1. Reduce message sending frequency
2. Implement client-side throttling/debouncing
3. Contact server admin to adjust rate limits if necessary

## Production Deployment

### Recommended Configuration

For production deployments:

1. **Use WSS (WebSocket Secure)**:
   ```
   NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws
   ```

2. **Set Appropriate Origins**:
   ```bash
   ALLOWED_ORIGINS="https://your-domain.com,https://www.your-domain.com"
   ```

3. **Enable Health Checks**:
   Monitor WebSocket server health and restart if needed

4. **Configure Load Balancing**:
   Use a load balancer that supports WebSocket connections

5. **Enable Logging**:
   Log all connections, disconnections, and errors for monitoring

6. **Use Process Manager**:
   Use PM2, systemd, or similar to ensure server stays running:
   ```bash
   pm2 start scripts/websocket-server.js --name ws-server
   ```

### Security Best Practices

1. **Always validate origin** in production
2. **Use authentication tokens** for WebSocket connections
3. **Implement message validation** on server
4. **Set appropriate rate limits**
5. **Monitor for abuse** and unusual patterns
6. **Use TLS/SSL** (WSS) in production
7. **Keep dependencies updated** for security patches

## Architecture

```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│  Trading        │ ◄─────────────────────────► │  WebSocket      │
│  Platform       │      ws://localhost:3001/ws │  Server         │
│  (Next.js)      │                             │  (Node.js)      │
└─────────────────┘                             └─────────────────┘
        │                                                │
        │ Fallback: HTTP Polling                        │
        │ GET /api/market/snapshot                      │
        └───────────────────────────────────────────────┘
```

## Performance

- **Message batching**: Client batches messages in 150ms windows
- **Deduplication**: Duplicate messages filtered out
- **Connection pooling**: Server maintains client pool efficiently
- **Heartbeat optimization**: 30s interval balances responsiveness and overhead
- **Exponential backoff**: Reduces server load during outages

## Support

For issues or questions:
1. Check this documentation
2. Review console logs on client and server
3. Check E2E test results
4. Open an issue on GitHub with logs and reproduction steps

## Version History

- **v1.0.0** (2026-02-01): Initial WebSocket implementation with resilience features
  - Automatic reconnection with exponential backoff
  - Fallback polling mode
  - Heartbeat mechanism
  - Message queuing
  - Rate limiting
  - Comprehensive testing
