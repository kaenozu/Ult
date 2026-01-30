/**
 * WebSocket Client Library for Trader Pro
 *
 * Provides a centralized WebSocket client with fallback handling,
 * connection management, and type-safe messaging.
 */

import { WebSocketStatus } from '@/app/hooks/useWebSocket';

// WebSocket message types
export type WebSocketMessageType =
  | 'connection'
  | 'market_data'
  | 'signal'
  | 'alert'
  | 'ping'
  | 'pong'
  | 'echo'
  | 'error';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType | string;
  data: T;
  timestamp?: number;
  id?: string;
}

/**
 * Validates WebSocket message structure
 * Ensures message has required fields and proper types
 */
function validateWebSocketMessage(message: unknown): message is WebSocketMessage {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const msg = message as Record<string, unknown>;

  // Check required 'type' field
  if (!('type' in msg) || typeof msg.type !== 'string') {
    return false;
  }

  // Check optional 'data' field - can be any type but must exist if provided
  if ('data' in msg && msg.data === undefined) {
    return false;
  }

  // Check optional 'timestamp' - must be number if provided
  if ('timestamp' in msg && msg.timestamp !== undefined) {
    if (typeof msg.timestamp !== 'number' || isNaN(msg.timestamp)) {
      return false;
    }
  }

  // Check optional 'id' - must be string if provided
  if ('id' in msg && msg.id !== undefined && typeof msg.id !== 'string') {
    return false;
  }

  return true;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enableFallback?: boolean;
  fallbackPollingInterval?: number;
}

export interface WebSocketClientOptions {
  onOpen?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
}

/**
 * WebSocket Client with fallback support
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private options: WebSocketClientOptions;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private fallbackIntervalId: ReturnType<typeof setInterval> | null = null;
  private isManualClose = false;
  private status: WebSocketStatus = 'CLOSED';
  private messageQueue: WebSocketMessage[] = [];

  constructor(config: WebSocketConfig, options: WebSocketClientOptions = {}) {
    this.config = {
      url: config.url,
      protocols: config.protocols || [],
      reconnectInterval: config.reconnectInterval || 2000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      enableFallback: config.enableFallback ?? true,
      fallbackPollingInterval: config.fallbackPollingInterval || 5000,
    };
    this.options = options;
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.status === 'OPEN' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Update status and notify listeners
   */
  private setStatus(newStatus: WebSocketStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.options.onStatusChange?.(newStatus);
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    this.isManualClose = false;

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached');
      this.startFallback();
      return;
    }

    try {
      this.setStatus('CONNECTING');
      console.log(`[WebSocket] Connecting to ${this.config.url}...`);

      this.ws = new WebSocket(this.config.url, this.config.protocols);

      this.ws.onopen = (event) => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.setStatus('OPEN');
        this.stopFallback();
        this.flushMessageQueue();
        this.options.onOpen?.(event);
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          
          // Validate message structure
          if (!validateWebSocketMessage(parsed)) {
            console.error('[WebSocket] Invalid message structure received');
            return;
          }
          
          const message: WebSocketMessage = parsed;
          this.options.onMessage?.(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (event) => {
        console.error('[WebSocket] Error occurred');
        this.setStatus('ERROR');
        this.options.onError?.(event);
      };

      this.ws.onclose = (event) => {
        console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`);
        this.setStatus('CLOSED');
        this.options.onClose?.(event);

        if (!this.isManualClose && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else if (!this.isManualClose && this.config.enableFallback) {
          this.startFallback();
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.setStatus('ERROR');

      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else if (this.config.enableFallback) {
        this.startFallback();
      }
    }
  }

  /**
    * Schedule reconnection attempt with exponential backoff
    */
  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectAttempts++;
    // 指数バックオフを使用して再接続間隔を増やす
    // 初回: 2秒, 2回目: 4秒, 3回目: 8秒, 4回目: 16秒, 5回目: 32秒
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      60000 // 最大60秒
    );

    console.log(`[WebSocket] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start fallback polling mode
   */
  private startFallback(): void {
    if (this.fallbackIntervalId) {
      return; // Already in fallback mode
    }

    console.log('[WebSocket] Starting fallback polling mode');

    this.fallbackIntervalId = setInterval(() => {
      // Simulate receiving a fallback message
      this.options.onMessage?.({
        type: 'fallback',
        data: {
          message: 'Using fallback polling mode',
          timestamp: Date.now(),
        },
      });
    }, this.config.fallbackPollingInterval);
  }

  /**
   * Stop fallback polling mode
   */
  private stopFallback(): void {
    if (this.fallbackIntervalId) {
      clearInterval(this.fallbackIntervalId);
      this.fallbackIntervalId = null;
      console.log('[WebSocket] Stopped fallback polling mode');
    }
  }

  /**
   * Send a message through WebSocket
   */
  send<T = unknown>(message: WebSocketMessage<T>): boolean {
    if (this.isConnected()) {
      try {
        this.ws!.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error);
        return false;
      }
    } else {
      // Queue message for later delivery
      this.messageQueue.push(message);
      console.log('[WebSocket] Message queued (not connected)');
      return false;
    }
  }

  /**
   * Flush queued messages when connection is established
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length > 0) {
      console.log(`[WebSocket] Sending ${this.messageQueue.length} queued messages`);
      this.messageQueue.forEach((message) => {
        this.send(message);
      });
      this.messageQueue = [];
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManualClose = true;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.stopFallback();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.setStatus('CLOSED');
    console.log('[WebSocket] Disconnected');
  }

  /**
   * Reconnect to WebSocket server
   */
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.disconnect();
    this.messageQueue = [];
  }
}

/**
 * Create a new WebSocket client instance
 */
export function createWebSocketClient(
  config: WebSocketConfig,
  options?: WebSocketClientOptions
): WebSocketClient {
  return new WebSocketClient(config, options);
}

/**
 * Default WebSocket URL configuration
 */
export const DEFAULT_WS_CONFIG: WebSocketConfig = {
  url: typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001/ws`
    : 'ws://localhost:3001/ws',
  reconnectInterval: 2000,
  maxReconnectAttempts: 10, // 5から10に増加してより堅牢に
  enableFallback: true,
  fallbackPollingInterval: 5000,
};
